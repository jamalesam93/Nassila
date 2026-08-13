import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../../i18n/config'
import { sanadSetupDocsUrl } from '../../../shared/sanad-setup-links'
import { Button } from '../ui/button'
import { notifyCopied } from '../../lib/notify'

/**
 * Qwen3.5 Sanad models think by default. Nassila strips traces in-app; this
 * card hands over the bundled no-thinking template for llama.cpp users.
 */
export default function SanadQwenTemplateCard() {
  const { t } = useTranslation()
  const [template, setTemplate] = useState<{ path: string; content: string } | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    window.api
      ?.getQwenTemplate?.()
      .then((res) => {
        if (!cancelled) setTemplate(res)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const copyTemplate = () => {
    if (!template) return
    void navigator.clipboard
      .writeText(template.content)
      .then(() => notifyCopied(t('notifications.copied')))
      .catch(() => notifyCopied(t('settings.localModels.sanadTemplateCard.copyFailed')))
  }

  if (failed) return null

  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground">{t('settings.localModels.sanadTemplateCard.title')}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => copyTemplate()} disabled={!template}>
            {t('settings.localModels.sanadTemplateCard.copyTemplate')}
          </Button>
          <a
            href={sanadSetupDocsUrl(i18n.language)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-medium text-primary underline-offset-2 hover:underline"
          >
            {t('settings.localModels.sanadTemplateCard.guide')} ↗
          </a>
        </div>
      </div>
    </div>
  )
}
