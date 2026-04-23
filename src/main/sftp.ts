import { Client } from 'ssh2'
import type { FileEntry, SshCredential } from '@shared/types'
import { config } from './config'
import { getSshCredential } from './auth'

export interface SftpAdapter {
  list(path: string): Promise<FileEntry[]>
  upload(local: string, remote: string, onProgress: (pct: number) => void): Promise<void>
  mkdir(path: string): Promise<void>
  unlink(path: string): Promise<void>
  rmdir(path: string): Promise<void>
  disconnect(): void
}

// Normalise an ssh2 host-key hash to the no-padding base64 form that
// `ssh-keygen -lf` and OpenSSH's `SHA256:...` prefix use. ssh2 passes the
// hash as a hex string when `hostHash: 'sha256'` is set, and as a Buffer
// otherwise. `Buffer.toString('base64')` always emits '='-padded output, but
// fingerprints are conventionally stored unpadded.
export function computeFingerprint(hash: Buffer | string): string {
  const buf = typeof hash === 'string' ? Buffer.from(hash, 'hex') : hash
  return buf.toString('base64').replace(/=+$/, '')
}

// Module-level session state
let currentAdapter: SftpAdapter | null = null

// Replaces the adapter — used in tests only
export function _setAdapterForTesting(adapter: SftpAdapter): void {
  currentAdapter?.disconnect()
  currentAdapter = adapter
}

export function clearAdapter(): void {
  currentAdapter?.disconnect()
  currentAdapter = null
}

async function getAdapter(): Promise<SftpAdapter> {
  if (currentAdapter) return currentAdapter
  const cred = await getSshCredential()
  if (!cred) throw new Error('No SSH credentials — please log in again')
  currentAdapter = await Ssh2SftpAdapter.connect(cred)
  return currentAdapter
}

function sortEntries(entries: FileEntry[]): FileEntry[] {
  return [...entries].sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

export async function listFiles(path: string): Promise<FileEntry[]> {
  const adapter = await getAdapter()
  const entries = await adapter.list(path)
  return sortEntries(entries)
}

export async function uploadFile(
  localPath: string,
  remotePath: string,
  onProgress: (pct: number) => void
): Promise<void> {
  const adapter = await getAdapter()
  return adapter.upload(localPath, remotePath, onProgress)
}

export async function createFolder(remotePath: string): Promise<void> {
  const adapter = await getAdapter()
  return adapter.mkdir(remotePath)
}

/**
 * Delete a file or a directory tree.
 * For directories, walks the tree deleting files first, then empty dirs
 * bottom-up — SFTP has no "rm -rf" primitive.
 */
export async function deleteEntry(remotePath: string, isDir: boolean): Promise<void> {
  const adapter = await getAdapter()
  if (!isDir) return adapter.unlink(remotePath)

  const entries = await adapter.list(remotePath)
  for (const entry of entries) {
    const childPath = `${remotePath}/${entry.name}`
    await deleteEntry(childPath, entry.isDir)
  }
  await adapter.rmdir(remotePath)
}

// Real SFTP implementation using ssh2 ProxyJump
export class Ssh2SftpAdapter implements SftpAdapter {
  private bastion: Client
  private dataClient: Client
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sftp: any // ssh2 SFTPWrapper — no public types available

  private constructor(bastion: Client, dataClient: Client, sftp: unknown) {
    this.bastion = bastion
    this.dataClient = dataClient
    this.sftp = sftp
  }

  static connect(cred: SshCredential): Promise<Ssh2SftpAdapter> {
    return new Promise((resolve, reject) => {
      let settled = false
      const privateKey = Buffer.from(cred.sshKey)

      const done = (err: Error | null, value?: Ssh2SftpAdapter) => {
        if (settled) return
        settled = true
        if (err) reject(err)
        else resolve(value!)
      }

      const bastion = new Client()
      bastion.on('error', (err) => {
        // Turn bare handshake timeouts into something actionable — usually
        // the user's network is blocking outbound SSH.
        const looksLikeNetwork =
          /timed out/i.test(err.message) ||
          /ETIMEDOUT/i.test(err.message) ||
          /ECONNREFUSED/i.test(err.message) ||
          /ENETUNREACH/i.test(err.message)
        const hint = looksLikeNetwork
          ? ` — check that your network can reach ${config.ssh.loginHost}:22.`
          : ''
        done(new Error(`Bastion SSH error: ${err.message}${hint}`))
      })
      bastion.on('ready', () => {
        bastion.forwardOut('127.0.0.1', 0, config.ssh.dataHost, 22, (err, stream) => {
          if (err) { bastion.end(); return done(new Error(`ProxyJump failed: ${err.message}`)) }

          const dataClient = new Client()
          dataClient.on('error', (err) => {
            bastion.end()
            done(new Error(`Data host SSH error: ${err.message}`))
          })
          dataClient.on('ready', () => {
            dataClient.sftp((err, sftp) => {
              if (err) {
                dataClient.end()
                bastion.end()
                return done(new Error(`SFTP subsystem error: ${err.message}`))
              }
              // Resolve the SFTP session's home directory once for logging /
              // diagnostics. Helps spot chroot / wrong-mount surprises.
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ;(sftp as any).realpath('.', (rpErr: Error | undefined, home: string | undefined) => {
                if (rpErr) console.warn('[sftp] realpath(.) failed:', rpErr.message)
                else console.log('[sftp] session home:', home)
              })
              done(null, new Ssh2SftpAdapter(bastion, dataClient, sftp))
            })
          })
          dataClient.connect({
            sock: stream,
            username: cred.username,
            privateKey,
            hostHash: 'sha256',
            hostVerifier: (hash: Buffer | string) => {
              const fp = computeFingerprint(hash)
              if (fp !== config.ssh.dataFingerprint) {
                done(new Error(`Data host fingerprint mismatch: got ${fp}`))
                return false
              }
              return true
            }
          })
        })
      })

      bastion.connect({
        host: config.ssh.loginHost,
        port: 22,
        username: cred.username,
        privateKey,
        hostHash: 'sha256',
        hostVerifier: (hash: Buffer | string) => {
          const fp = computeFingerprint(hash)
          if (fp !== config.ssh.loginFingerprint) {
            done(new Error(`Login host fingerprint mismatch: got ${fp}`))
            return false
          }
          return true
        }
      })
    })
  }

  async list(path: string): Promise<FileEntry[]> {
    return new Promise((resolve, reject) => {
      console.log('[sftp] readdir', JSON.stringify(path))
      this.sftp.readdir(path, (err: Error | undefined, list: unknown[]) => {
        if (err) {
          console.error('[sftp] readdir error for', JSON.stringify(path), '->', err.message)
          return reject(new Error(`readdir failed for ${JSON.stringify(path)}: ${err.message}`))
        }
        const entries: FileEntry[] = (list as Array<{
          filename: string
          attrs: { size: number; mtime: number; mode: number }
        }>)
          .filter((f) => f.filename !== '.' && f.filename !== '..')
          .map((f) => ({
            name: f.filename,
            size: f.attrs.size,
            mtime: new Date(f.attrs.mtime * 1000),
            // mode bit 0o040000 = directory
            isDir: (f.attrs.mode & 0o170000) === 0o040000,
          }))
        resolve(entries)
      })
    })
  }

  upload(local: string, remote: string, onProgress: (pct: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      this.sftp.fastPut(
        local,
        remote,
        {
          step: (transferred: number, _chunk: number, total: number) => {
            onProgress(Math.round((transferred / total) * 100))
          }
        },
        (err: Error | undefined) => {
          if (err) return reject(new Error(`Upload failed: ${err.message}`))
          resolve()
        }
      )
    })
  }

  mkdir(path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.sftp.mkdir(path, (err: Error | undefined) => {
        if (err) return reject(new Error(`Mkdir failed for ${JSON.stringify(path)}: ${err.message}`))
        resolve()
      })
    })
  }

  unlink(path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.sftp.unlink(path, (err: Error | undefined) => {
        if (err) return reject(new Error(`Delete failed for ${JSON.stringify(path)}: ${err.message}`))
        resolve()
      })
    })
  }

  rmdir(path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.sftp.rmdir(path, (err: Error | undefined) => {
        if (err) return reject(new Error(`Rmdir failed for ${JSON.stringify(path)}: ${err.message}`))
        resolve()
      })
    })
  }

  disconnect(): void {
    // end() can throw if the socket is already closed — best-effort cleanup
    try { this.dataClient.end() } catch { /* ignore */ }
    try { this.bastion.end() } catch { /* ignore */ }
  }
}
