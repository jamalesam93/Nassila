import { useCallback, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n/config'
import {
  LM_STUDIO_DEFAULT_BASE,
  LM_STUDIO_URL,
  OLLAMA_HF_PULL_E4B,
  OLLAMA_URL,
  SANAD_DEFAULT_MODEL_ID,
  SANAD_HF_12B_URL,
  SANAD_HF_E4B_URL,
  SANAD_QUALITY_MODEL_ID,
  VLLM_DOCS_URL
} from '../../shared/sanad-setup-links'
import { Button } from './ui/button'
import { patchSanadSetupPrefs } from '../hooks/use-sanad-setup-prompt'
import { useShellStore } from '../stores/shell-store'
import { copyToClipboard } from '../utils/copy-to-clipboard'

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
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

function CommandBlock({ command, copyLabel, copiedLabel }: { command: string; copyLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false)

  const onCopy = () => {
    void copyToClipboard(command).then((ok) => {
      if (ok) {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
      }
    })
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-start gap-2">
      <code className="block min-w-0 flex-1 break-all rounded-md border border-border bg-muted/40 px-2 py-1.5 text-[11px] leading-relaxed text-foreground">
        {command}
      </code>
      <Button type="button" size="sm" variant="secondary" className="shrink-0" onClick={onCopy}>
        {copied ? copiedLabel : copyLabel}
      </Button>
    </div>
  )
}

export default function SanadSetupModal() {
  const open = useShellStore((s) => s.sanadSetupOpen)
  const setSanadSetupOpen = useShellStore((s) => s.setSanadSetupOpen)
  const openSettingsModal = useShellStore((s) => s.openSettingsModal)
  const { t } = useTranslation()
  const [dontShowAgain, setDontShowAgain] = useState(false)

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

        <section className="mt-4">
          <h3 className="text-xs font-semibold text-foreground">{t('sanadSetup.runnersTitle')}</h3>

          <div className="mt-3 space-y-4 text-sm leading-relaxed text-foreground">
            <div>
              <p className="font-medium">
                {t('sanadSetup.runners.lmstudio.title')}{' '}
                <span className="text-xs font-normal text-muted-foreground">({t('sanadSetup.recommended')})</span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                <ExternalLink href={LM_STUDIO_URL}>{t('sanadSetup.runners.lmstudio.link')}</ExternalLink>
              </p>
              <ul className="mt-1.5 list-disc space-y-0.5 ps-4 text-xs text-muted-foreground">
                <li>{t('sanadSetup.runners.lmstudio.step1')}</li>
                <li>{t('sanadSetup.runners.lmstudio.step2')}</li>
                <li>{t('sanadSetup.runners.lmstudio.step3', { url: LM_STUDIO_DEFAULT_BASE, model: SANAD_DEFAULT_MODEL_ID })}</li>
              </ul>
            </div>

            <div>
              <p className="font-medium">{t('sanadSetup.runners.ollama.title')}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                <ExternalLink href={OLLAMA_URL}>{t('sanadSetup.runners.ollama.link')}</ExternalLink>
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">{t('sanadSetup.runners.ollama.hfPullHint')}</p>
              <CommandBlock
                command={OLLAMA_HF_PULL_E4B}
                copyLabel={t('sanadSetup.copyCommand')}
                copiedLabel={t('sanadSetup.copied')}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">{t('sanadSetup.runners.ollama.modelIdHint')}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('sanadSetup.runners.ollama.modelfileHint')}</p>
            </div>

            <div>
              <p className="font-medium">{t('sanadSetup.runners.vllm.title')}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                <ExternalLink href={VLLM_DOCS_URL}>{t('sanadSetup.runners.vllm.link')}</ExternalLink>
              </p>
              <ul className="mt-1.5 list-disc space-y-0.5 ps-4 text-xs text-muted-foreground">
                <li>{t('sanadSetup.runners.vllm.step1', { model: SANAD_QUALITY_MODEL_ID })}</li>
                <li>{t('sanadSetup.runners.vllm.step2')}</li>
              </ul>
            </div>
          </div>
        </section>

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

        <div className="mt-5 flex flex-wrap justify-end gap-2">
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
