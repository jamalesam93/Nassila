import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useCitationStore } from '../stores/citation-store'
import { useManuscriptAuditStore } from '../stores/manuscript-audit-store'
import { useShellStore } from '../stores/shell-store'
import { previewManuscript } from '../utils/manuscript-preview'
import { bibliographyTaskMessage } from '../utils/bibliography-task-message'

export default function StatusBar() {
  const { t } = useTranslation()
  const appSurface = useShellStore((s) => s.appSurface)
  const bibliographyTask = useShellStore((s) => s.bibliographyTask)
  const citationCount = useCitationStore((s) => s.citations.length)

  const issueCount = useCitationStore((s) => s.issues.length)
  const selectedStyleId = useCitationStore((s) => s.selectedStyleId)
  const predatoryFlags = useCitationStore((s) => s.predatoryFlags)
  const duplicateCount = useCitationStore((s) => s.duplicates.length)

  const raw = useManuscriptAuditStore((s) => s.rawManuscriptText)
  const step = useManuscriptAuditStore((s) => s.step)
  const auditProgress = useManuscriptAuditStore((s) => s.auditProgress)
  const importProgress = useManuscriptAuditStore((s) => s.importProgress)
  const report = useManuscriptAuditStore((s) => s.report)

  const manuscriptPreview = useMemo(() => previewManuscript(raw), [raw])

  const baseClass =
    'flex shrink-0 items-center gap-3 overflow-hidden whitespace-nowrap border-t border-border bg-card px-4 py-1.5 text-xs text-muted-foreground rtl:flex-row-reverse'

  if (appSurface === 'loop') {
    const findingCount = report?.findings.length ?? 0
    const running = step !== 'idle' && step !== 'done' && step !== 'error'
    return (
      <div className={baseClass}>
        {importProgress ? (
          <span role="status">
            {importProgress.phase === 'ocr' && importProgress.total > 0
              ? t('manuscriptAudit.importingOcr', {
                  processed: importProgress.processed,
                  total: importProgress.total,
                  percent: Math.min(
                    100,
                    Math.round((importProgress.processed / importProgress.total) * 100)
                  )
                })
              : importProgress.phase === 'checking'
                ? t('manuscriptAudit.importingChecking')
                : t('manuscriptAudit.importingReading')}
          </span>
        ) : null}
        {!importProgress && manuscriptPreview.ok ? (
          <span>
            {t('loop.previewStats', {
              words: manuscriptPreview.wordCount,
              cites: manuscriptPreview.inTextCitationCount
            })}
          </span>
        ) : null}
        {!importProgress && running ? (
          <span>
            {t('manuscriptAudit.phase.' + step)}
            {auditProgress && auditProgress.total > 0
              ? ` · ${t('manuscriptAudit.progress', {
                  processed: auditProgress.processed,
                  total: auditProgress.total
                })}`
              : null}
          </span>
        ) : null}
        {!importProgress && findingCount > 0 ? (
          <span>{t('loop.statusFindings', { count: findingCount })}</span>
        ) : null}
      </div>
    )
  }

  const taskMessage = bibliographyTaskMessage(bibliographyTask, t, citationCount)

  return (
    <div className={baseClass}>
      {taskMessage ? <span>{taskMessage}</span> : null}
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
    </div>
  )
}
