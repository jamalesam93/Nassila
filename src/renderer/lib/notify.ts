import type { ToastKind } from '../stores/notify-store'
import { useNotifyStore } from '../stores/notify-store'

const DEFAULT_TOAST_MS = 4000
const ERROR_TOAST_MS = 6000

function isWindowFocused(): boolean {
  return typeof document !== 'undefined' && document.hasFocus() && document.visibilityState === 'visible'
}

export function pushToast(kind: ToastKind, message: string, timeoutMs?: number): void {
  useNotifyStore.getState().push({
    kind,
    message,
    timeoutMs: timeoutMs ?? (kind === 'error' || kind === 'warn' ? ERROR_TOAST_MS : DEFAULT_TOAST_MS)
  })
}

/** Long-task completion: in-app toast when focused, OS notification when not. */
export function notifyLongTaskComplete(options: {
  title: string
  body: string
  toastMessage: string
  kind?: ToastKind
}): void {
  if (isWindowFocused()) {
    pushToast(options.kind ?? 'success', options.toastMessage)
    return
  }
  void window.api?.notifyShow?.({ title: options.title, body: options.body })
}

export function notifyCopied(message: string): void {
  pushToast('info', message)
}
