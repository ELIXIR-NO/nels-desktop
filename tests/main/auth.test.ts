// tests/main/auth.test.ts
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('electron', () => ({
  shell: { openExternal: vi.fn().mockResolvedValue(undefined) }
}))
vi.mock('keytar')
vi.mock('../../src/main/keychain', () => ({
  keychainRead: vi.fn(),
  keychainWrite: vi.fn(),
  keychainDelete: vi.fn(),
}))

import { shell } from 'electron'
import { keychainRead, keychainWrite, keychainDelete } from '../../src/main/keychain'

const mockShell = vi.mocked(shell)
const mockRead = vi.mocked(keychainRead)
const mockWrite = vi.mocked(keychainWrite)
const mockDelete = vi.mocked(keychainDelete)

describe('auth', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.unstubAllGlobals()
  })

  describe('getSession', () => {
    it('returns null when no token in keychain', async () => {
      mockRead.mockResolvedValue(null)
      const { getSession } = await import('../../src/main/auth')
      const result = await getSession()
      expect(result).toBeNull()
    })

    it('returns user info when token is valid', async () => {
      mockRead.mockImplementation(async (account) => {
        if (account === 'oauth-token') return 'valid-token'
        return null
      })
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ nels_id: 42, name: 'Test User', user_type: 'USER' })
      }))
      const { getSession } = await import('../../src/main/auth')
      const result = await getSession()
      expect(result).toEqual({ userId: 42, name: 'Test User' })
    })

    it('clears keychain and returns null when token is expired (401)', async () => {
      mockRead.mockResolvedValue('expired-token')
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
      const { getSession } = await import('../../src/main/auth')
      const result = await getSession()
      expect(result).toBeNull()
      expect(mockDelete).toHaveBeenCalledWith('oauth-token')
      expect(mockDelete).toHaveBeenCalledWith('ssh-credential')
    })
  })

  describe('logout', () => {
    it('deletes both keychain entries', async () => {
      const { logout } = await import('../../src/main/auth')
      await logout()
      expect(mockDelete).toHaveBeenCalledWith('oauth-token')
      expect(mockDelete).toHaveBeenCalledWith('ssh-credential')
    })
  })

  describe('parseTokenFromUrl', () => {
    it('extracts token from URL fragment', async () => {
      const { parseTokenFromUrl } = await import('../../src/main/auth')
      const token = parseTokenFromUrl('nels://auth/callback#token=abc123&expires_in=3600')
      expect(token).toBe('abc123')
    })

    it('also handles access_token key', async () => {
      const { parseTokenFromUrl } = await import('../../src/main/auth')
      const token = parseTokenFromUrl('nels://auth/callback#access_token=xyz')
      expect(token).toBe('xyz')
    })

    it('returns null for malformed URL', async () => {
      const { parseTokenFromUrl } = await import('../../src/main/auth')
      const token = parseTokenFromUrl('nels://auth/callback')
      expect(token).toBeNull()
    })
  })

  describe('resolveAuthCallback', () => {
    it('only propagates the first call when invoked twice', async () => {
      vi.resetModules()
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockRead.mockResolvedValue(null)
      vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
        if (url.endsWith('/my-account')) {
          return { ok: true, json: async () => ({ nels_id: 1, name: 'Test User' }) }
        }
        return {
          ok: true,
          json: async () => ({ host: 'h', username: 'u', sshKey: 'k' }),
        }
      }))

      const { login, resolveAuthCallback } = await import('../../src/main/auth')
      const pending = login()
      // Yield once so the login() promise installs its resolver.
      await Promise.resolve()

      resolveAuthCallback('nels://auth/callback#token=first')
      // A second callback after settle must be a no-op (no throw, no override).
      resolveAuthCallback('nels://auth/callback#token=second')

      const user = await pending
      expect(user).toEqual({ userId: 1, name: 'Test User' })
      // Only the first token was used to fetch credentials.
      const fetchMock = vi.mocked(globalThis.fetch)
      const authHeaders = fetchMock.mock.calls.map(([, init]) => {
        const h = (init as { headers?: Record<string, string> } | undefined)?.headers
        return h?.Authorization
      })
      expect(authHeaders).toContain('Bearer first')
      expect(authHeaders).not.toContain('Bearer second')
      warn.mockRestore()
    })

    it('warns and ignores stray callback with no pending login', async () => {
      vi.resetModules()
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { resolveAuthCallback } = await import('../../src/main/auth')
      resolveAuthCallback('nels://auth/callback#token=stray')
      expect(warn).toHaveBeenCalledWith(
        '[auth] received nels:// callback with no pending login; ignoring'
      )
      warn.mockRestore()
    })
  })
})
