import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useShellStore } from '../../stores/shell-store'

const STORAGE_KEY = 'nassila.firstRunBannerDismissed'

export default function FirstRunBibliographyBanner() {
  const { t } = useTranslation()
  const setAppSurface = useShellStore((s) => s.setAppSurface)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(STORAGE_KEY) !== '1')
    } catch {
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
    setVisible(false)
  }

  return (
    <div
      className="flex flex-wrap items-center gap-3 border-b border-border bg-muted/40 px-4 py-2 text-sm text-foreground"
      role="status"
    >
      <p className="min-w-0 flex-1">{t('shell.firstRunBanner')}</p>
      <button
        type="button"
        className="shrink-0 rounded border border-border bg-card px-2 py-1 text-xs hover:bg-accent"
        onClick={() => {
          setAppSurface('bibliography')
          dismiss()
        }}
      >
        {t('shell.firstRunOpenBib')}
      </button>
      <button
        type="button"
        className="shrink-0 text-xs text-muted-foreground underline-offset-2 hover:underline"
        onClick={dismiss}
      >
        {t('shell.firstRunDismiss')}
      </button>
    </div>
  )
}
