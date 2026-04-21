import { app, BrowserWindow, protocol } from 'electron'
import { join } from 'path'
import { resolveAuthCallback } from './auth'
import { clearAdapter } from './sftp'
import { registerIpcHandlers } from './ipc'

// macOS: must register before app is ready
app.on('open-url', (event, url) => {
  event.preventDefault()
  resolveAuthCallback(url)
})

// Windows/Linux: single-instance lock + second-instance protocol callback
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  let mainWindow: BrowserWindow | null = null

  app.on('second-instance', (_event, argv) => {
    const url = argv.find((arg) => arg.startsWith('nels://'))
    if (url) resolveAuthCallback(url)
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  function createWindow(): BrowserWindow {
    const win = new BrowserWindow({
      width: 900,
      height: 650,
      minWidth: 700,
      minHeight: 500,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      }
    })

    if (process.env.ELECTRON_RENDERER_URL) {
      win.loadURL(process.env.ELECTRON_RENDERER_URL)
    } else {
      win.loadFile(join(__dirname, '../renderer/index.html'))
    }

    return win
  }

  app.whenReady().then(() => {
    // Register nels:// as a standard scheme before creating windows
    protocol.handle('nels', () => new Response('', { status: 204 }))
    app.setAsDefaultProtocolClient('nels')

    mainWindow = createWindow()
    registerIpcHandlers(() => mainWindow)

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow()
    })
  })

  app.on('window-all-closed', () => {
    clearAdapter()
    if (process.platform !== 'darwin') app.quit()
  })
}
