import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { NeLS } from '@shared/types'

const ALLOWED_CHANNELS = ['upload:progress', 'upload:done', 'upload:error'] as const

const nels: NeLS = {
  auth: {
    login: () => ipcRenderer.invoke('auth:login'),
    loginWithToken: (token: string) => ipcRenderer.invoke('auth:login-with-token', token),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getSession: () => ipcRenderer.invoke('auth:get-session'),
    getCredentialInfo: () => ipcRenderer.invoke('auth:get-credential-info'),
  },
  config: {
    get: () => ipcRenderer.invoke('config:get'),
  },
  fs: {
    list: (path: string) => ipcRenderer.invoke('fs:list', path),
    upload: (localPath: string, remotePath: string, id: string) =>
      ipcRenderer.invoke('fs:upload', localPath, remotePath, id),
    delete: (path: string, isDir: boolean) => ipcRenderer.invoke('fs:delete', path, isDir),
    mkdir: (path: string) => ipcRenderer.invoke('fs:mkdir', path),
  },
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
  },
  // Electron 32 removed `File.path`; webUtils.getPathForFile is the replacement
  // and must be called from the preload (main-world can't import electron).
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  on: (channel, listener) => {
    if (!ALLOWED_CHANNELS.includes(channel as typeof ALLOWED_CHANNELS[number])) {
      throw new Error(`Unknown IPC channel: ${channel}`)
    }
    // Main process is responsible for emitting the correct shape per channel.
    // Cast is safe: allowlist above constrains `channel` to UploadEventMap keys,
    // and main is the only sender.
    const sub = (_event: Electron.IpcRendererEvent, data: unknown) =>
      listener(data as Parameters<typeof listener>[0])
    ipcRenderer.on(channel, sub)
    // Caller must call the returned disposer to avoid listener accumulation.
    return () => ipcRenderer.removeListener(channel, sub)
  }
}

contextBridge.exposeInMainWorld('nels', nels)
