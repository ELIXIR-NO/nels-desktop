import { app, ipcMain, type BrowserWindow } from 'electron'
import type { SafeConfig } from '@shared/types'
import { login, logout, getSession, loginWithToken, getProjects, getSshCredentialInfo } from './auth'
import { listFiles, uploadFile, deleteEntry, clearAdapter } from './sftp'
import { config } from './config'

/**
 * Belt-and-suspenders against catastrophic deletes. Rejects anything that
 * isn't a leaf under Personal/ or Projects/<name>/ — so the IPC can never
 * unlink a whole project, the Personal root, or traverse above $HOME via '..'.
 * Renderer code already only renders child entries, but the main process
 * shouldn't trust it.
 */
function assertSafeDeletePath(path: string): void {
  if (path.includes('..') || path.startsWith('/')) {
    throw new Error(`fs:delete: refusing unsafe path ${JSON.stringify(path)}`)
  }
  const parts = path.split('/').filter(Boolean)
  const inPersonal = parts[0] === 'Personal' && parts.length >= 2
  const inProject = parts[0] === 'Projects' && parts.length >= 3
  if (!inPersonal && !inProject) {
    throw new Error(
      `fs:delete: refusing to delete root path ${JSON.stringify(path)} — only entries under Personal/ or Projects/<name>/ are allowed`
    )
  }
}

export function registerIpcHandlers(getWin: () => BrowserWindow | null): void {
  ipcMain.handle('auth:login', () => login())
  ipcMain.handle('auth:login-with-token', (_event, token: unknown) => {
    if (typeof token !== 'string' || !token) throw new Error('auth:login-with-token: token must be a non-empty string')
    return loginWithToken(token)
  })

  ipcMain.handle('auth:logout', async () => {
    clearAdapter()
    await logout()
  })

  ipcMain.handle('auth:get-session', () => getSession())

  ipcMain.handle('auth:get-credential-info', () => getSshCredentialInfo())

  ipcMain.handle('config:get', (): SafeConfig => ({
    apiBase: config.apiBase,
    oauthBase: config.oauthBase,
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    ssh: {
      loginHost: config.ssh.loginHost,
      dataHost: config.ssh.dataHost,
      loginFingerprint: config.ssh.loginFingerprint,
      dataFingerprint: config.ssh.dataFingerprint,
    },
    appVersion: app.getVersion(),
    isPackaged: app.isPackaged,
  }))

  ipcMain.handle('projects:list', () => getProjects())

  ipcMain.handle('fs:list', (_event, path: unknown) => {
    if (typeof path !== 'string' || !path) throw new Error('fs:list: path must be a non-empty string')
    return listFiles(path)
  })

  ipcMain.handle('fs:delete', (_event, path: unknown, isDir: unknown) => {
    if (typeof path !== 'string' || !path) throw new Error('fs:delete: path must be a non-empty string')
    if (typeof isDir !== 'boolean') throw new Error('fs:delete: isDir must be a boolean')
    assertSafeDeletePath(path)
    return deleteEntry(path, isDir)
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
