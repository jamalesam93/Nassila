import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useCitationStore } from '../stores/citation-store'

export default function StatusBar() {
  const { t } = useTranslation()
  const citationCount = useCitationStore((s) => s.citations.length)
  const issueCount = useCitationStore((s) => s.issues.length)
  const detectedStyle = useCitationStore((s) => s.detectedStyle)
  const networkStatus = useCitationStore((s) => s.networkStatus)
  const selectedStyleId = useCitationStore((s) => s.selectedStyleId)
  const citationStatuses = useCitationStore((s) => s.citationStatuses)
  const predatoryFlags = useCitationStore((s) => s.predatoryFlags)
  const duplicateCount = useCitationStore((s) => s.duplicates.length)

  const health = useMemo(() => {
    const fixed = Object.values(citationStatuses).filter((s) => s === 'fixed').length
    const partial = Object.values(citationStatuses).filter((s) => s === 'partially-fixed').length
    const needsFix = Object.values(citationStatuses).filter((s) => s === 'has-issues').length
    return { fixed, partial, needsFix }
  }, [citationStatuses])

  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-border bg-card px-4 py-1.5 text-xs text-muted-foreground rtl:flex-row-reverse">
      <span>{t('statusBar.citations', { count: citationCount })}</span>

      {issueCount > 0 && (
        <span className="text-destructive">{t('statusBar.issues', { count: issueCount })}</span>
      )}

      {health.fixed > 0 && (
        <span className="text-green-600 dark:text-green-400">
          {t('statusBar.fixed', { count: health.fixed })}
        </span>
      )}
      {health.partial > 0 && (
        <span className="text-amber-600 dark:text-amber-400">
          {t('statusBar.partial', { count: health.partial })}
        </span>
      )}
      {health.needsFix > 0 && (
        <span className="text-red-600 dark:text-red-400">
          {t('statusBar.needsFix', { count: health.needsFix })}
        </span>
      )}
      {predatoryFlags.length > 0 && (
        <span className="text-red-700 dark:text-red-300">
          {t('statusBar.predatory', { count: predatoryFlags.length })}
        </span>
      )}
      {duplicateCount > 0 && (
        <span>{t('statusBar.duplicates', { count: duplicateCount })}</span>
      )}

      {detectedStyle && (
        <span>
          {t('statusBar.detected', {
            name: detectedStyle.styleName,
            pct: Math.round(detectedStyle.confidence * 100)
          })}
        </span>
      )}

      {selectedStyleId && <span>{t('statusBar.target', { id: selectedStyleId })}</span>}

      <div className="flex-1" />

      <span className={networkStatus === 'online' ? 'text-green-600 dark:text-green-400' : 'text-destructive'}>
        {networkStatus === 'online' ? t('statusBar.online') : t('statusBar.offline')}
      </span>
    </div>
  )
}
