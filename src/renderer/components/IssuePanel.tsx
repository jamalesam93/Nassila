import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useCitationStore, type CitationStatus } from '../stores/citation-store'
import { useShellStore } from '../stores/shell-store'
import { requestConfirm } from '../stores/confirm-store'
import type { PredatoryFlag } from '../../engine/types'
import type { LayerVerdict } from '../../engine/manuscript/types'
import type { OutputListFilter } from '../utils/output-filters'
import { getCitationStatus } from '../utils/output-filters'
import { setPredatoryListCache } from '../../engine/predatory/list-store'
import { duplicateColors } from '../utils/duplicate-colors'
import { SeverityIcon } from './ui/severity-icon'
import { citationRowId, scrollToCitationRow } from '../utils/citation-row-dom'

function predatoryExplanation(flag: PredatoryFlag, t: (k: string, opts?: Record<string, unknown>) => string): string {
  switch (flag.matchedOn) {
    case 'issn':
      return t('predatoryPanel.matchedIssn', {
        value: flag.matchedValue,
        name: flag.sourceEntry.name ?? '—'
      })
    case 'name':
      return t('predatoryPanel.matchedName', { value: flag.matchedValue })
    case 'publisher':
      return t('predatoryPanel.matchedPublisher', { value: flag.matchedValue })
    case 'fuzzy-name':
      return t('predatoryPanel.matchedFuzzy', {
        value: flag.matchedValue,
        name: flag.sourceEntry.name ?? '—'
      })
    default:
      return flag.matchedValue
  }
}

function formatLayerVerdict(t: (k: string) => string, v: LayerVerdict): string {
  switch (v.status) {
    case 'pass':
      return t('issuePanel.layerPass')
    case 'fail':
      return t('issuePanel.layerFail')
    case 'warn':
      return t('issuePanel.layerWarn')
    case 'insufficient_evidence':
      return t('issuePanel.layerInsufficient')
    case 'skipped':
      return t('issuePanel.layerSkipped')
    default:
      return v.status
  }
}

function layerDetailText(v: LayerVerdict): string {
  if (v.status === 'fail' || v.status === 'warn') return v.reasons.join(' · ')
  if (v.status === 'insufficient_evidence') return v.reason
  if (v.status === 'skipped' && v.reason !== 'not_applicable') return v.reason
  return ''
}

export default function IssuePanel() {
  const { t } = useTranslation()
  const openRaqimWithFilter = useShellStore((s) => s.openRaqimWithFilter)
  const issues = useCitationStore((s) => s.issues)
  const mismatches = useCitationStore((s) => s.verificationMismatches)
  const duplicates = useCitationStore((s) => s.duplicates)
  const citations = useCitationStore((s) => s.citations)
  const citationStatuses = useCitationStore((s) => s.citationStatuses)
  const duplicateGroupByCitation = useCitationStore((s) => s.duplicateGroupByCitation)
  const registryLayerByCitationId = useCitationStore((s) => s.registryLayerByCitationId)
  const deleteCitation = useCitationStore((s) => s.deleteCitation)
  const keepDuplicateCitation = useCitationStore((s) => s.keepDuplicateCitation)
  const predatoryFlags = useCitationStore((s) => s.predatoryFlags)
  const predatoryUpdateAvailable = useCitationStore((s) => s.predatoryUpdateAvailable)
  const predatoryListMeta = useCitationStore((s) => s.predatoryListMeta)
  const networkStatus = useCitationStore((s) => s.networkStatus)
  const dismissPredatoryCitation = useCitationStore((s) => s.dismissPredatoryCitation)
  const setPredatoryListMeta = useCitationStore((s) => s.setPredatoryListMeta)
  const setPredatoryUpdateAvailable = useCitationStore((s) => s.setPredatoryUpdateAvailable)
  const registryKeyCount = Object.keys(registryLayerByCitationId).length
  const totalCount =
    issues.length + mismatches.length + duplicates.length + registryKeyCount + predatoryFlags.length

  const statusBadges = useMemo(
    () =>
      ({
        pending: null,
        'has-issues': {
          bg: 'bg-red-100 dark:bg-red-900/40',
          text: 'text-red-700 dark:text-red-300',
          label: t('citationUi.needsFix')
        },
        fixed: {
          bg: 'bg-green-100 dark:bg-green-900/40',
          text: 'text-green-700 dark:text-green-300',
          label: t('citationUi.fixed')
        },
        'partially-fixed': {
          bg: 'bg-amber-100 dark:bg-amber-900/40',
          text: 'text-amber-700 dark:text-amber-300',
          label: t('citationUi.partiallyFixed')
        }
      }) satisfies Record<
        CitationStatus,
        { bg: string; text: string; label: string } | null
      >,
    [t]
  )

  const firstAuthorLabel = (
    item: { author?: { family?: string; given?: string; literal?: string }[] }
  ) => {
    const first = item.author?.[0]
    return first?.literal ?? first?.family ?? t('issuePanel.unknownAuthor')
  }

  const getStatus = (citationId: string): CitationStatus => {
    return (
      citationStatuses[citationId] ??
      (issues.some((i) => i.citationId === citationId) ? 'has-issues' : 'pending')
    )
  }

  const issuesByCitation = new Map<string, typeof issues>()
  for (const issue of issues) {
    const existing = issuesByCitation.get(issue.citationId) ?? []
    existing.push(issue)
    issuesByCitation.set(issue.citationId, existing)
  }

  const citationsWithIssues = citations.filter(
    (c) =>
      issuesByCitation.has(c.id) ||
      citationStatuses[c.id] === 'fixed' ||
      citationStatuses[c.id] === 'partially-fixed'
  )

  const citationIdsWithIssuePanelRow = useMemo(
    () => new Set(citationsWithIssues.map((c) => c.id)),
    [citationsWithIssues]
  )

  const registryOnlyCitations = useMemo(
    () =>
      citations.filter(
        (c) => registryLayerByCitationId[c.id] && !citationIdsWithIssuePanelRow.has(c.id)
      ),
    [citations, citationIdsWithIssuePanelRow, registryLayerByCitationId]
  )

  const fixedCount = Object.values(citationStatuses).filter((s) => s === 'fixed').length
  const partialCount = Object.values(citationStatuses).filter((s) => s === 'partially-fixed').length
  const errorCount = Object.values(citationStatuses).filter((s) => s === 'has-issues').length

  const tasnifCounts = useMemo(() => {
    const duplicateIds = new Set(Object.keys(duplicateGroupByCitation))
    const predatoryIds = new Set(predatoryFlags.map((f) => f.citationId))
    let issueRowCount = 0
    for (const c of citations) {
      const status = getCitationStatus(c.id, citationStatuses, issues)
      if (status === 'has-issues' || issues.some((i) => i.citationId === c.id)) {
        issueRowCount++
      }
    }
    return {
      duplicates: duplicateIds.size,
      predatory: predatoryIds.size,
      issues: issueRowCount
    }
  }, [citations, citationStatuses, duplicateGroupByCitation, issues, predatoryFlags])

  const tasnifRows: { filter: OutputListFilter; count: number; titleKey: string }[] = [
    { filter: 'duplicates', count: tasnifCounts.duplicates, titleKey: 'tasnif.duplicatesTitle' },
    { filter: 'predatory', count: tasnifCounts.predatory, titleKey: 'tasnif.predatoryTitle' },
    { filter: 'issues', count: tasnifCounts.issues, titleKey: 'tasnif.issuesTitle' }
  ]

  return (
    <div className="flex flex-col">
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{t('panels.issues')}</h2>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{t('issuePanel.panelSubtitle')}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {fixedCount > 0 && (
            <span className="rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-300">
              {t('issuePanel.fixedCount', { count: fixedCount })}
            </span>
          )}
          {partialCount > 0 && (
            <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
              {t('issuePanel.partialCount', { count: partialCount })}
            </span>
          )}
          {predatoryFlags.length > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                predatoryFlags.some((f) => f.tier === 'predatory')
                  ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200'
                  : 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200'
              }`}
            >
              {t('predatoryPanel.flaggedCount', { count: predatoryFlags.length })}
            </span>
          )}
          {totalCount === 0 && fixedCount === 0 && partialCount === 0 && errorCount === 0 && null}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {citations.length > 0 && tasnifRows.some((row) => row.count > 0) ? (
          <div className="border-b border-border px-3 py-2">
            <p className="text-xs font-medium text-foreground">{t('tasnif.drawerTitle')}</p>
            <ul className="mt-2 divide-y divide-border rounded-md border border-border">
              {tasnifRows.map((row) =>
                row.count > 0 ? (
                  <li key={row.filter}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-3 py-2 text-start hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => openRaqimWithFilter(row.filter)}
                    >
                      <span className="min-w-[2rem] text-sm font-semibold tabular-nums">{row.count}</span>
                      <span className="flex-1 text-xs font-medium">{t(row.titleKey)}</span>
                      <span className="text-xs text-primary">{t('tasnif.viewInRaqim')}</span>
                    </button>
                  </li>
                ) : null
              )}
            </ul>
          </div>
        ) : null}

        {citationsWithIssues.length === 0 &&
        mismatches.length === 0 &&
        duplicates.length === 0 &&
        predatoryFlags.length === 0 &&
        registryKeyCount === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
            <p className="text-xs font-medium text-foreground">{t('issuePanel.queueEmptyTitle')}</p>
            <p className="max-w-[18rem] text-[11px] leading-relaxed text-muted-foreground">
              {t('issuePanel.queueEmptyHint')}
            </p>
            <p className="text-xs text-muted-foreground/80">{t('issuePanel.noIssues')}</p>
          </div>
        ) : (
          <div className="space-y-2 px-3 py-2">
            {predatoryUpdateAvailable && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2">
                <p className="text-[11px] text-foreground/90">{t('predatoryPanel.updateAvailableBanner')}</p>
                <button
                  type="button"
                  className="shrink-0 rounded border border-border bg-background px-2 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
                  disabled={networkStatus !== 'online'}
                  onClick={() => {
                    void (async () => {
                      try {
                        if (!window.api?.predatory) return
                        const { meta, list } = await window.api.predatory.applyUpdate()
                        setPredatoryListCache(list)
                        setPredatoryListMeta(meta)
                        setPredatoryUpdateAvailable(false)
                      } catch {
                        /* ignore */
                      }
                    })()
                  }}
                >
                  {t('predatoryPanel.updateNow')}
                </button>
              </div>
            )}
            {registryKeyCount > 0 && (
              <p className="rounded-md border border-border/80 bg-muted/20 px-2 py-1.5 text-xs leading-snug text-muted-foreground">
                {t('issuePanel.registryLegend')}
              </p>
            )}

            {registryOnlyCitations.map((citation) => {
              const layer = registryLayerByCitationId[citation.id]
              if (!layer) return null
              const title = citation.title
                ? citation.title.length > 60
                  ? citation.title.slice(0, 60) + '...'
                  : citation.title
                : citation.id
              const l1t = formatLayerVerdict(t, layer.l1)
              const l2t = formatLayerVerdict(t, layer.l2)
              const d1 = layerDetailText(layer.l1)
              const d2 = layerDetailText(layer.l2)
              return (
                <div key={`reg-${citation.id}`} className="rounded-md border border-border bg-card overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-muted/30">
                    <p className="text-[11px] font-medium text-foreground truncate">{title}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {t('issuePanel.registrySource', { source: layer.source })}
                    </span>
                  </div>
                  <div className="space-y-1 px-3 py-1.5 text-xs text-foreground/85">
                    <p>
                      <span className="font-semibold text-muted-foreground">L1</span> {l1t}
                      {d1 ? ` — ${d1}` : ''}
                    </p>
                    <p>
                      <span className="font-semibold text-muted-foreground">L2</span> {l2t}
                      {d2 ? ` — ${d2}` : ''}
                    </p>
                  </div>
                </div>
              )
            })}

            {citationsWithIssues.map((citation) => {
              const status = getStatus(citation.id)
              const badge = statusBadges[status]
              const citIssues = issuesByCitation.get(citation.id) ?? []
              const title = citation.title
                ? citation.title.length > 60
                  ? citation.title.slice(0, 60) + '...'
                  : citation.title
                : citation.id

              return (
                <div key={citation.id} className="rounded-md border border-border bg-card overflow-hidden">
                  <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-muted/30">
                    <p className="text-[11px] font-medium text-foreground truncate">{title}</p>
                    {badge && (
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                    )}
                  </div>
                  {status === 'fixed' ? (
                    <div className="px-3 py-1.5">
                      <p className="text-xs text-green-600 dark:text-green-400">{t('issuePanel.allResolved')}</p>
                    </div>
                  ) : citIssues.length > 0 ? (
                    <div className="space-y-0.5 px-3 py-1.5">
                      {citIssues.map((issue) => (
                        <div key={issue.id} className="flex items-start gap-1.5">
                          <SeverityIcon severity={issue.severity} className="mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] text-foreground/80">{issue.message}</p>
                            {issue.field && (
                              <p className="text-xs text-muted-foreground">
                                {t('issuePanel.fieldLabel', { field: issue.field })}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : registryLayerByCitationId[citation.id] ? (
                    <div className="space-y-1 px-3 py-1.5 text-xs text-foreground/85">
                      <p className="text-xs text-muted-foreground">
                        {t('issuePanel.registrySource', {
                          source: registryLayerByCitationId[citation.id]!.source
                        })}
                      </p>
                      <p>
                        <span className="font-semibold text-muted-foreground">L1</span>{' '}
                        {formatLayerVerdict(t, registryLayerByCitationId[citation.id]!.l1)}
                        {layerDetailText(registryLayerByCitationId[citation.id]!.l1)
                          ? ` — ${layerDetailText(registryLayerByCitationId[citation.id]!.l1)}`
                          : ''}
                      </p>
                      <p>
                        <span className="font-semibold text-muted-foreground">L2</span>{' '}
                        {formatLayerVerdict(t, registryLayerByCitationId[citation.id]!.l2)}
                        {layerDetailText(registryLayerByCitationId[citation.id]!.l2)
                          ? ` — ${layerDetailText(registryLayerByCitationId[citation.id]!.l2)}`
                          : ''}
                      </p>
                    </div>
                  ) : null}
                </div>
              )
            })}

            {mismatches.map((m) => {
              const cite = citations.find((c) => c.id === m.citationId)
              const citeTitle = cite?.title ?? t('issuePanel.mismatchUnknownCitation')
              return (
                <button
                  key={m.id}
                  type="button"
                  className="w-full rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-left transition hover:border-yellow-600/50 hover:bg-yellow-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => scrollToCitationRow(m.citationId)}
                  aria-label={t('issuePanel.mismatchJumpAria', { title: citeTitle, field: m.field })}
                >
                  <div className="flex items-start gap-2">
                    <SeverityIcon severity="warning" className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground/90" title={citeTitle}>
                        {citeTitle}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {cite ? firstAuthorLabel(cite) : m.citationId}
                        {cite?.issued?.['date-parts']?.[0]?.[0] != null &&
                          ` · ${cite.issued['date-parts'][0][0]}`}
                      </p>
                      <p className="mt-1 text-xs font-medium text-yellow-700 dark:text-yellow-400">
                        {t('issuePanel.mismatchField', { field: m.field })}
                      </p>
                      <p className="mt-0.5 text-xs text-yellow-700/75 dark:text-yellow-400/75">
                        {t('issuePanel.yours', { value: m.userValue })}
                      </p>
                      <p className="text-xs text-yellow-700/75 dark:text-yellow-400/75">
                        {t('issuePanel.canonical', { source: m.source, value: m.canonicalValue })}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground underline-offset-2 hover:underline">
                        {t('issuePanel.mismatchJumpHint')}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}

            {predatoryFlags.map((flag) => {
              const cite = citations.find((c) => c.id === flag.citationId)
              const citationIndex = citations.findIndex((c) => c.id === flag.citationId)
              const rawTitle = cite?.title
              const title =
                rawTitle && rawTitle.length > 60 ? `${rawTitle.slice(0, 60)}…` : (rawTitle ?? flag.citationId)
              const tierIsPred = flag.tier === 'predatory'
              return (
                <div
                  key={flag.id}
                  className={`rounded-md border px-3 py-2 ${
                    tierIsPred
                      ? 'border-red-500/40 bg-red-500/10'
                      : 'border-amber-500/40 bg-amber-500/10'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 text-xs font-bold ${
                        tierIsPred ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      ⚑
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="truncate text-xs font-medium text-foreground">{title}</p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                            tierIsPred
                              ? 'bg-red-200/80 text-red-900 dark:bg-red-900/50 dark:text-red-100'
                              : 'bg-amber-200/80 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100'
                          }`}
                        >
                          {tierIsPred ? t('predatoryPanel.tierPredatory') : t('predatoryPanel.tierSuspicious')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {cite ? firstAuthorLabel(cite) : flag.citationId}
                        {cite?.issued?.['date-parts']?.[0]?.[0] != null &&
                          ` · ${cite.issued['date-parts'][0][0]}`}
                      </p>
                      <p className="mt-1 text-[11px] text-foreground/85">{predatoryExplanation(flag, t)}</p>
                      {flag.sourceEntry.reason ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">{flag.sourceEntry.reason}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t('predatoryPanel.source', {
                          origin:
                            predatoryListMeta?.origin === 'downloaded'
                              ? t('predatoryUpdates.originDownloaded')
                              : t('predatoryUpdates.originBundled'),
                          version: predatoryListMeta?.version ?? '—'
                        })}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
                          onClick={() => {
                            const rowId =
                              citationIndex >= 0
                                ? citationRowId(flag.citationId, citationIndex)
                                : citationRowId(flag.citationId)
                            document.getElementById(rowId)?.scrollIntoView({
                              behavior: 'smooth',
                              block: 'center'
                            })
                          }}
                        >
                          {t('issuePanel.mismatchJumpHint')}
                        </button>
                        <button
                          type="button"
                          className="rounded px-2 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted"
                          onClick={() => dismissPredatoryCitation(flag.citationId)}
                        >
                          {t('predatoryPanel.keep')}
                        </button>
                        <button
                          type="button"
                          className="rounded px-2 py-0.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                          onClick={() =>
                            deleteCitation(
                              flag.citationId,
                              citationIndex >= 0 ? citationIndex : undefined
                            )
                          }
                        >
                          {t('predatoryPanel.delete')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {duplicates.map((dup) => (
              <div
                key={dup.id}
                className={`rounded-md border px-3 py-2 ${duplicateColors(
                  duplicateGroupByCitation[dup.items[0]?.id ?? '']?.colorIndex ?? 0
                ).card}`}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 text-xs font-bold ${
                      duplicateColors(duplicateGroupByCitation[dup.items[0]?.id ?? '']?.colorIndex ?? 0).text
                    }`}
                  >
                    ⊜
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-medium ${
                        duplicateColors(duplicateGroupByCitation[dup.items[0]?.id ?? '']?.colorIndex ?? 0).text
                      }`}
                    >
                      {t('issuePanel.potentialDuplicate', {
                        count: dup.items.length,
                        similarity: Math.round(dup.similarityScore * 100)
                      })}
                    </p>
                    {dup.items.map((item) => (
                      <div
                        key={item.id}
                        className="mt-1 rounded border border-border/70 bg-background/70 px-2 py-1"
                        onMouseEnter={() => {
                          const citationIndex = citations.findIndex((c) => c === item)
                          const rowId =
                            citationIndex >= 0
                              ? citationRowId(item.id, citationIndex)
                              : citationRowId(item.id)
                          document.getElementById(rowId)?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                          })
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-foreground">
                              {item.title ?? item.id}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {firstAuthorLabel(item)}
                              {item.issued?.['date-parts']?.[0]?.[0] &&
                                ` · ${item.issued['date-parts'][0][0]}`}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col gap-0.5">
                            <button
                              className="rounded px-1.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/10"
                              onClick={(e) => {
                                e.stopPropagation()
                                void (async () => {
                                  const citationIndex = citations.findIndex((c) => c === item)
                                  if (dup.items.length > 2) {
                                    const ok = await requestConfirm(
                                      t('outputPanel.keepEntryConfirm', {
                                        count: dup.items.length - 1
                                      })
                                    )
                                    if (!ok) return
                                  }
                                  keepDuplicateCitation(
                                    item.id,
                                    citationIndex >= 0 ? citationIndex : undefined
                                  )
                                })()
                              }}
                              type="button"
                            >
                              {t('outputPanel.keepEntry')}
                            </button>
                            <button
                              className="rounded px-1.5 py-0.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation()
                                const citationIndex = citations.findIndex((c) => c === item)
                                deleteCitation(
                                  item.id,
                                  citationIndex >= 0 ? citationIndex : undefined
                                )
                              }}
                              type="button"
                            >
                              {t('issuePanel.delete')}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
