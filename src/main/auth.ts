import { shell } from 'electron'
import type { UserInfo, SshCredential } from '@shared/types'
import { keychainRead, keychainWrite, keychainDelete } from './keychain'
import { config } from './config'

let pendingResolve: ((token: string) => void) | null = null
let pendingReject: ((err: Error) => void) | null = null
let pendingTimeout: ReturnType<typeof setTimeout> | null = null

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
  if (!pendingResolve) return
  const resolve = pendingResolve
  const reject = pendingReject!
  clearTimeout(pendingTimeout!)
  pendingResolve = null
  pendingReject = null
  pendingTimeout = null
  const token = parseTokenFromUrl(url)
  if (token) {
    resolve(token)
  } else {
    reject(new Error('No token found in OAuth callback URL'))
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

export async function login(): Promise<UserInfo> {
  const token = await new Promise<string>((resolve, reject) => {
    if (pendingReject) pendingReject(new Error('Login superseded'))

    pendingResolve = resolve
    pendingReject = reject
    pendingTimeout = setTimeout(() => {
      pendingResolve = null
      pendingReject = null
      reject(new Error('Login timed out after 5 minutes'))
    }, 5 * 60 * 1000)

    const url =
      `${config.oauthBase}/authorize` +
      `?client_id=${config.clientId}` +
      `&redirect_uri=${encodeURIComponent(config.redirectUri)}` +
      `&response_type=token`

    shell.openExternal(url)
  })

  const user = await fetchUserInfo(token)
  const cred = await fetchSshCredential(token, user.userId)

  await keychainWrite('oauth-token', token)
  await keychainWrite('ssh-credential', JSON.stringify(cred))

  return user
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
