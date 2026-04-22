import { app, BrowserWindow, Menu, protocol } from 'electron'
import { join, resolve } from 'path'
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
      autoHideMenuBar: true,
      // Matches the dark-mode --background token so a dark-theme launch
      // doesn't flash white before the renderer mounts. Light-theme users
      // see this briefly on startup — an acceptable trade-off since the
      // renderer's pre-mount theme script switches fast.
      backgroundColor: '#09090b',
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
    // Strip the default application menu. On Windows/Linux this removes the
    // menu bar entirely; on macOS it leaves just the system-required app menu.
    Menu.setApplicationMenu(null)

    // Register nels:// as a standard scheme before creating windows
    protocol.handle('nels', () => new Response('', { status: 204 }))
    // On Linux in dev, pass the app path so the .desktop file can find it.
    // Without this, the registered handler runs bare `electron` with no app arg.
    if (process.platform === 'linux' && !app.isPackaged) {
      app.setAsDefaultProtocolClient('nels', process.execPath, [resolve(process.argv[1])])
    } else {
      app.setAsDefaultProtocolClient('nels')
    }

    mainWindow = createWindow()
    registerIpcHandlers(() => mainWindow)

    // Only check for updates in packaged builds
    if (app.isPackaged) {
      import('electron-updater').then(({ autoUpdater }) => {
        autoUpdater.checkForUpdatesAndNotify().catch((err: Error) => {
          console.error('[updater] update check failed:', err.message)
        })
      })
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow()
    })
  })

  app.on('window-all-closed', () => {
    clearAdapter()
    if (process.platform !== 'darwin') app.quit()
  })
}
