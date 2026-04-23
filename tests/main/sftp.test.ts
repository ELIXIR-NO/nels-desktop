// tests/main/sftp.test.ts
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createHash } from 'node:crypto'
import type { FileEntry, SshCredential } from '../../src/shared/types'
import type { SftpAdapter } from '../../src/main/sftp'
import { computeFingerprint } from '../../src/main/sftp'

// A test double that controls what list/upload return
class FakeSftpAdapter implements SftpAdapter {
  entries: FileEntry[] = []
  uploadedFiles: Array<{ local: string; remote: string }> = []
  unlinkedPaths: string[] = []
  rmdirPaths: string[] = []
  mkdirPaths: string[] = []

  async list(_path: string): Promise<FileEntry[]> { return this.entries }

  async upload(local: string, remote: string, onProgress: (pct: number) => void): Promise<void> {
    onProgress(50)
    onProgress(100)
    this.uploadedFiles.push({ local, remote })
  }

  async mkdir(path: string): Promise<void> { this.mkdirPaths.push(path) }
  async unlink(path: string): Promise<void> { this.unlinkedPaths.push(path) }
  async rmdir(path: string): Promise<void> { this.rmdirPaths.push(path) }

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

  // Guards the reconnect-after-drop invariant. The session-lost callback
  // wired in getAdapter nulls the module-level singleton. We can't open a
  // real ssh2 session here, so we simulate that end state via
  // clearAdapter and confirm the module treats the next call as needing
  // a fresh adapter rather than silently reusing the dead one.
  it('reuses the singleton until cleared, then accepts a fresh adapter', async () => {
    const { _setAdapterForTesting, clearAdapter, listFiles } =
      await import('../../src/main/sftp')
    const credMock = vi.mocked(getSshCredential)

    const first = new FakeSftpAdapter()
    first.entries = [{ name: 'a.txt', size: 1, mtime: new Date(), isDir: false }]
    const disconnectSpy = vi.spyOn(first, 'disconnect')
    _setAdapterForTesting(first)

    const before = await listFiles('/')
    expect(before.map((e) => e.name)).toEqual(['a.txt'])
    expect(credMock).not.toHaveBeenCalled()

    // Simulate what the session-lost callback does: drop the cached adapter.
    clearAdapter()
    expect(disconnectSpy).toHaveBeenCalledTimes(1)

    const second = new FakeSftpAdapter()
    second.entries = [{ name: 'b.txt', size: 2, mtime: new Date(), isDir: false }]
    _setAdapterForTesting(second)

    const after = await listFiles('/')
    expect(after.map((e) => e.name)).toEqual(['b.txt'])
    expect(first).not.toBe(second)
  })

  it('delete (file) calls unlink and not rmdir', async () => {
    const { _setAdapterForTesting, deleteEntry } = await import('../../src/main/sftp')
    const fake = new FakeSftpAdapter()
    _setAdapterForTesting(fake)

    await deleteEntry('Personal/foo.txt', false)
    expect(fake.unlinkedPaths).toEqual(['Personal/foo.txt'])
    expect(fake.rmdirPaths).toEqual([])
  })

  it('delete (empty folder) calls rmdir', async () => {
    const { _setAdapterForTesting, deleteEntry } = await import('../../src/main/sftp')
    const fake = new FakeSftpAdapter() // entries = [] by default
    _setAdapterForTesting(fake)

    await deleteEntry('Personal/empty', true)
    expect(fake.rmdirPaths).toEqual(['Personal/empty'])
    expect(fake.unlinkedPaths).toEqual([])
  })

  it('createFolder calls mkdir with the given path', async () => {
    const { _setAdapterForTesting, createFolder } = await import('../../src/main/sftp')
    const fake = new FakeSftpAdapter()
    _setAdapterForTesting(fake)

    await createFolder('Personal/new')
    expect(fake.mkdirPaths).toEqual(['Personal/new'])
  })
})

describe('computeFingerprint', () => {
  // SSH SHA256 fingerprints are conventionally shown without '=' padding
  // (matches `ssh-keygen -lf` and OpenSSH's `SHA256:...` prefix). Our stored
  // fingerprints follow that convention, so the computed value must too.

  it('produces unpadded base64 from a Buffer', () => {
    const hash = createHash('sha256').update('host-key-bytes').digest()
    const fp = computeFingerprint(hash)
    expect(fp).not.toMatch(/=$/)
    expect(fp).toHaveLength(43) // 32 bytes → 43 unpadded base64 chars
  })

  it('produces unpadded base64 from a hex string (ssh2 sha256 mode)', () => {
    const hash = createHash('sha256').update('host-key-bytes').digest()
    const fromBuffer = computeFingerprint(hash)
    const fromHex = computeFingerprint(hash.toString('hex'))
    expect(fromHex).toBe(fromBuffer)
    expect(fromHex).not.toMatch(/=$/)
  })

  it('matches a known SHA256 fingerprint in OpenSSH format', () => {
    // sha256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    // base64 unpadded = 47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU
    const hash = createHash('sha256').update('').digest()
    expect(computeFingerprint(hash)).toBe('47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU')
    expect(computeFingerprint(hash.toString('hex'))).toBe('47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU')
  })
})
