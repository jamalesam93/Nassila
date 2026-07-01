import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n/config'
import {
  SANAD_HF_12B_URL,
  SANAD_HF_E4B_URL,
  sanadSetupDocsUrl
} from '../../shared/sanad-setup-links'
import { Button } from './ui/button'
import { patchSanadSetupPrefs } from '../hooks/use-sanad-setup-prompt'
import { useShellStore } from '../stores/shell-store'

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-primary underline-offset-2 hover:underline"
    >
      {children}
    </a>
  )
}

export default function SanadSetupModal() {
  const open = useShellStore((s) => s.sanadSetupOpen)
  const setSanadSetupOpen = useShellStore((s) => s.setSanadSetupOpen)
  const openSettingsModal = useShellStore((s) => s.openSettingsModal)
  const { t } = useTranslation()
  const [dontShowAgain, setDontShowAgain] = useState(false)

  const guideUrl = sanadSetupDocsUrl(i18n.language)

  const close = useCallback(() => {
    if (dontShowAgain) {
      void patchSanadSetupPrefs({ sanadSetupDismissed: true })
    }
    setDontShowAgain(false)
    setSanadSetupOpen(false)
  }, [dontShowAgain, setSanadSetupOpen])

  const openSettings = useCallback(() => {
    if (dontShowAgain) {
      void patchSanadSetupPrefs({ sanadSetupDismissed: true })
    }
    setDontShowAgain(false)
    setSanadSetupOpen(false)
    openSettingsModal('localModels')
  }, [dontShowAgain, openSettingsModal, setSanadSetupOpen])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sanad-setup-title"
      onClick={() => close()}
      onKeyDown={(e) => e.key === 'Escape' && close()}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl border border-border bg-card p-6 shadow-xl"
        dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="sanad-setup-title" className="text-lg font-semibold text-foreground">
          {t('sanadSetup.title')}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t('sanadSetup.subtitle')}</p>

        <section className="mt-4">
          <h3 className="text-xs font-semibold text-foreground">{t('sanadSetup.modelsTitle')}</h3>
          <ul className="mt-2 list-disc space-y-1 ps-4 text-sm leading-relaxed text-foreground">
            <li>
              <ExternalLink href={SANAD_HF_E4B_URL}>{t('sanadSetup.models.e4b')}</ExternalLink>
            </li>
            <li>
              <ExternalLink href={SANAD_HF_12B_URL}>{t('sanadSetup.models.12b')}</ExternalLink>
            </li>
          </ul>
        </section>

        <div className="mt-5">
          <a
            href={guideUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t('sanadSetup.fullGuide')} ↗
          </a>
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">{t('sanadSetup.privacy')}</p>

        <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            className="rounded border-input"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
          />
          {t('sanadSetup.dontShowAgain')}
        </label>

        <div className="mt-5 flex flex-wrap justify-end gap-2 rtl:flex-row-reverse">
          <Button type="button" size="sm" variant="ghost" onClick={() => close()}>
            {t('sanadSetup.close')}
          </Button>
          <Button type="button" size="sm" onClick={() => openSettings()}>
            {t('sanadSetup.openSettings')}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
