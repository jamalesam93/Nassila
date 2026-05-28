import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n/config'
import { Button } from './ui/button'
import { useShellStore } from '../stores/shell-store'

export default function AboutModal() {
  const open = useShellStore((s) => s.aboutModalOpen)
  const setAboutModalOpen = useShellStore((s) => s.setAboutModalOpen)
  const { t } = useTranslation()
  const [meta, setMeta] = useState<{ name?: string; version?: string } | null>(null)
  const product = t('app.productName')

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void window.api
      ?.getAppAbout()
      .then((m) => {
        if (!cancelled) setMeta(m ?? null)
      })
      .catch(() => {
        if (!cancelled) setMeta(null)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-title"
      onClick={() => setAboutModalOpen(false)}
      onKeyDown={(e) => e.key === 'Escape' && setAboutModalOpen(false)}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-auto rounded-xl border border-border bg-card p-6 shadow-xl"
        dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="about-title" className="text-lg font-semibold text-foreground">
          {t('about.title', { name: meta?.name ?? product })}
        </h2>
        <p className="mt-1 text-sm font-medium text-foreground">{t('about.subtitle')}</p>
        <dl className="mt-4 space-y-1 text-xs text-muted-foreground">
          <div className="flex gap-2">
            <dt className="font-medium text-foreground">{t('about.versionLabel')}</dt>
            <dd>{meta?.version ?? '—'}</dd>
          </div>
        </dl>
        <ul className="mt-4 space-y-2 text-sm leading-relaxed text-foreground">
          <li>{t('about.shortBody', { name: meta?.name ?? product })}</li>
          <li>{t('about.shortWorkflow')}</li>
          <li>{t('about.privacyShort')}</li>
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">{t('about.oss')}</p>
        <div className="mt-6 flex justify-end">
          <Button type="button" size="sm" onClick={() => setAboutModalOpen(false)}>
            {t('about.close')}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
