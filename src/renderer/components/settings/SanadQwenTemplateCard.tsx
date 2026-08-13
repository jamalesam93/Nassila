import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'
import { notifyCopied } from '../../lib/notify'

/**
 * Qwen3.5 Sanad models think by default and can emit thinking traces before the
 * JSON payload. Nassila strips those in-app; this card surfaces the bundled
 * no-thinking template so users can also apply it at the source.
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
      <p className="text-xs font-medium text-foreground">{t('settings.localModels.sanadTemplateCard.title')}</p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
        {t('settings.localModels.sanadTemplateCard.intro')}
      </p>

      {template ? (
        <>
          <div className="mt-2">
            <p className="text-[11px] font-medium text-foreground">{t('settings.localModels.sanadTemplateCard.llamaCliLabel')}</p>
            <code className="mt-1 block overflow-x-auto rounded border border-border bg-background px-2 py-1.5 text-[11px] text-foreground">
              {`--jinja --chat-template-file "${template.path}"`}
            </code>
          </div>

          <div className="mt-2">
            <p className="text-[11px] font-medium text-foreground">{t('settings.localModels.sanadTemplateCard.ollamaLabel')}</p>
            <code className="mt-1 block overflow-x-auto rounded border border-border bg-background px-2 py-1.5 text-[11px] text-foreground">
              {`FROM nassila-sanad-9b-q6_k.gguf\nTEMPLATE """${t('settings.localModels.sanadTemplateCard.ollamaPasteHint')}"""`}
            </code>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => copyTemplate()}>
              {t('settings.localModels.sanadTemplateCard.copyTemplate')}
            </Button>
            <span className="text-[11px] text-muted-foreground">{t('settings.localModels.sanadTemplateCard.lmStudioHint')}</span>
          </div>
        </>
      ) : (
        <p className="mt-2 text-[11px] text-muted-foreground">{t('settings.localModels.sanadTemplateCard.loading')}</p>
      )}
    </div>
  )
}
