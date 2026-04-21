import { vi, describe, it, expect, beforeEach } from 'vitest'
import * as keytar from 'keytar'

vi.mock('keytar')

const mock = vi.mocked(keytar)

describe('keychain', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('reads a stored value', async () => {
    mock.getPassword.mockResolvedValue('test-token')
    const { keychainRead } = await import('../../src/main/keychain')
    const result = await keychainRead('oauth-token')
    expect(result).toBe('test-token')
    expect(mock.getPassword).toHaveBeenCalledWith('nels-desktop', 'oauth-token')
  })

  it('returns null when nothing is stored', async () => {
    mock.getPassword.mockResolvedValue(null)
    const { keychainRead } = await import('../../src/main/keychain')
    const result = await keychainRead('oauth-token')
    expect(result).toBeNull()
  })

  it('writes a value', async () => {
    mock.setPassword.mockResolvedValue(undefined)
    const { keychainWrite } = await import('../../src/main/keychain')
    await keychainWrite('oauth-token', 'abc')
    expect(mock.setPassword).toHaveBeenCalledWith('nels-desktop', 'oauth-token', 'abc')
  })

  it('deletes a value', async () => {
    mock.deletePassword.mockResolvedValue(true)
    const { keychainDelete } = await import('../../src/main/keychain')
    await keychainDelete('oauth-token')
    expect(mock.deletePassword).toHaveBeenCalledWith('nels-desktop', 'oauth-token')
  })
})
