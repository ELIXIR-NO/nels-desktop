import { ipcMain, type BrowserWindow } from 'electron'
import { login, logout, getSession } from './auth'
import { listFiles, uploadFile, clearAdapter } from './sftp'

export function registerIpcHandlers(getWin: () => BrowserWindow | null): void {
  ipcMain.handle('auth:login', () => login())

  ipcMain.handle('auth:logout', async () => {
    clearAdapter()
    await logout()
  })

  ipcMain.handle('auth:get-session', () => getSession())

  ipcMain.handle('fs:list', (_event, path: unknown) => {
    if (typeof path !== 'string' || !path) throw new Error('fs:list: path must be a non-empty string')
    return listFiles(path)
  })

  ipcMain.handle('fs:upload', async (_event, localPath: unknown, remotePath: unknown, id: unknown) => {
    if (typeof localPath !== 'string' || !localPath) throw new Error('fs:upload: localPath must be a non-empty string')
    if (typeof remotePath !== 'string' || !remotePath) throw new Error('fs:upload: remotePath must be a non-empty string')
    if (typeof id !== 'string' || !id) throw new Error('fs:upload: id must be a non-empty string')

    const win = getWin()
    if (!win) return

    try {
      await uploadFile(localPath, remotePath, (pct) => {
        if (!win.isDestroyed()) win.webContents.send('upload:progress', { id, pct })
      })
      if (!win.isDestroyed()) win.webContents.send('upload:done', { id })
    } catch (err) {
      if (!win.isDestroyed()) win.webContents.send('upload:error', {
        id,
        message: (err as Error).message
      })
    }
  })
}
