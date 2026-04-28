import { shell } from 'electron'
import type { UserInfo, SshCredential, NelsProject, SshCredentialInfo } from '@shared/types'
import { keychainRead, keychainWrite, keychainDelete } from './keychain'
import { config } from './config'

type AuthCallback = {
  resolve: (token: string) => void
  reject: (err: Error) => void
  timeout: ReturnType<typeof setTimeout>
  settled: boolean
}

let pending: AuthCallback | null = null

export function parseTokenFromUrl(url: string): string | null {
  try {
    const fragment = new URL(url).hash.slice(1)
    const params = new URLSearchParams(fragment)
    return params.get('token') ?? params.get('access_token')
  } catch {
    return null
  }
}

export function resolveAuthCallback(url: string): void {
  if (pending === null) {
    console.warn('[auth] received nels:// callback with no pending login; ignoring')
    return
  }
  if (pending.settled) return
  const current = pending
  current.settled = true
  clearTimeout(current.timeout)
  pending = null
  const token = parseTokenFromUrl(url)
  if (token) {
    current.resolve(token)
  } else {
    current.reject(new Error('No token found in OAuth callback URL'))
  }
}

async function fetchUserInfo(token: string): Promise<UserInfo> {
  const res = await fetch(`${config.apiBase}/my-account`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw Object.assign(new Error('Token validation failed'), { status: res.status })
  const data = await res.json() as { nels_id: number; name: string }
  return { userId: data.nels_id, name: data.name }
}

async function fetchSshCredential(token: string, userId: number): Promise<SshCredential> {
  const res = await fetch(`${config.apiBase}/users/${userId}/do`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ method: 'credential', payload: {} })
  })
  if (!res.ok) throw Object.assign(new Error('Failed to fetch SSH credentials'), { status: res.status })
  const data = await res.json() as { host: string; username: string; sshKey: string }
  return { userId, host: data.host, username: data.username, sshKey: data.sshKey }
}

async function completeLogin(token: string): Promise<UserInfo> {
  const user = await fetchUserInfo(token)
  const cred = await fetchSshCredential(token, user.userId)
  await keychainWrite('oauth-token', token)
  await keychainWrite('ssh-credential', JSON.stringify(cred))
  return user
}

export async function login(): Promise<UserInfo> {
  const token = await new Promise<string>((resolve, reject) => {
    if (pending !== null && !pending.settled) {
      const prev = pending
      prev.settled = true
      clearTimeout(prev.timeout)
      prev.reject(new Error('Login superseded'))
    }

    const cb: AuthCallback = {
      resolve,
      reject,
      settled: false,
      timeout: setTimeout(() => {
        if (pending === null || pending !== cb || cb.settled) return
        cb.settled = true
        pending = null
        reject(new Error('Login timed out after 5 minutes'))
      }, 5 * 60 * 1000),
    }
    pending = cb

    const url =
      `${config.oauthBase}/authorize` +
      `?client_id=${config.clientId}` +
      `&redirect_uri=${encodeURIComponent(config.redirectUri)}` +
      `&response_type=token&scope=user`

    shell.openExternal(url)
  })

  return completeLogin(token)
}

export async function loginWithToken(token: string): Promise<UserInfo> {
  if (!token || typeof token !== 'string') throw new Error('token is required')
  return completeLogin(token.trim())
}

export async function getSession(): Promise<UserInfo | null> {
  const token = await keychainRead('oauth-token')
  if (!token) return null

  try {
    return await fetchUserInfo(token)
  } catch (err) {
    const status = typeof err === 'object' && err !== null && 'status' in err
      ? (err as { status: number }).status
      : undefined
    if (status === 401 || status === 403) {
      await keychainDelete('oauth-token')
      await keychainDelete('ssh-credential')
    }
    return null
  }
}

export async function logout(): Promise<void> {
  await keychainDelete('oauth-token')
  await keychainDelete('ssh-credential')
}

export async function getSshCredential(): Promise<SshCredential | null> {
  const raw = await keychainRead('ssh-credential')
  if (!raw) return null
  return JSON.parse(raw) as SshCredential
}

/** Renderer-safe view of the SSH credential — never exposes the private key. */
export async function getSshCredentialInfo(): Promise<SshCredentialInfo | null> {
  const cred = await getSshCredential()
  if (!cred) return null
  return {
    userId: cred.userId,
    username: cred.username,
    host: cred.host,
    hasKey: Boolean(cred.sshKey),
  }
}

// Server response uses snake_case. Envelope is `{ data, total }` in the
// observed staging deployment; tolerate bare-array and other envelope keys too.
interface RawNelsProject {
  project_id: number
  user_id: number
  name: string
  description?: string
  role?: string
  has_filesystem_access: boolean
}

export async function getProjects(): Promise<NelsProject[]> {
  const token = await keychainRead('oauth-token')
  if (!token) throw new Error('Not authenticated')
  const cred = await getSshCredential()
  if (!cred) throw new Error('Not authenticated')
  const res = await fetch(`${config.apiBase}/users/${cred.userId}/nels-projects`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error(`Failed to fetch projects (HTTP ${res.status})`)
  const body = await res.json() as RawNelsProject[] | {
    data?: RawNelsProject[]
    results?: RawNelsProject[]
    elements?: RawNelsProject[]
  }
  const raw: RawNelsProject[] = Array.isArray(body)
    ? body
    : body.data ?? body.results ?? body.elements ?? []
  return raw
    .filter((p) => p.has_filesystem_access)
    .map((p) => ({
      projectId: p.project_id,
      name: p.name,
      description: p.description,
      role: p.role,
      hasFilesystemAccess: p.has_filesystem_access,
    }))
}
