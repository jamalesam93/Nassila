import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { LuCheck, LuCircleAlert, LuInfo, LuTriangleAlert } from 'react-icons/lu'
import i18n from '../../i18n/config'
import { useNotifyStore, type ToastItem } from '../../stores/notify-store'
import { Icon } from './icon'

function toastClass(kind: ToastItem['kind']): string {
  switch (kind) {
    case 'success':
      return 'border-green-600/40 bg-green-50 text-green-950 dark:bg-green-950/90 dark:text-green-50'
    case 'warn':
      return 'border-amber-600/40 bg-amber-50 text-amber-950 dark:bg-amber-950/90 dark:text-amber-50'
    case 'error':
      return 'border-red-600/40 bg-red-50 text-red-950 dark:bg-red-950/90 dark:text-red-50'
    default:
      return 'border-border bg-card text-foreground'
  }
}

function toastIcon(kind: ToastItem['kind']) {
  switch (kind) {
    case 'success':
      return LuCheck
    case 'warn':
      return LuTriangleAlert
    case 'error':
      return LuCircleAlert
    default:
      return LuInfo
  }
}

function ToastStack({ items }: { items: ToastItem[] }) {
  const dismiss = useNotifyStore((s) => s.dismiss)
  const rtl = i18n.language === 'ar'
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <div
      className={`pointer-events-none fixed bottom-4 z-[400] flex max-w-sm flex-col gap-2 ${
        rtl ? 'start-4 items-start' : 'end-4 items-end'
      }`}
      aria-live="polite"
      aria-relevant="additions"
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`pointer-events-auto flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-start text-sm shadow-lg ${
            reduceMotion ? 'opacity-100' : 'opacity-100 transition-opacity duration-200'
          } ${toastClass(item.kind)}`}
          onClick={() => dismiss(item.id)}
        >
          <Icon icon={toastIcon(item.kind)} size={16} className="mt-0.5" />
          <span className="min-w-0 flex-1">{item.message}</span>
        </button>
      ))}
    </div>
  )
}

function ToastTimer({ item }: { item: ToastItem }) {
  const dismiss = useNotifyStore((s) => s.dismiss)

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(item.id), item.timeoutMs)
    return () => window.clearTimeout(timer)
  }, [dismiss, item.id, item.timeoutMs])

  return null
}

export default function ToastContainer() {
  const toasts = useNotifyStore((s) => s.toasts)

  if (typeof document === 'undefined' || toasts.length === 0) return null

  return createPortal(
    <>
      {toasts.map((item) => (
        <ToastTimer key={`timer-${item.id}`} item={item} />
      ))}
      <ToastStack items={toasts} />
    </>,
    document.body
  )
}
