import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useConfirmStore } from '../../stores/confirm-store'
import { Button } from './button'

export default function ConfirmDialog() {
  const { t } = useTranslation()
  const open = useConfirmStore((s) => s.open)
  const message = useConfirmStore((s) => s.message)
  const title = useConfirmStore((s) => s.title)
  const confirm = useConfirmStore((s) => s.confirm)
  const cancel = useConfirmStore((s) => s.cancel)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, cancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) cancel()
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-lg"
      >
        {title ? (
          <h2 id="confirm-dialog-title" className="text-sm font-semibold text-foreground">
            {title}
          </h2>
        ) : null}
        <p id="confirm-dialog-message" className={`text-sm text-muted-foreground ${title ? 'mt-2' : ''}`}>
          {message}
        </p>
        <div className="mt-4 flex justify-end gap-2 rtl:flex-row-reverse">
          <button
            ref={cancelRef}
            type="button"
            className="inline-flex h-8 items-center rounded-md border border-border bg-secondary px-2 text-xs font-medium hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={cancel}
          >
            {t('dialog.cancel')}
          </button>
          <Button size="sm" onClick={confirm}>
            {t('dialog.confirm')}
          </Button>
        </div>
      </div>
    </div>
  )
}
