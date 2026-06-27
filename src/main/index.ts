import { app, BrowserWindow, shell, Menu, nativeImage, type NativeImage } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc-handlers'
import { buildAppMenu } from './app-menu'
import { registerContentSecurityPolicy } from './content-security-policy'

function isSafeExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

function resolveWindowIcon(): NativeImage | undefined {
  const devPath = join(__dirname, '../../build/icon.png')
  const packagedPath = join(app.getAppPath(), 'build', 'icon.png')
  for (const p of [devPath, packagedPath]) {
    if (existsSync(p)) {
      return nativeImage.createFromPath(p)
    }
  }
  return undefined
}

function createWindow(): BrowserWindow {
  const icon = resolveWindowIcon()
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'Nassila',
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      // sandbox:true + ESM preload leaves window.api unset on Electron 41 (SEC-02).
      // Compensating controls: contextIsolation, webSecurity, production CSP (dev skips CSP).
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (isSafeExternalUrl(details.url)) {
      shell.openExternal(details.url)
    }
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

function attachEditableContextMenu(win: BrowserWindow): void {
  win.webContents.on('context-menu', (_, params) => {
    if (!params.isEditable) return
    Menu.buildFromTemplate([
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { type: 'separator' },
      { role: 'selectAll' }
    ]).popup({ window: win })
  })
}

app.whenReady().then(() => {
  app.setName('Nassila')
  electronApp.setAppUserModelId('com.nassila.app')
  registerContentSecurityPolicy()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
    attachEditableContextMenu(window)
  })

  registerIpcHandlers()
  const mainWindow = createWindow()
  buildAppMenu(mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const w = createWindow()
      buildAppMenu(w)
    }
  })
})
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
