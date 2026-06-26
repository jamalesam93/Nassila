import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppCommands } from '../../hooks/use-app-commands'
import { useManuscriptAudit } from '../../hooks/use-manuscript-audit'
import { useOuroborosLoopBootstrap } from '../../hooks/use-ouroboros-loop-bootstrap'
import { useCitationStore } from '../../stores/citation-store'
import { useManuscriptAuditStore, type AuditStep } from '../../stores/manuscript-audit-store'
import { useOuroborosLoopStore } from '../../stores/ouroboros-loop-store'
import { useShellStore } from '../../stores/shell-store'
import { previewManuscript } from '../../utils/manuscript-preview'
import LoopAuditDetail from './LoopAuditDetail'
import ManuscriptSanadBar from './ManuscriptSanadBar'

const RUNNING_STEPS: AuditStep[] = ['parsing', 'l1', 'l2', 'oa_fetch', 'l3', 'llm']

function statusDotClass(status: string): string {
  switch (status) {
    case 'pass':
      return 'bg-green-500'
    case 'fail':
      return 'bg-red-500'
    case 'warn':
      return 'bg-amber-500'
    default:
      return 'bg-muted-foreground/50'
  }
}

export default function OuroborosLoopWorkspace() {
  const { t } = useTranslation()
  useOuroborosLoopBootstrap()

  const raw = useManuscriptAuditStore((s) => s.rawManuscriptText)
  const setRaw = useManuscriptAuditStore((s) => s.setRawManuscriptText)
  const report = useManuscriptAuditStore((s) => s.report)
  const step = useManuscriptAuditStore((s) => s.step)
  const error = useManuscriptAuditStore((s) => s.error)
  const networkStatus = useCitationStore((s) => s.networkStatus)
  const unpaywallEmail = useManuscriptAuditStore((s) => s.unpaywallEmail)
  const openSettingsModal = useShellStore((s) => s.openSettingsModal)

  const selectedBibKey = useOuroborosLoopStore((s) => s.selectedBibKey)
  const setSelectedBibKey = useOuroborosLoopStore((s) => s.setSelectedBibKey)

  const { importManuscriptFromPath } = useAppCommands()
  const { runAudit, cancel } = useManuscriptAudit()

  const [dragOver, setDragOver] = useState(false)
  const running = RUNNING_STEPS.includes(step)

  const preview = useMemo(() => previewManuscript(raw), [raw])

  const findings = useMemo(() => report?.findings ?? [], [report?.findings])
  const selectedFinding = findings.find((f) => f.bibKey === selectedBibKey) ?? null

  useEffect(() => {
    if (findings.length === 0) {
      setSelectedBibKey(null)
      return
    }
    if (!selectedBibKey || !findings.some((f) => f.bibKey === selectedBibKey)) {
      setSelectedBibKey(findings[0]!.bibKey)
    }
  }, [findings, selectedBibKey, setSelectedBibKey])

  const handleRun = useCallback(() => {
    if (!raw.trim() || running) return
    void runAudit(raw)
  }, [raw, runAudit, running])

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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
      <section className="flex min-h-0 flex-col border-b border-border lg:w-[42%] lg:border-b-0 lg:border-e">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-2">
          <ManuscriptSanadBar />
          {running ? (
            <button
              type="button"
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
              onClick={() => cancel()}
            >
              {t('manuscriptAudit.cancel')}
            </button>
          ) : null}
        </div>

        {running ? (
          <p className="shrink-0 border-b border-border bg-muted/30 px-3 py-2 text-sm">
            {t('manuscriptAudit.phase.' + step)}
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
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={t('manuscriptAudit.editorPlaceholder')}
            disabled={running}
          />
        </div>

        <footer className="flex shrink-0 flex-wrap items-center gap-3 border-t border-border px-3 py-2">
          <div className="min-w-0 flex-1 text-xs text-muted-foreground">
            {!preview.ok && preview.reason === 'empty' ? t('loop.previewEmpty') : null}
            {!preview.ok && preview.reason === 'no_references' ? t('loop.previewNoReferences') : null}
            {preview.ok ? (
              <span>
                {t('loop.previewStats', {
                  words: preview.wordCount,
                  cites: preview.inTextCitationCount
                })}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={running || !preview.ok}
            onClick={handleRun}
          >
            {running ? t('loop.running') : t('loop.runAudit')}
          </button>
        </footer>
      </section>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-border px-4 py-2">
          <h3 className="text-sm font-semibold">{t('loop.sourcesTitle')}</h3>
          <p className="text-xs text-muted-foreground">{t('loop.sourcesHint')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('loop.pipelineGap')}</p>
          {!unpaywallEmail.trim() ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {t('loop.unpaywallHint')}{' '}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => openSettingsModal()}
              >
                {t('loop.unpaywallConfigure')}
              </button>
            </p>
          ) : null}
        </div>

        {!report && !running ? (
          <p className="p-4 text-sm text-muted-foreground">{t('loop.sourcesEmpty')}</p>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="max-h-[40%] min-h-0 shrink-0 overflow-auto border-b border-border lg:max-h-[45%]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 text-start text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t('loop.colReference')}</th>
                    <th className="px-2 py-2 font-medium">{t('loop.colPassage')}</th>
                  </tr>
                </thead>
                <tbody>
                  {findings.map((f) => {
                    const label =
                      f.resolvedItem?.title?.slice(0, 72) ||
                      f.evidence[0]?.text?.slice(0, 72) ||
                      f.bibKey
                    const active = f.bibKey === selectedBibKey
                    return (
                      <tr
                        key={f.bibKey}
                        className={`cursor-pointer border-t border-border ${active ? 'bg-accent/50' : 'hover:bg-muted/40'}`}
                        onClick={() => setSelectedBibKey(f.bibKey)}
                      >
                        <td className="px-3 py-2 align-top">
                          <span className="line-clamp-2 font-medium">{label}</span>
                        </td>
                        <td className="px-2 py-2 align-top">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${statusDotClass(f.layers.passage.status)}`}
                            aria-label={f.layers.passage.status}
                            title={f.layers.passage.status}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <LoopAuditDetail finding={selectedFinding} />
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
