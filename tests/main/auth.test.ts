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
})
