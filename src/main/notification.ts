import { BrowserWindow, Notification, ipcMain, type WebContents } from 'electron'
import { existsSync, readFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

const SETTINGS_FILE = join(homedir(), '.citations-style', 'settings.json')
const MAX_TITLE_LEN = 120
const MAX_BODY_LEN = 400

function loadNotifyOnLongTasks(): boolean {
  try {
    if (!existsSync(SETTINGS_FILE)) return true
    const raw = readFileSync(SETTINGS_FILE, 'utf-8')
    const settings = JSON.parse(raw) as { notifyOnLongTasks?: unknown }
    return settings.notifyOnLongTasks !== false
  } catch {
    return true
  }
}

function sanitizeNotifyText(value: unknown, maxLen: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, maxLen)
}

function shouldShowOsNotification(sender: WebContents): boolean {
  const win = BrowserWindow.fromWebContents(sender)
  if (!win) return false

  const focused = BrowserWindow.getFocusedWindow()
  if (focused === null) return true
  if (focused.isMinimized()) return true
  if (focused.id !== win.id) return true
  return false
}

export function registerNotificationHandlers(): void {
  ipcMain.handle('notify:show', (event, payload: unknown) => {
    if (!Notification.isSupported()) return { shown: false }
    if (!loadNotifyOnLongTasks()) return { shown: false }
    if (!shouldShowOsNotification(event.sender)) return { shown: false }

    const candidate = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null
    const title = sanitizeNotifyText(candidate?.title, MAX_TITLE_LEN)
    const body = sanitizeNotifyText(candidate?.body, MAX_BODY_LEN)
    if (!title || !body) return { shown: false }

    const win = BrowserWindow.fromWebContents(event.sender)
    const notification = new Notification({ title, body })
    notification.on('click', () => {
      if (win && !win.isDestroyed()) {
        if (win.isMinimized()) win.restore()
        win.show()
        win.focus()
      }
    })
    notification.show()
    return { shown: true }
  })
}
