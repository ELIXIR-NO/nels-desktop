// tests/main/sftp.test.ts
import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { FileEntry, SshCredential } from '../../src/shared/types'
import type { SftpAdapter } from '../../src/main/sftp'

// A test double that controls what list/upload return
class FakeSftpAdapter implements SftpAdapter {
  entries: FileEntry[] = []
  uploadedFiles: Array<{ local: string; remote: string }> = []

  async list(_path: string): Promise<FileEntry[]> { return this.entries }

  async upload(local: string, remote: string, onProgress: (pct: number) => void): Promise<void> {
    onProgress(50)
    onProgress(100)
    this.uploadedFiles.push({ local, remote })
  }

  disconnect(): void {}
}

vi.mock('../../src/main/auth', () => ({
  getSshCredential: vi.fn(),
}))

import { getSshCredential } from '../../src/main/auth'

describe('sftp module', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.resetAllMocks()
  })

  it('lists files using the adapter', async () => {
    const { _setAdapterForTesting, listFiles } = await import('../../src/main/sftp')
    const fake = new FakeSftpAdapter()
    fake.entries = [
      { name: 'Personal', size: 0, mtime: new Date('2024-01-01'), isDir: true },
      { name: 'README.txt', size: 1024, mtime: new Date('2024-01-02'), isDir: false },
    ]
    _setAdapterForTesting(fake)

    const result = await listFiles('/home/user')
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Personal')
    expect(result[0].isDir).toBe(true)
  })

  it('returns directories before files', async () => {
    const { _setAdapterForTesting, listFiles } = await import('../../src/main/sftp')
    const fake = new FakeSftpAdapter()
    fake.entries = [
      { name: 'z-file.txt', size: 100, mtime: new Date(), isDir: false },
      { name: 'a-dir', size: 0, mtime: new Date(), isDir: true },
    ]
    _setAdapterForTesting(fake)

    const result = await listFiles('/')
    expect(result[0].isDir).toBe(true)
    expect(result[0].name).toBe('a-dir')
  })

  it('tracks upload progress', async () => {
    const { _setAdapterForTesting, uploadFile } = await import('../../src/main/sftp')
    const fake = new FakeSftpAdapter()
    _setAdapterForTesting(fake)

    const progress: number[] = []
    await uploadFile('/local/file.fastq', '/remote/Personal/file.fastq', (pct) => {
      progress.push(pct)
    })
    expect(progress).toEqual([50, 100])
    expect(fake.uploadedFiles[0]).toEqual({
      local: '/local/file.fastq',
      remote: '/remote/Personal/file.fastq'
    })
  })

  it('disconnects the adapter on clearAdapter', async () => {
    const { _setAdapterForTesting, clearAdapter } = await import('../../src/main/sftp')
    const fake = new FakeSftpAdapter()
    const disconnectSpy = vi.spyOn(fake, 'disconnect')
    _setAdapterForTesting(fake)

    clearAdapter()
    expect(disconnectSpy).toHaveBeenCalled()
  })
})
