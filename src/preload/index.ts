import { contextBridge, ipcRenderer } from 'electron'
import type { NeLS } from '@shared/types'

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
    const allowed = ['upload:progress', 'upload:done', 'upload:error'] as const
    if (!allowed.includes(channel as typeof allowed[number])) {
      throw new Error(`Unknown IPC channel: ${channel}`)
    }
    const sub = (_event: Electron.IpcRendererEvent, data: unknown) => listener(data as never)
    ipcRenderer.on(channel, sub)
    return () => ipcRenderer.removeListener(channel, sub)
  }
}

contextBridge.exposeInMainWorld('nels', nels)
