// tests/renderer/FileView.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import type { FileEntry, UserInfo } from '../../src/shared/types'

const mockEntries: FileEntry[] = [
  { name: 'Projects', size: 0, mtime: new Date('2024-06-01'), isDir: true },
  { name: 'sample.fastq', size: 2 * 1024 ** 3, mtime: new Date('2024-05-01'), isDir: false },
]

const mockUser: UserInfo = { userId: 42, name: 'Test Researcher' }

const mockNels = {
  auth: {
    login: vi.fn(),
    loginWithToken: vi.fn(),
    logout: vi.fn(),
    getSession: vi.fn(),
    getCredentialInfo: vi.fn().mockResolvedValue(null),
  },
  config: {
    get: vi.fn().mockResolvedValue({
      apiBase: 'https://test.example/api',
      oauthBase: 'https://test.example/oauth',
      clientId: 'test_client',
      redirectUri: 'test://cb',
      ssh: { loginHost: 'login.test', dataHost: 'data.test', loginFingerprint: 'fp1', dataFingerprint: 'fp2' },
      appVersion: '0.0.0',
      isPackaged: false,
    }),
  },
  fs: {
    list: vi.fn().mockResolvedValue(mockEntries),
    upload: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
  },
  projects: {
    list: vi.fn().mockResolvedValue([]),
  },
  on: vi.fn().mockReturnValue(() => {}),
  getPathForFile: vi.fn().mockReturnValue(''),
}

vi.stubGlobal('window', { ...global.window, nels: mockNels })

import { AuthProvider } from '../../src/renderer/contexts/AuthContext'
import { ThemeProvider } from '../../src/renderer/contexts/ThemeContext'
import { FileView } from '../../src/renderer/views/FileView'

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  )
}

describe('FileView', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockNels.fs.list.mockResolvedValue(mockEntries)
    mockNels.projects.list.mockResolvedValue([])
    mockNels.auth.getCredentialInfo.mockResolvedValue(null)
    mockNels.config.get.mockResolvedValue({
      apiBase: 'https://test.example/api',
      oauthBase: 'https://test.example/oauth',
      clientId: 'test_client',
      redirectUri: 'test://cb',
      ssh: { loginHost: 'login.test', dataHost: 'data.test', loginFingerprint: 'fp1', dataFingerprint: 'fp2' },
      appVersion: '0.0.0',
      isPackaged: false,
    })
    mockNels.on.mockReturnValue(() => {})
    mockNels.getPathForFile.mockReturnValue('')
  })

  it('shows username in header', async () => {
    render(<FileView user={mockUser} />, { wrapper: Wrapper })
    await waitFor(() => expect(screen.getByText('Test Researcher')).toBeInTheDocument())
  })

  it('lists files after load', async () => {
    render(<FileView user={mockUser} />, { wrapper: Wrapper })
    await waitFor(() => expect(screen.getByText('Projects')).toBeInTheDocument())
    expect(screen.getByText('sample.fastq')).toBeInTheDocument()
  })

  it('navigates into a directory on click', async () => {
    render(<FileView user={mockUser} />, { wrapper: Wrapper })
    // Folder rows expose role="button" with the folder name. The sidebar has a
    // "Projects" section label too, so match by role to disambiguate.
    const folderRow = await screen.findByRole('button', { name: /^Projects$/ })
    fireEvent.click(folderRow)
    await waitFor(() => expect(mockNels.fs.list).toHaveBeenCalledWith(expect.stringContaining('Projects')))
  })
})
