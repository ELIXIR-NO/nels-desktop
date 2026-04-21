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

export interface UploadProgressData { id: string; pct: number }
export interface UploadDoneData { id: string }
export interface UploadErrorData { id: string; message: string }

export interface UploadEventMap {
  'upload:progress': UploadProgressData
  'upload:done': UploadDoneData
  'upload:error': UploadErrorData
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
  on<C extends keyof UploadEventMap>(
    channel: C,
    listener: (data: UploadEventMap[C]) => void
  ): () => void
}
