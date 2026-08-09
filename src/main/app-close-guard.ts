/**
 * Window close-guard (1.7.0 Projects residual — dirty-close warning).
 *
 * Flow: the window's `close` event is intercepted. If this renderer has not yet
 * confirmed, we prevent default and ask the renderer (via
 * `APP_CLOSE_REQUESTED_CHANNEL`). The renderer decides based on `sessionIsDirty`
 * and, if the user confirms, invokes `APP_CONFIRM_CLOSE_CHANNEL`, which marks the
 * window confirmed and calls `win.close()` again so the close proceeds.
 */

import { BrowserWindow, ipcMain } from 'electron'
import { APP_CLOSE_REQUESTED_CHANNEL, APP_CONFIRM_CLOSE_CHANNEL } from '../shared/app-close-contract'

const confirmedWindows = new WeakSet<BrowserWindow>()

export function registerAppCloseGuardIpcHandler(): void {
  ipcMain.handle(APP_CONFIRM_CLOSE_CHANNEL, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return false
    confirmedWindows.add(win)
    win.close()
    return true
  })
}

/** Attach the intercept to a window; safe to call once per window. */
export function attachAppCloseGuard(win: BrowserWindow): void {
  win.on('close', (event) => {
    if (confirmedWindows.has(win)) return
    event.preventDefault()
    win.webContents.send(APP_CLOSE_REQUESTED_CHANNEL)
  })
}
