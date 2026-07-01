import { app, BrowserWindow, shell, Menu, nativeImage, type NativeImage } from 'electron'
import { existsSync, readFileSync } from 'fs'
import { join, resolve } from 'path'
import { optimizer, is } from '@electron-toolkit/utils'
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

function loadIconFromFile(filePath: string): NativeImage | undefined {
  if (!existsSync(filePath)) return undefined
  const fromPath = nativeImage.createFromPath(filePath)
  if (!fromPath.isEmpty()) return fromPath
  try {
    const fromBuffer = nativeImage.createFromBuffer(readFileSync(filePath))
    if (!fromBuffer.isEmpty()) return fromBuffer
  } catch {
    /* unsupported format */
  }
  return undefined
}

function resolveWindowIcon(): NativeImage | undefined {
  const isWin = process.platform === 'win32'
  const names = isWin ? ['icon.ico', 'icon.png'] : ['icon.png', 'icon.ico']
  const bases = [
    join(__dirname, 'assets'),
    join(__dirname, '../../build'),
    join(app.getAppPath(), 'build'),
    join(process.cwd(), 'build')
  ]
  for (const base of bases) {
    for (const name of names) {
      const image = loadIconFromFile(resolve(join(base, name)))
      if (image) {
        if (isWin && name.endsWith('.png')) {
          const resized = image.resize({ width: 256, height: 256 })
          if (!resized.isEmpty()) return resized
        }
        return image
      }
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

  if (icon) {
    mainWindow.setIcon(icon)
  }

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
  // electron-toolkit uses process.execPath in dev on Windows, which pins the Electron globe
  // on the taskbar/title bar. Use our app id so BrowserWindow icon is honored.
  app.setAppUserModelId('com.nassila.app')
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
