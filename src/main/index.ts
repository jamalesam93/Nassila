import { app, BrowserWindow, shell, Menu, nativeImage, type NativeImage } from 'electron'
import { existsSync, readFileSync } from 'fs'
import { join, resolve } from 'path'
import { optimizer, is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc-handlers'
import { buildAppMenu } from './app-menu'
import { registerContentSecurityPolicy } from './content-security-policy'
import appIconIco from '../../build/icon.ico?asset'
import appIconPng from '../../build/icon.png?asset'

// Windows: set before ready so the taskbar/title bar can use our identity (not Electron's).
// npm run dev sets NASSILA_DEV_RUNTIME=1. Do not key only on !app.isPackaged — renaming the
// binary away from electron.exe makes Windows report isPackaged=true and would keep the
// cached com.nassila.app taskbar atom.
if (process.platform === 'win32') {
  const unpackagedDev =
    process.env.NASSILA_DEV_RUNTIME === '1' ||
    process.env.NODE_ENV_ELECTRON_VITE === 'development' ||
    !app.isPackaged
  // Packaged builds use a versioned AUMID so Windows does not keep a cached Electron
  // taskbar glyph registered under the older com.nassila.app id.
  app.setAppUserModelId(unpackagedDev ? 'com.nassila.app.dev' : 'com.nassila.app.v130')
}

function isSafeExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

function loadIconFromFile(filePath: string): NativeImage | undefined {
  if (!filePath || !existsSync(filePath)) return undefined
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

/** Bundled ?asset paths first; filesystem fallbacks for unpackaged edge cases. */
function resolveWindowIcon(): { path: string; image: NativeImage } | undefined {
  const isWin = process.platform === 'win32'
  const packagedIconBases = app.isPackaged
    ? [join(process.resourcesPath, 'app-icon.ico'), join(process.resourcesPath, 'app-icon.png')]
    : []
  const bundled = isWin ? [appIconIco, appIconPng] : [appIconPng, appIconIco]
  const fallbackBases = [
    join(import.meta.dirname, 'assets'),
    join(import.meta.dirname, '../../build'),
    join(app.getAppPath(), 'build'),
    join(process.cwd(), 'build')
  ]
  const fallbacks = fallbackBases.flatMap((base) =>
    (isWin ? ['icon.ico', 'icon.png'] : ['icon.png', 'icon.ico']).map((name) =>
      resolve(join(base, name))
    )
  )

  // Packaged: prefer extraResources icons on a real disk path (not asar).
  const candidates = app.isPackaged
    ? [...packagedIconBases, ...bundled, ...fallbacks]
    : [...bundled, ...fallbacks]

  for (const filePath of candidates) {
    const image = loadIconFromFile(filePath)
    if (!image) continue
    if (isWin && filePath.toLowerCase().endsWith('.png')) {
      const resized = image.resize({ width: 256, height: 256 })
      if (!resized.isEmpty()) return { path: filePath, image: resized }
    }
    return { path: filePath, image }
  }
  return undefined
}

function createWindow(): BrowserWindow {
  const resolved = resolveWindowIcon()
  // Always pass NativeImage (not a filesystem path). On Windows, icon paths with
  // spaces (e.g. "Cursor Projects") are unreliable for BrowserWindow.icon.
  const iconOption = resolved?.image

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'Nassila',
    ...(iconOption ? { icon: iconOption } : {}),
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.mjs'),
      // sandbox:true + ESM preload leaves window.api unset on Electron 41 (SEC-02).
      // Compensating controls: contextIsolation, webSecurity, production CSP (dev skips CSP).
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })

  if (resolved) {
    mainWindow.setIcon(resolved.image)
  }

  mainWindow.on('ready-to-show', () => {
    if (resolved) {
      mainWindow.setIcon(resolved.image)
    }
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
    mainWindow.loadFile(join(import.meta.dirname, '../renderer/index.html'))
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
