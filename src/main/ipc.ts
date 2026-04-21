import { ipcMain, type BrowserWindow } from 'electron'
import { login, logout, getSession } from './auth'
import { listFiles, uploadFile, clearAdapter } from './sftp'

export function registerIpcHandlers(win: BrowserWindow): void {
  ipcMain.handle('auth:login', () => login())

  ipcMain.handle('auth:logout', async () => {
    clearAdapter()
    await logout()
  })

  ipcMain.handle('auth:get-session', () => getSession())

  ipcMain.handle('fs:list', (_event, path: string) => listFiles(path))

  ipcMain.handle('fs:upload', async (_event, localPath: string, remotePath: string, id: string) => {
    try {
      await uploadFile(localPath, remotePath, (pct) => {
        win.webContents.send('upload:progress', { id, pct })
      })
      win.webContents.send('upload:done', { id })
    } catch (err) {
      win.webContents.send('upload:error', {
        id,
        message: (err as Error).message
      })
    }
  })
}
