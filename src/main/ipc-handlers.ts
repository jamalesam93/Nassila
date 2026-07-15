import { ipcMain, dialog, nativeTheme, BrowserWindow, app } from 'electron'
import { buildAppMenu } from './app-menu'
import type { MainMenuLocale } from './menu-i18n'
import { readFile, writeFile } from 'fs/promises'
import { homedir } from 'os'
import { join, resolve } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { registerOaIpcHandlers } from './ipc-oa'
import { registerMaktabIpcHandlers } from './ipc-maktab'
import { registerLlmIpcHandlers } from './ipc-llm'
import { registerTemplateIpcHandlers } from './ipc-templates'
import { registerManuscriptAuditPrefsHandlers } from './ipc-manuscript-audit-prefs'
import { registerPredatoryIpcHandlers } from './ipc-predatory-updates'
import { registerRegistryIpcHandlers } from './ipc-registry'
import { registerNotificationHandlers } from './notification'
import { checkNetworkStatus, resetNetworkStatusState } from './network-status'

const PRESETS_DIR = join(homedir(), '.citations-style')
const PRESETS_FILE = join(PRESETS_DIR, 'presets.json')
const SETTINGS_FILE = join(PRESETS_DIR, 'settings.json')
const MAX_CONFIG_BYTES = 1024 * 1024
const readablePaths = new Set<string>()
const writablePaths = new Set<string>()

type OpenDialogOptions = {
  filters?: { name: string; extensions: string[] }[]
  multiSelections?: boolean
}

type SaveDialogOptions = {
  defaultPath?: string
  filters?: { name: string; extensions: string[] }[]
}

function canonicalizePath(filePath: string): string {
  const normalized = resolve(filePath)
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized
}

function allowReadablePaths(paths: string[]): void {
  for (const filePath of paths) {
    readablePaths.add(canonicalizePath(filePath))
  }
}

function allowWritablePath(filePath: string): void {
  writablePaths.add(canonicalizePath(filePath))
}

function assertAllowedPath(filePath: unknown, allowedPaths: Set<string>, action: 'read' | 'write'): string {
  if (typeof filePath !== 'string' || filePath.trim().length === 0) {
    throw new Error(`Invalid file path for ${action}`)
  }

  const normalizedPath = canonicalizePath(filePath)
  if (!allowedPaths.has(normalizedPath)) {
    throw new Error(`File ${action} is not allowed for this path`)
  }

  return normalizedPath
}

function isValidDialogFilter(filter: unknown): filter is { name: string; extensions: string[] } {
  return Boolean(
    filter &&
    typeof filter === 'object' &&
    typeof (filter as { name?: unknown }).name === 'string' &&
    Array.isArray((filter as { extensions?: unknown }).extensions) &&
    (filter as { extensions: unknown[] }).extensions.every(
      (extension) => typeof extension === 'string' && /^[a-z0-9]+$/i.test(extension)
    )
  )
}

function sanitizeOpenDialogOptions(options: unknown): OpenDialogOptions {
  if (!options || typeof options !== 'object') return {}

  const candidate = options as OpenDialogOptions
  return {
    filters: Array.isArray(candidate.filters)
      ? candidate.filters.filter(isValidDialogFilter)
      : undefined,
    multiSelections: candidate.multiSelections === true
  }
}

function sanitizeSaveDialogOptions(options: unknown): SaveDialogOptions {
  if (!options || typeof options !== 'object') return {}

  const candidate = options as SaveDialogOptions
  return {
    defaultPath: typeof candidate.defaultPath === 'string' ? candidate.defaultPath : undefined,
    filters: Array.isArray(candidate.filters)
      ? candidate.filters.filter(isValidDialogFilter)
      : undefined
  }
}

function serializeConfigPayload(payload: unknown, label: string): string {
  const serialized = JSON.stringify(payload, null, 2)
  if (typeof serialized !== 'string') {
    throw new Error(`Invalid ${label} payload`)
  }

  if (Buffer.byteLength(serialized, 'utf-8') > MAX_CONFIG_BYTES) {
    throw new Error(`${label} payload is too large`)
  }

  return serialized
}

function validateThemeMode(mode: unknown): 'light' | 'dark' | 'system' {
  if (mode === 'light' || mode === 'dark' || mode === 'system') {
    return mode
  }

  throw new Error('Invalid theme mode')
}

function ensureConfigDir(): void {
  if (!existsSync(PRESETS_DIR)) {
    mkdirSync(PRESETS_DIR, { recursive: true })
  }
}

export function registerIpcHandlers(): void {
  registerOaIpcHandlers()
  registerMaktabIpcHandlers()
  registerLlmIpcHandlers()
  registerManuscriptAuditPrefsHandlers()
  registerTemplateIpcHandlers()
  registerPredatoryIpcHandlers()
  registerRegistryIpcHandlers()

  // ── File Dialogs ────────────────────────────────────────────────────────
  ipcMain.handle('dialog:open-file', async (_event, options: OpenDialogOptions) => {
    const sanitizedOptions = sanitizeOpenDialogOptions(options)
    const result = await dialog.showOpenDialog({
      properties: [
        'openFile',
        ...(sanitizedOptions.multiSelections ? ['multiSelections' as const] : [])
      ],
      filters: sanitizedOptions.filters ?? [
        { name: 'All Supported', extensions: ['bib', 'ris', 'json', 'docx', 'pdf', 'txt'] },
        { name: 'BibTeX', extensions: ['bib'] },
        { name: 'RIS', extensions: ['ris'] },
        { name: 'CSL-JSON', extensions: ['json'] },
        { name: 'Word Document', extensions: ['docx'] },
        { name: 'PDF', extensions: ['pdf'] },
        { name: 'Plain Text', extensions: ['txt'] }
      ]
    })
    if (result.canceled) return null
    allowReadablePaths(result.filePaths)
    return result.filePaths
  })

  ipcMain.handle('dialog:save-file', async (_event, options: SaveDialogOptions) => {
    const sanitizedOptions = sanitizeSaveDialogOptions(options)
    const result = await dialog.showSaveDialog({
      defaultPath: sanitizedOptions.defaultPath,
      filters: sanitizedOptions.filters ?? [
        { name: 'BibTeX', extensions: ['bib'] },
        { name: 'RIS', extensions: ['ris'] },
        { name: 'CSL-JSON', extensions: ['json'] },
        { name: 'Plain Text', extensions: ['txt'] },
        { name: 'Word Document', extensions: ['docx'] }
      ]
    })
    if (result.canceled) return null
    if (result.filePath) {
      allowWritablePath(result.filePath)
    }
    return result.filePath
  })

  // ── File I/O ────────────────────────────────────────────────────────────
  ipcMain.handle('fs:read-file', async (_event, filePath: string) => {
    const allowedPath = assertAllowedPath(filePath, readablePaths, 'read')
    const buffer = await readFile(allowedPath)
    return buffer.toString('utf-8')
  })

  ipcMain.handle('fs:read-file-binary', async (_event, filePath: string) => {
    const allowedPath = assertAllowedPath(filePath, readablePaths, 'read')
    const buffer = await readFile(allowedPath)
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  })

  ipcMain.handle('fs:write-file', async (_event, filePath: string, content: string) => {
    const allowedPath = assertAllowedPath(filePath, writablePaths, 'write')
    if (typeof content !== 'string') {
      throw new Error('Invalid file content')
    }

    await writeFile(allowedPath, content, 'utf-8')
  })

  // ── User Presets ────────────────────────────────────────────────────────
  ipcMain.handle('presets:load', async () => {
    ensureConfigDir()
    if (!existsSync(PRESETS_FILE)) return []
    const raw = await readFile(PRESETS_FILE, 'utf-8')
    return JSON.parse(raw)
  })

  ipcMain.handle('presets:save', async (_event, presets: unknown) => {
    ensureConfigDir()
    if (!Array.isArray(presets)) {
      throw new Error('Invalid presets payload')
    }

    await writeFile(PRESETS_FILE, serializeConfigPayload(presets, 'Presets'), 'utf-8')
  })

  // ── Settings ────────────────────────────────────────────────────────────
  ipcMain.handle('settings:load', async () => {
    ensureConfigDir()
    if (!existsSync(SETTINGS_FILE)) return {}
    const raw = await readFile(SETTINGS_FILE, 'utf-8')
    return JSON.parse(raw)
  })

  ipcMain.handle('settings:save', async (_event, settings: unknown) => {
    ensureConfigDir()
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      throw new Error('Invalid settings payload')
    }

    await writeFile(SETTINGS_FILE, serializeConfigPayload(settings, 'Settings'), 'utf-8')
  })

  // ── Theme ───────────────────────────────────────────────────────────────
  ipcMain.handle('theme:get-system', () => {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  })

  ipcMain.handle('theme:set-native', (_event, mode: 'light' | 'dark' | 'system') => {
    nativeTheme.themeSource = validateThemeMode(mode)
  })

  nativeTheme.on('updated', () => {
    const theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send('theme:system-changed', theme)
    }
  })

  ipcMain.handle('app:get-about', () => {
    return { name: app.getName(), version: app.getVersion() }
  })

  ipcMain.handle('app:set-menu-locale', (event, locale: unknown) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    const next: MainMenuLocale = locale === 'ar' ? 'ar' : 'en'
    buildAppMenu(win, next)
  })

  // ── Network Status ─────────────────────────────────────────────────────
  registerNotificationHandlers()

  ipcMain.handle('network:check', async (_event, opts?: { reset?: boolean }) => {
    if (opts?.reset) resetNetworkStatusState()
    return checkNetworkStatus()
  })
}
