import { contextBridge, ipcRenderer } from 'electron'
import type { NeLS } from '@shared/types'

const ALLOWED_CHANNELS = ['upload:progress', 'upload:done', 'upload:error'] as const

const nels: NeLS = {
  auth: {
    login: () => ipcRenderer.invoke('auth:login'),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getSession: () => ipcRenderer.invoke('auth:get-session'),
  },
  fs: {
    list: (path: string) => ipcRenderer.invoke('fs:list', path),
    upload: (localPath: string, remotePath: string, id: string) =>
      ipcRenderer.invoke('fs:upload', localPath, remotePath, id),
  },
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
