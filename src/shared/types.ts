export interface UserInfo {
  userId: number
  name: string
}

export interface SshCredential {
  userId: number
  username: string
  host: string
  sshKey: string
}

export interface FileEntry {
  name: string
  size: number      // bytes; 0 for directories
  mtime: Date
  isDir: boolean
}

export interface UploadItem {
  id: string
  localPath: string
  remotePath: string
  pct: number
  status: 'queued' | 'uploading' | 'done' | 'error'
  error?: string
}

// The API surface exposed to the renderer via contextBridge (window.nels)
export interface NeLS {
  auth: {
    login(): Promise<UserInfo>
    logout(): Promise<void>
    getSession(): Promise<UserInfo | null>
  }
  fs: {
    list(path: string): Promise<FileEntry[]>
    upload(localPath: string, remotePath: string, id: string): Promise<void>
  }
  on(
    channel: 'upload:progress' | 'upload:done' | 'upload:error',
    listener: (data: unknown) => void
  ): () => void
}
