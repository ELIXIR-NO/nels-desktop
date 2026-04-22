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

import { AuthProvider, useAuth } from '../../src/renderer/contexts/AuthContext'
import { AuthView } from '../../src/renderer/views/AuthView'

function Wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

describe('AuthView', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('renders login button in idle state', async () => {
    mockNels.auth.getSession.mockResolvedValue(null)
    render(<AuthView />, { wrapper: Wrapper })
    const button = await screen.findByRole('button', { name: /login/i })
    expect(button).toBeInTheDocument()
    expect(button).not.toBeDisabled()
  })

  it('calls auth.login when button clicked', async () => {
    mockNels.auth.getSession.mockResolvedValue(null)
    mockNels.auth.login.mockResolvedValue({ userId: 1, name: 'Test' })
    render(<AuthView />, { wrapper: Wrapper })
    const button = await screen.findByRole('button', { name: /login/i })
    fireEvent.click(button)
    await waitFor(() => expect(mockNels.auth.login).toHaveBeenCalled())
  })

  it('shows error when login fails', async () => {
    mockNels.auth.getSession.mockResolvedValue(null)
    mockNels.auth.login.mockRejectedValue(new Error('Login failed'))
    render(<AuthView />, { wrapper: Wrapper })
    const button = await screen.findByRole('button', { name: /login/i })
    fireEvent.click(button)
    await waitFor(() => expect(screen.getByText(/login failed/i)).toBeInTheDocument())
  })
})
