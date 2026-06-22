import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useCitationStore } from '../stores/citation-store'
import { useManuscriptAuditStore } from '../stores/manuscript-audit-store'
import { useShellStore } from '../stores/shell-store'
import { previewManuscript } from '../utils/manuscript-preview'

export default function StatusBar() {
  const { t } = useTranslation()
  const appSurface = useShellStore((s) => s.appSurface)
  const bibliographyBusy = useShellStore((s) => s.bibliographyBusy)

  const issueCount = useCitationStore((s) => s.issues.length)
  const networkStatus = useCitationStore((s) => s.networkStatus)
  const selectedStyleId = useCitationStore((s) => s.selectedStyleId)
  const predatoryFlags = useCitationStore((s) => s.predatoryFlags)
  const duplicateCount = useCitationStore((s) => s.duplicates.length)

  const raw = useManuscriptAuditStore((s) => s.rawManuscriptText)
  const step = useManuscriptAuditStore((s) => s.step)
  const report = useManuscriptAuditStore((s) => s.report)

  const manuscriptPreview = useMemo(() => previewManuscript(raw), [raw])

  const baseClass =
    'flex shrink-0 items-center gap-3 overflow-hidden whitespace-nowrap border-t border-border bg-card px-4 py-1.5 text-xs text-muted-foreground rtl:flex-row-reverse'

  if (appSurface === 'loop') {
    const findingCount = report?.findings.length ?? 0
    const running = step !== 'idle' && step !== 'done' && step !== 'error'
    return (
      <div className={baseClass}>
        {manuscriptPreview.ok ? (
          <span>
            {t('loop.previewStats', {
              words: manuscriptPreview.wordCount,
              cites: manuscriptPreview.inTextCitationCount
            })}
          </span>
        ) : null}
        {running ? (
          <span>{t('manuscriptAudit.phase.' + step)}</span>
        ) : null}
        {findingCount > 0 ? <span>{t('loop.statusFindings', { count: findingCount })}</span> : null}
        <div className="flex-1" />
        <span className={networkStatus === 'online' ? 'text-green-600 dark:text-green-400' : 'text-destructive'}>
          {networkStatus === 'online' ? t('statusBar.online') : t('statusBar.offline')}
        </span>
      </div>
    )
  }

  return (
    <div className={baseClass}>
      {bibliographyBusy ? <span>{t('toolbar.verifyingBusy')}</span> : null}
      {issueCount > 0 && (
        <span className="text-destructive">{t('statusBar.issues', { count: issueCount })}</span>
      )}
      {predatoryFlags.length > 0 && (
        <span className="text-red-700 dark:text-red-300">
          {t('statusBar.predatory', { count: predatoryFlags.length })}
        </span>
      )}
      {duplicateCount > 0 && (
        <span>{t('statusBar.duplicates', { count: duplicateCount })}</span>
      )}
      {selectedStyleId ? <span>{t('statusBar.target', { id: selectedStyleId })}</span> : null}
      <div className="flex-1" />
      <span className={networkStatus === 'online' ? 'text-green-600 dark:text-green-400' : 'text-destructive'}>
        {networkStatus === 'online' ? t('statusBar.online') : t('statusBar.offline')}
      </span>
    </div>
  )
}
