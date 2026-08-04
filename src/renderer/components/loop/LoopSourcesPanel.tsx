import { useTranslation } from 'react-i18next'
import type { AuditReport } from '../../../engine/manuscript/types'
import { useManuscriptAuditStore, type AuditStep } from '../../stores/manuscript-audit-store'
import { useOuroborosLoopStore } from '../../stores/ouroboros-loop-store'
import { useShellStore } from '../../stores/shell-store'
import LoopAuditDetail from './LoopAuditDetail'
import SharhLitePanel from './SharhLitePanel'

interface LoopSourcesPanelProps {
  report: AuditReport | null
  running: boolean
  step: AuditStep
  auditProgress: { processed: number; total: number } | null
  onReaudit: (bibKey: string) => void
}

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

export default function LoopSourcesPanel({
  report,
  running,
  step,
  auditProgress,
  onReaudit
}: LoopSourcesPanelProps) {
  const { t } = useTranslation()

  const unpaywallEmail = useManuscriptAuditStore((s) => s.unpaywallEmail)
  const openSettingsModal = useShellStore((s) => s.openSettingsModal)
  const selectedBibKey = useOuroborosLoopStore((s) => s.selectedBibKey)
  const setSelectedBibKey = useOuroborosLoopStore((s) => s.setSelectedBibKey)

  const findings = report?.findings ?? []
  const selectedFinding = findings.find((f) => f.bibKey === selectedBibKey) ?? null

  return (
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
              <thead className="sticky top-0 z-10 border-b border-border bg-background text-start text-xs text-muted-foreground shadow-[0_1px_0_0_hsl(var(--border))] rtl:text-end">
                <tr className="rtl:[&>th:last-child]:text-start">
                  <th className="bg-background px-3 py-2 font-medium">{t('loop.colReference')}</th>
                  <th className="bg-background px-2 py-2 font-medium">{t('loop.colPassage')}</th>
                </tr>
              </thead>
              <tbody
                onKeyDown={(e) => {
                  if (findings.length === 0) return
                  const idx = findings.findIndex((f) => f.bibKey === selectedBibKey)
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    const next = findings[Math.min(findings.length - 1, Math.max(0, idx) + 1)]
                    if (next) setSelectedBibKey(next.bibKey)
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    const prev = findings[Math.max(0, (idx < 0 ? 0 : idx) - 1)]
                    if (prev) setSelectedBibKey(prev.bibKey)
                  } else if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    if (selectedBibKey) {
                      document.getElementById('loop-audit-detail')?.focus()
                    }
                  }
                }}
              >
                {findings.map((f, index) => {
                  const label =
                    f.resolvedItem?.title?.slice(0, 72) ||
                    f.evidence[0]?.text?.slice(0, 72) ||
                    f.bibKey
                  const active = f.bibKey === selectedBibKey
                  return (
                    <tr
                      key={f.bibKey}
                      tabIndex={active || (!selectedBibKey && index === 0) ? 0 : -1}
                      role="row"
                      aria-selected={active}
                      className={`cursor-pointer border-t border-border outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? 'bg-accent/50' : 'hover:bg-muted/40'}`}
                      onClick={() => setSelectedBibKey(f.bibKey)}
                      onFocus={() => setSelectedBibKey(f.bibKey)}
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
            {running ? (
              <div className="flex h-full flex-col justify-center gap-2 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{t('loop.auditInProgressTitle')}</p>
                <p>
                  {t('loop.auditInProgressBody', {
                    phase: t(`manuscriptAudit.phase.${step}`),
                    progress:
                      auditProgress && auditProgress.total > 0
                        ? ` · ${t('manuscriptAudit.progress', {
                            processed: auditProgress.processed,
                            total: auditProgress.total
                          })}`
                        : ''
                  })}
                </p>
              </div>
            ) : step === 'done' ? (
              <div className="flex h-full min-h-0 flex-col overflow-hidden">
                <div className="min-h-0 flex-1 overflow-hidden" id="loop-audit-detail" tabIndex={-1}>
                  <LoopAuditDetail finding={selectedFinding} onReaudit={onReaudit} />
                </div>
                <div className="max-h-[40%] shrink-0 overflow-auto">
                  <SharhLitePanel report={report} />
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center p-4 text-sm text-muted-foreground">
                <p>{t('loop.auditDetailLocked')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}