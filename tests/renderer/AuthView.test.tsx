// tests/renderer/AuthView.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'

// Mock window.nels before imports
const mockNels = {
  auth: {
    login: vi.fn(),
    loginWithToken: vi.fn(),
    logout: vi.fn(),
    getSession: vi.fn(),
    getCredentialInfo: vi.fn().mockResolvedValue(null),
  },
  config: { get: vi.fn().mockResolvedValue(null) },
  fs: { list: vi.fn(), upload: vi.fn(), delete: vi.fn(), mkdir: vi.fn() },
  projects: { list: vi.fn().mockResolvedValue([]) },
  on: vi.fn().mockReturnValue(() => {}),
  getPathForFile: vi.fn().mockReturnValue(''),
}

vi.stubGlobal('window', { ...global.window, nels: mockNels })

import { AuthProvider } from '../../src/renderer/contexts/AuthContext'
import { AuthView } from '../../src/renderer/views/AuthView'

function Wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

describe('AuthView', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('renders token input and disabled login button initially', async () => {
    mockNels.auth.getSession.mockResolvedValue(null)
    render(<AuthView />, { wrapper: Wrapper })
    const input = await screen.findByLabelText(/access token/i)
    expect(input).toBeInTheDocument()
    const button = screen.getByRole('button', { name: /login/i })
    expect(button).toBeDisabled()
  })

  it('enables login button once a token is entered', async () => {
    mockNels.auth.getSession.mockResolvedValue(null)
    render(<AuthView />, { wrapper: Wrapper })
    const input = await screen.findByLabelText(/access token/i)
    fireEvent.change(input, { target: { value: 'abc123' } })
    const button = screen.getByRole('button', { name: /login/i })
    expect(button).not.toBeDisabled()
  })

  it('calls auth.loginWithToken on submit', async () => {
    mockNels.auth.getSession.mockResolvedValue(null)
    mockNels.auth.loginWithToken.mockResolvedValue({ userId: 1, name: 'Test' })
    render(<AuthView />, { wrapper: Wrapper })
    const input = await screen.findByLabelText(/access token/i)
    fireEvent.change(input, { target: { value: 'abc123' } })
    fireEvent.click(screen.getByRole('button', { name: /login/i }))
    await waitFor(() =>
      expect(mockNels.auth.loginWithToken).toHaveBeenCalledWith('abc123')
    )
  })

  it('shows error when login fails', async () => {
    mockNels.auth.getSession.mockResolvedValue(null)
    mockNels.auth.loginWithToken.mockRejectedValue(new Error('Token rejected'))
    render(<AuthView />, { wrapper: Wrapper })
    const input = await screen.findByLabelText(/access token/i)
    fireEvent.change(input, { target: { value: 'bad-token' } })
    fireEvent.click(screen.getByRole('button', { name: /login/i }))
    await waitFor(() =>
      expect(screen.getByText(/token rejected/i)).toBeInTheDocument()
    )
  })

  it('trims whitespace from the token before submitting', async () => {
    mockNels.auth.getSession.mockResolvedValue(null)
    mockNels.auth.loginWithToken.mockResolvedValue({ userId: 1, name: 'Test' })
    render(<AuthView />, { wrapper: Wrapper })
    const input = await screen.findByLabelText(/access token/i)
    fireEvent.change(input, { target: { value: '   spaced   ' } })
    fireEvent.click(screen.getByRole('button', { name: /login/i }))
    await waitFor(() =>
      expect(mockNels.auth.loginWithToken).toHaveBeenCalledWith('spaced')
    )
  })
})
