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

// Tests run under vitest with no Vite build, so import.meta.env.VITE_API_BASE
// is undefined → AuthView falls back to the staging default and shows both
// the Feide button and the token paste flow.
function Wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

describe('AuthView', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('renders Feide button as the primary action', async () => {
    mockNels.auth.getSession.mockResolvedValue(null)
    render(<AuthView />, { wrapper: Wrapper })
    const feide = await screen.findByRole('button', { name: /sign in with feide/i })
    expect(feide).toBeInTheDocument()
    expect(feide).not.toBeDisabled()
  })

  it('calls auth.login when Feide button is clicked', async () => {
    mockNels.auth.getSession.mockResolvedValue(null)
    mockNels.auth.login.mockResolvedValue({ userId: 1, name: 'Test' })
    render(<AuthView />, { wrapper: Wrapper })
    const feide = await screen.findByRole('button', { name: /sign in with feide/i })
    fireEvent.click(feide)
    await waitFor(() => expect(mockNels.auth.login).toHaveBeenCalled())
  })

  it('shows the Feide-unreliable notice', async () => {
    mockNels.auth.getSession.mockResolvedValue(null)
    render(<AuthView />, { wrapper: Wrapper })
    expect(await screen.findByText(/currently unreliable/i)).toBeInTheDocument()
  })

  it('shows token paste on staging builds', async () => {
    mockNels.auth.getSession.mockResolvedValue(null)
    render(<AuthView />, { wrapper: Wrapper })
    const input = await screen.findByLabelText(/access token/i)
    const submit = screen.getByRole('button', { name: /sign in with token/i })
    expect(input).toBeInTheDocument()
    expect(submit).toBeDisabled()
  })

  it('enables token submit once a token is entered and submits it', async () => {
    mockNels.auth.getSession.mockResolvedValue(null)
    mockNels.auth.loginWithToken.mockResolvedValue({ userId: 1, name: 'Test' })
    render(<AuthView />, { wrapper: Wrapper })
    const input = await screen.findByLabelText(/access token/i)
    fireEvent.change(input, { target: { value: '  abc123  ' } })
    const submit = screen.getByRole('button', { name: /sign in with token/i })
    expect(submit).not.toBeDisabled()
    fireEvent.click(submit)
    await waitFor(() =>
      expect(mockNels.auth.loginWithToken).toHaveBeenCalledWith('abc123')
    )
  })

  it('shows error when login fails', async () => {
    mockNels.auth.getSession.mockResolvedValue(null)
    mockNels.auth.login.mockRejectedValue(new Error('Feide timeout'))
    render(<AuthView />, { wrapper: Wrapper })
    fireEvent.click(await screen.findByRole('button', { name: /sign in with feide/i }))
    await waitFor(() =>
      expect(screen.getByText(/feide timeout/i)).toBeInTheDocument()
    )
  })
})
