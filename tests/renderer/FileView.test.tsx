// tests/renderer/FileView.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import type { FileEntry, UserInfo } from '../../src/shared/types'

const mockEntries: FileEntry[] = [
  { name: 'Personal', size: 0, mtime: new Date('2024-06-01'), isDir: true },
  { name: 'sample.fastq', size: 2 * 1024 ** 3, mtime: new Date('2024-05-01'), isDir: false },
]

const mockUser: UserInfo = { userId: 42, name: 'Test Researcher' }

const mockNels = {
  auth: { login: vi.fn(), logout: vi.fn(), getSession: vi.fn() },
  fs: {
    list: vi.fn().mockResolvedValue(mockEntries),
    upload: vi.fn(),
  },
  on: vi.fn().mockReturnValue(() => {}),
}

vi.stubGlobal('window', { ...global.window, nels: mockNels })

import { FsProvider } from '../../src/renderer/contexts/FsContext'
import { AuthProvider } from '../../src/renderer/contexts/AuthContext'
import { FileView } from '../../src/renderer/views/FileView'

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <FsProvider user={mockUser}>{children}</FsProvider>
    </AuthProvider>
  )
}

describe('FileView', () => {
  beforeEach(() => { vi.resetAllMocks(); mockNels.fs.list.mockResolvedValue(mockEntries) })

  it('shows username in header', async () => {
    render(<FileView user={mockUser} />, { wrapper: Wrapper })
    await waitFor(() => expect(screen.getByText('Test Researcher')).toBeInTheDocument())
  })

  it('lists files after load', async () => {
    render(<FileView user={mockUser} />, { wrapper: Wrapper })
    await waitFor(() => expect(screen.getByText('Personal')).toBeInTheDocument())
    expect(screen.getByText('sample.fastq')).toBeInTheDocument()
  })

  it('navigates into a directory on click', async () => {
    render(<FileView user={mockUser} />, { wrapper: Wrapper })
    await waitFor(() => screen.getByText('Personal'))
    fireEvent.click(screen.getByText('Personal'))
    await waitFor(() => expect(mockNels.fs.list).toHaveBeenCalledWith(expect.stringContaining('Personal')))
  })
})
