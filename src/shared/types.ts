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

export interface NelsProject {
  projectId: number
  name: string
  description?: string
  role?: string
  hasFilesystemAccess: boolean
}

export interface SafeConfig {
  apiBase: string
  oauthBase: string
  clientId: string
  redirectUri: string
  ssh: {
    loginHost: string
    dataHost: string
    loginFingerprint: string
    dataFingerprint: string
  }
  appVersion: string
  isPackaged: boolean
}

/** Non-sensitive subset of SshCredential — never include the private key. */
export interface SshCredentialInfo {
  userId: number
  username: string
  host: string
  hasKey: boolean
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
    loginWithToken(token: string): Promise<UserInfo>
    logout(): Promise<void>
    getSession(): Promise<UserInfo | null>
    getCredentialInfo(): Promise<SshCredentialInfo | null>
  }
  config: {
    get(): Promise<SafeConfig>
  }
  fs: {
    list(path: string): Promise<FileEntry[]>
    upload(localPath: string, remotePath: string, id: string): Promise<void>
    delete(path: string, isDir: boolean): Promise<void>
  }
  projects: {
    list(): Promise<NelsProject[]>
  }
  on<C extends keyof UploadEventMap>(
    channel: C,
    listener: (data: UploadEventMap[C]) => void
  ): () => void
  getPathForFile(file: File): string
}
