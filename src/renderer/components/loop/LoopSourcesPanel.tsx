import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AuditReport } from '../../../engine/manuscript/types'
import {
  matchPaperIdentity,
  targetsFromItems,
  type PaperMatch
} from '../../../engine/papers/match'
import { MAX_PAPERS_SCAN_FILES } from '../../../shared/papers-limits'
import { useManuscriptAuditStore, type AuditStep } from '../../stores/manuscript-audit-store'
import { useOuroborosLoopStore } from '../../stores/ouroboros-loop-store'
import { useShellStore } from '../../stores/shell-store'
import LoopAuditDetail from './LoopAuditDetail'
import SharhLitePanel from './SharhLitePanel'

interface PaperCandidate {
  path: string
  name: string
  sizeBytes: number
}

type AttachPapersPhase = 'idle' | 'scanning' | 'review'

interface AttachPapersReview {
  matches: (PaperMatch & { candidate: PaperCandidate })[]
}

interface LoopSourcesPanelProps {
  report: AuditReport | null
  running: boolean
  step: AuditStep
  auditProgress: { processed: number; total: number } | null
  onReaudit: (bibKeys: string[]) => void
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

function coverageLabelKey(coverage: string): string {
  switch (coverage) {
    case 'full_text_oa_europe_pmc':
      return 'loop.coverage.fullTextEpmc'
    case 'full_text_oa_unpaywall':
      return 'loop.coverage.fullTextOa'
    case 'full_text_attached_pdf':
      return 'loop.pdfAttached'
    case 'abstract_only_closed':
      return 'loop.coverage.abstractOnly'
    default:
      return 'loop.coverage.unavailable'
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

  const [papersPhase, setPapersPhase] = useState<AttachPapersPhase>('idle')
  const [papersReview, setPapersReview] = useState<AttachPapersReview | null>(null)
  const attachSourcePdf = useOuroborosLoopStore((s) => s.attachSourcePdf)

  const startAttachPapers = async () => {
    if (!window.api?.scanPapersFolder || !report || running) return
    setPapersPhase('scanning')
    try {
      const scan = await window.api.scanPapersFolder()
      if (!scan.root || scan.files.length === 0) {
        setPapersPhase('idle')
        return
      }
      const targets = targetsFromItems(
        findings.map((f) => ({ bibKey: f.bibKey, item: f.resolvedItem }))
      )
      const files = scan.files.slice(0, MAX_PAPERS_SCAN_FILES)
      const matches: AttachPapersReview['matches'] = []
      for (const candidate of files) {
        try {
          const signals = await window.api.identifyPaperPdf(candidate.path)
          const match = matchPaperIdentity({ ...signals, fileName: candidate.name }, targets)
          matches.push({ ...match, candidate })
        } catch {
          matches.push({
            bibKeys: [],
            kind: 'unmatched',
            matchedBy: null,
            candidate
          })
        }
      }
      setPapersReview({ matches })
      setPapersPhase('review')
    } catch {
      setPapersPhase('idle')
    }
  }

  const confirmAttachPapers = async () => {
    if (!papersReview) return
    const matched = papersReview.matches.filter((m) => m.kind === 'matched' && m.bibKeys[0])
    for (const match of matched) {
      try {
        const artifact = await window.api?.attachSourcePdf(match.candidate.path)
        if (artifact) attachSourcePdf(match.bibKeys[0], artifact)
      } catch {
        // Skip failed attaches; the review list can be re-run.
      }
    }
    setPapersPhase('idle')
    setPapersReview(null)
    onReaudit(matched.map((m) => m.bibKeys[0]))
  }

  const cancelAttachPapers = () => {
    setPapersPhase('idle')
    setPapersReview(null)
  }

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
        {report && !running ? (
          papersPhase === 'idle' ? (
            <button
              type="button"
              className="mt-2 rounded border border-input bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-accent"
              onClick={() => void startAttachPapers()}
            >
              {t('loop.attachPapers')}
            </button>
          ) : null
        ) : null}
        {papersPhase === 'scanning' ? (
          <p className="mt-2 text-xs text-muted-foreground">{t('loop.attachPapersBusy')}</p>
        ) : null}
        {papersPhase === 'review' && papersReview ? (
          <div className="mt-2 space-y-1.5 border-s-2 border-border ps-3">
            <p className="text-xs text-muted-foreground">{t('loop.papersHint')}</p>
            {(['matched', 'ambiguous', 'unmatched'] as const).map((bucket) => {
              const rows = papersReview.matches.filter((m) => m.kind === bucket)
              if (rows.length === 0) return null
              return (
                <div key={bucket}>
                  <p className="text-[11px] font-semibold">{t(`loop.papersBucket.${bucket}`)}</p>
                  <ul className="mt-0.5 space-y-0.5">
                    {rows.map((row) => (
                      <li key={row.candidate.path} className="truncate text-xs text-muted-foreground">
                        <span className="font-mono">{row.candidate.name}</span>
                        {row.bibKeys.length > 0 ? (
                          <span> → {row.bibKeys.join(', ')}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
            {papersReview.matches.some((m) => m.kind === 'matched') ? (
              <div className="flex gap-1.5 pt-1">
                <button
                  type="button"
                  className="rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
                  onClick={() => void confirmAttachPapers()}
                >
                  {t('loop.papersConfirm', {
                    count: papersReview.matches.filter((m) => m.kind === 'matched').length
                  })}
                </button>
                <button
                  type="button"
                  className="rounded border border-input bg-background px-2 py-1 text-xs text-foreground hover:bg-accent"
                  onClick={cancelAttachPapers}
                >
                  {t('loop.papersCancel')}
                </button>
              </div>
            ) : (
              <div className="flex gap-1.5 pt-1">
                <p className="text-xs text-muted-foreground">{t('loop.papersNoneFound')}</p>
                <button
                  type="button"
                  className="rounded border border-input bg-background px-2 py-1 text-xs text-foreground hover:bg-accent"
                  onClick={cancelAttachPapers}
                >
                  {t('loop.papersCancel')}
                </button>
              </div>
            )}
          </div>
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
                  const claimRows =
                    f.citeSites?.flatMap((site) => site.claimGrounding ?? []) ?? []
                  const supported = claimRows.filter((c) => c.verdict === 'supported').length
                  const claimSummary =
                    claimRows.length > 0
                      ? t('loop.claimSummaryCompact', {
                          supported,
                          total: claimRows.length
                        })
                      : t(coverageLabelKey(f.l3Coverage))
                  const coverageNote =
                    f.l3Coverage === 'abstract_only_closed'
                      ? t('loop.coverage.abstractOnlyHint')
                      : null
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
                        <span className="mt-0.5 block text-[10px] text-muted-foreground">
                          {claimSummary}
                          {coverageNote ? ` · ${coverageNote}` : null}
                        </span>
                      </td>
                      <td className="px-2 py-2 align-top">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${statusDotClass(f.layers.passage.status)}`}
                          aria-label={`${f.layers.passage.status}; ${claimSummary}`}
                          title={`${f.layers.passage.status} · ${claimSummary}`}
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