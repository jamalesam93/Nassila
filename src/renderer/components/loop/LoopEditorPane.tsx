import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { segmentManuscriptText } from '../../../engine/manuscript/segments'
import { useAppCommands } from '../../hooks/use-app-commands'
import { useBibliographyBridge } from '../../hooks/use-bibliography-bridge'
import { pushToast } from '../../lib/notify'
import { useCitationStore } from '../../stores/citation-store'
import { useManuscriptAuditStore } from '../../stores/manuscript-audit-store'
import { useShellStore } from '../../stores/shell-store'
import { previewManuscript } from '../../utils/manuscript-preview'
import ManuscriptSanadBar from './ManuscriptSanadBar'

interface LoopEditorPaneProps {
  running: boolean
  onRun: () => void
  onCancel: () => void
}

export default function LoopEditorPane({ running, onRun, onCancel }: LoopEditorPaneProps) {
  const { t } = useTranslation()

  const raw = useManuscriptAuditStore((s) => s.rawManuscriptText)
  const setRaw = useManuscriptAuditStore((s) => s.setRawManuscriptText)
  const report = useManuscriptAuditStore((s) => s.report)
  const step = useManuscriptAuditStore((s) => s.step)
  const auditProgress = useManuscriptAuditStore((s) => s.auditProgress)
  const importProgress = useManuscriptAuditStore((s) => s.importProgress)
  const error = useManuscriptAuditStore((s) => s.error)
  const networkStatus = useCitationStore((s) => s.networkStatus)
  const auditReferenceSource = useManuscriptAuditStore((s) => s.auditReferenceSource)
  const setAuditReferenceSource = useManuscriptAuditStore((s) => s.setAuditReferenceSource)
  const setAppSurface = useShellStore((s) => s.setAppSurface)
  const bibliographyCount = useCitationStore((s) => s.citations.length)
  const manuscriptSourceFormat = useManuscriptAuditStore((s) => s.manuscriptSourceFormat)
  const selectedTemplateId = useManuscriptAuditStore((s) => s.selectedTemplateId)
  const setSelectedTemplateId = useManuscriptAuditStore((s) => s.setSelectedTemplateId)
  const templateStrict = useManuscriptAuditStore((s) => s.templateStrict)
  const setTemplateStrict = useManuscriptAuditStore((s) => s.setTemplateStrict)
  const templates = useManuscriptAuditStore((s) => s.templates)

  const { importManuscriptFromPath } = useAppCommands()
  const { exportManuscriptRefsToBibliography } = useBibliographyBridge()

  const [dragOver, setDragOver] = useState(false)
  const [bridgeMessage, setBridgeMessage] = useState<string | null>(null)

  const preview = useMemo(
    () =>
      previewManuscript(raw, {
        auditReferenceSource,
        bibliographyCount
      }),
    [auditReferenceSource, bibliographyCount, raw]
  )

  const hasEmbeddedReferences = useMemo(() => {
    if (!raw.trim()) return false
    return Boolean(segmentManuscriptText(raw).referencesText?.trim())
  }, [raw])

  const handleExportRefs = useCallback(async () => {
    setBridgeMessage(null)
    const result = await exportManuscriptRefsToBibliography(raw)
    if (!result.ok) {
      if (result.reason === 'no_references') {
        setBridgeMessage(t('loop.previewNoReferences'))
      } else if (result.reason === 'no_parsed_items') {
        setBridgeMessage(t('loop.exportRefsNoItems'))
      }
      return
    }
    setBridgeMessage(t('loop.exportRefsDone', { count: result.count }))
    pushToast('success', t('notifications.bridgeComplete', { count: result.count }))
  }, [exportManuscriptRefsToBibliography, raw, t])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const path = (e.dataTransfer.files[0] as File & { path?: string })?.path
      if (path) void importManuscriptFromPath(path)
    },
    [importManuscriptFromPath]
  )

  return (
    <section className="flex min-h-0 flex-col border-b border-border lg:w-[42%] lg:border-b-0 lg:border-e">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-2 rtl:flex-row-reverse">
        <ManuscriptSanadBar />
        {running ? (
          <button
            type="button"
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
            onClick={() => onCancel()}
          >
            {t('manuscriptAudit.cancel')}
          </button>
        ) : null}
      </div>

      {running ? (
        <p className="shrink-0 border-b border-border bg-muted/30 px-3 py-2 text-sm">
          {t('manuscriptAudit.phase.' + step)}
          {auditProgress && auditProgress.total > 0 ? (
            <span className="ms-2 rounded-md bg-background px-2 py-0.5 text-xs font-medium text-foreground">
              {t('manuscriptAudit.progress', {
                processed: auditProgress.processed,
                total: auditProgress.total
              })}
            </span>
          ) : null}
        </p>
      ) : null}

      {importProgress ? (
        <p className="shrink-0 border-b border-border bg-muted/30 px-3 py-2 text-sm" role="status" aria-live="polite">
          {importProgress.phase === 'reading'
            ? t('manuscriptAudit.importingReading')
            : importProgress.phase === 'checking'
              ? t('manuscriptAudit.importingChecking')
              : (() => {
                  const percent =
                    importProgress.total > 0
                      ? Math.min(
                          100,
                          Math.round((importProgress.processed / importProgress.total) * 100)
                        )
                      : 0
                  let eta = ''
                  if (
                    importProgress.processed > 0 &&
                    importProgress.total > importProgress.processed &&
                    importProgress.elapsedMs > 0
                  ) {
                    const msPerPage = importProgress.elapsedMs / importProgress.processed
                    const remainingMs = msPerPage * (importProgress.total - importProgress.processed)
                    const minutes = Math.max(1, Math.ceil(remainingMs / 60_000))
                    eta = t('manuscriptAudit.importingOcrEta', { minutes })
                  }
                  return (
                    <>
                      {t('manuscriptAudit.importingOcr', {
                        processed: importProgress.processed,
                        total: importProgress.total,
                        percent
                      })}
                      {eta}
                      {importProgress.total > 0 ? (
                        <span
                          className="mt-2 block h-1.5 overflow-hidden rounded-full bg-border"
                          aria-hidden
                        >
                          <span
                            className="block h-full rounded-full bg-primary transition-[width] duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </span>
                      ) : null}
                    </>
                  )
                })()}
        </p>
      ) : null}

      {error ? (
        <p className="shrink-0 border-b border-border bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {networkStatus === 'offline' ? (
        <p className="shrink-0 border-b border-border bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          {t('loop.offlineHint')}
        </p>
      ) : null}

      {!report && !running && !raw.trim() ? (
        <p className="shrink-0 border-b border-border px-3 py-2 text-sm text-muted-foreground">
          {t('loop.intro')}
        </p>
      ) : null}

      {!report && !running && preview.ok ? (
        <p className="shrink-0 border-b border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          {t('loop.bibliographyFirstHint')}{' '}
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => setAppSurface('bibliography')}
          >
            {t('loop.openBibliography')}
          </button>
        </p>
      ) : null}

      {!report && !running && hasEmbeddedReferences ? (
        <div className="shrink-0 border-b border-border px-3 py-2">
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
            disabled={running}
            onClick={() => void handleExportRefs()}
          >
            {t('loop.exportRefsToBibliography')}
          </button>
          {bridgeMessage ? (
            <p className="mt-1 text-xs text-muted-foreground">{bridgeMessage}</p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">{t('loop.exportRefsHint')}</p>
          )}
        </div>
      ) : null}

      {!report && !running && bibliographyCount > 0 ? (
        <label className="flex shrink-0 cursor-pointer items-start gap-2 border-b border-border px-3 py-2 text-xs rtl:flex-row-reverse">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={auditReferenceSource === 'bibliography'}
            disabled={running}
            onChange={(e) => setAuditReferenceSource(e.target.checked ? 'bibliography' : 'manuscript')}
          />
          <span>
            <span className="font-medium text-foreground">{t('loop.useBibliographyForAudit')}</span>
            <span className="mt-0.5 block text-muted-foreground">
              {t('loop.useBibliographyForAuditHint', { count: bibliographyCount })}
            </span>
          </span>
        </label>
      ) : null}

      <div
        className={`relative min-h-0 flex-1 p-3 ${dragOver ? 'bg-accent/40' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <textarea
          className="font-prose h-full min-h-[160px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed"
          dir="auto"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault()
              if (preview.ok && !running) onRun()
            }
          }}
          placeholder={t('manuscriptAudit.editorPlaceholder')}
          disabled={running}
        />
      </div>

      <footer className="flex shrink-0 flex-wrap items-center gap-3 border-t border-border px-3 py-2 rtl:flex-row-reverse">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {manuscriptSourceFormat ? (
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-foreground">
              {manuscriptSourceFormat}
            </span>
          ) : null}
          {!preview.ok && preview.reason === 'empty' ? t('loop.previewEmpty') : null}
          {!preview.ok && preview.reason === 'no_references' ? t('loop.previewNoReferences') : null}
          {!preview.ok && preview.reason === 'no_intext_cites' ? t('loop.previewNoInTextCites') : null}
          {preview.ok ? (
            <span>
              {t('loop.previewStats', {
                words: preview.wordCount,
                cites: preview.inTextCitationCount
              })}
              {preview.referenceSource === 'bibliography'
                ? ` · ${t('loop.previewBibliographySource')}`
                : null}
            </span>
          ) : null}
          {templates.length > 0 ? (
            <div className="ms-auto flex items-center gap-2">
              <select
                className="rounded border border-input bg-background px-1.5 py-0.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={selectedTemplateId}
                disabled={running}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                title={t('manuscriptAudit.structureTitle')}
              >
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1 cursor-pointer" title={t('manuscriptAudit.strictMode')}>
                <input
                  type="checkbox"
                  checked={templateStrict}
                  disabled={running}
                  onChange={(e) => setTemplateStrict(e.target.checked)}
                  className="rounded border-input text-xs"
                />
                <span className="text-[11px] text-muted-foreground">{t('manuscriptAudit.strictMode')}</span>
              </label>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          disabled={running || !preview.ok}
          onClick={onRun}
        >
          {running ? t('loop.running') : t('loop.runAudit')}
        </button>
      </footer>
    </section>
  )
}