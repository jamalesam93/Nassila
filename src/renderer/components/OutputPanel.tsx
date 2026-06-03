import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCitationStore, type CitationStatus } from '../stores/citation-store'
import { useCitationEngine } from '../hooks/use-citation-engine'
import { duplicateColors } from '../utils/duplicate-colors'
import {
  citationMatchesSearch,
  getCitationStatus,
  isGrayLitType,
  matchesOutputFilter,
  type OutputListFilter
} from '../utils/output-filters'
import type { CslDate } from '../../engine/types'
import { authorPreviewLimits } from '../utils/author-preview'

function formatAccessedForDisplay(accessed: CslDate): string {
  if (accessed.literal) return accessed.literal.trim()
  const parts = accessed['date-parts']?.[0]
  if (parts?.length) {
    const [y, m, d] = parts
    if (y != null && m != null && d != null) return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    if (y != null && m != null) return `${y}-${String(m).padStart(2, '0')}`
    if (y != null) return String(y)
  }
  if (accessed.raw) return accessed.raw
  return ''
}

function doiUrl(doi: string): string {
  const cleaned = doi
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')
    .trim()
    .replace(/[.)\s]+$/, '')
  return `https://doi.org/${cleaned}`
}

function citationRowId(id: string, index?: number): string {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, '-')
  return index !== undefined ? `citation-row-${index}-${safe}` : `citation-row-${safe}`
}

export default function OutputPanel() {
  const { t } = useTranslation()
  const [pendingDoiId, setPendingDoiId] = useState<string | null>(null)
  const [listFilter, setListFilter] = useState<OutputListFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const citations = useCitationStore((s) => s.citations)
  const selectedStyleId = useCitationStore((s) => s.selectedStyleId)
  const issues = useCitationStore((s) => s.issues)
  const citationStatuses = useCitationStore((s) => s.citationStatuses)
  const duplicateGroupByCitation = useCitationStore((s) => s.duplicateGroupByCitation)
  const predatoryByCitation = useCitationStore((s) => s.predatoryByCitation)
  const networkStatus = useCitationStore((s) => s.networkStatus)
  const deleteCitation = useCitationStore((s) => s.deleteCitation)
  const keepDuplicateCitation = useCitationStore((s) => s.keepDuplicateCitation)
  const { findMissingDoi } = useCitationEngine()

  const STATUS_STYLES = useMemo(
    () =>
      ({
        pending: { border: 'border-border', bg: 'bg-card', dot: 'bg-muted-foreground', label: '' },
        'has-issues': {
          border: 'border-red-400',
          bg: 'bg-red-50 dark:bg-red-950/30',
          dot: 'bg-red-500',
          label: t('citationUi.needsFix')
        },
        fixed: {
          border: 'border-green-400',
          bg: 'bg-green-50 dark:bg-green-950/30',
          dot: 'bg-green-500',
          label: t('citationUi.fixed')
        },
        'partially-fixed': {
          border: 'border-amber-400',
          bg: 'bg-amber-50 dark:bg-amber-950/30',
          dot: 'bg-amber-500',
          label: t('citationUi.partiallyFixed')
        }
      }) satisfies Record<CitationStatus, { border: string; bg: string; dot: string; label: string }>,
    [t]
  )

  const typeLabel = (tp: string) => t(`citationTypes.${tp}`, { defaultValue: tp })

  const filterCtx = useMemo(
    () => ({
      issues,
      citationStatuses,
      predatoryByCitation,
      duplicateGroupByCitation
    }),
    [issues, citationStatuses, predatoryByCitation, duplicateGroupByCitation]
  )

  const displayEntries = useMemo(
    () =>
      citations
        .map((item, index) => ({ item, index }))
        .filter(
          ({ item }) =>
            matchesOutputFilter(item, listFilter, filterCtx) &&
            citationMatchesSearch(item, searchQuery)
        ),
    [citations, listFilter, searchQuery, filterCtx]
  )

  const FILTER_OPTIONS: OutputListFilter[] = [
    'all',
    'issues',
    'predatory',
    'duplicates',
    'no-doi'
  ]

  const getStatus = (citationId: string): CitationStatus =>
    getCitationStatus(citationId, citationStatuses, issues)

  const statusCounts = citations.reduce(
    (acc, c) => {
      const s = getStatus(c.id)
      acc[s] = (acc[s] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-2 rtl:flex-row-reverse">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">{t('panels.output')}</h2>
          <p className="text-xs leading-snug text-muted-foreground">{t('outputPanel.panelSubtitle')}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-start justify-end gap-2">
          {citations.length > 0 && (
            <div className="flex items-center gap-2">
              {statusCounts.fixed > 0 && (
                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  {statusCounts.fixed}
                </span>
              )}
              {(statusCounts['partially-fixed'] ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  {statusCounts['partially-fixed']}
                </span>
              )}
              {statusCounts['has-issues'] > 0 && (
                <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  {statusCounts['has-issues']}
                </span>
              )}
            </div>
          )}
          {selectedStyleId && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {selectedStyleId}
            </span>
          )}
        </div>
      </div>

      {citations.length > 0 && (
        <div className="space-y-2 border-b border-border px-4 py-2">
          <div className="flex flex-wrap items-center gap-1.5 rtl:flex-row-reverse">
            {FILTER_OPTIONS.map((key) => (
              <button
                key={key}
                type="button"
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  listFilter === key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
                onClick={() => setListFilter(key)}
              >
                {t(`outputPanel.filter.${key}`)}
              </button>
            ))}
            <span className="ms-auto text-xs text-muted-foreground rtl:ms-0 rtl:me-auto">
              {t('outputPanel.filteredCount', {
                shown: displayEntries.length,
                total: citations.length
              })}
            </span>
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('outputPanel.searchPlaceholder')}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      <div className="flex-1 overflow-auto px-4 py-3">
        {citations.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{t('outputPanel.emptyTitle')}</p>
              <p className="mt-1 text-xs text-muted-foreground/70">{t('outputPanel.emptyHint')}</p>
              <p className="mt-2 text-[11px] text-muted-foreground/65">{t('outputPanel.emptyHeroLine')}</p>
            </div>
          </div>
        ) : displayEntries.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">{t('outputPanel.emptyFilter')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayEntries.map(({ item, index }) => {
              const status = getStatus(item.id)
              const styles = STATUS_STYLES[status]
              const itemIssues = issues.filter((i) => i.citationId === item.id)
              const duplicateMarker = duplicateGroupByCitation[item.id]
              const duplicateStyle = duplicateMarker ? duplicateColors(duplicateMarker.colorIndex) : null
              const predatoryFlag = predatoryByCitation[item.id]
              const accessedLabel = item.accessed ? formatAccessedForDisplay(item.accessed) : ''
              const authorCount = item.author?.length ?? 0
              const { maxShown, etAlThreshold } = authorPreviewLimits(selectedStyleId)

              return (
                <div
                  key={`${item.id}-${index}`}
                  id={citationRowId(item.id, index)}
                  className={`rounded-md border ${styles.border} ${styles.bg} p-3 transition-colors duration-300 ${duplicateStyle?.row ?? ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${styles.dot}`} />
                        <p className="text-sm font-medium text-foreground leading-snug">
                          {item.title ?? t('outputPanel.untitled')}
                        </p>
                      </div>
                      <p className="mt-1 ps-4 text-xs text-muted-foreground">
                        {(item.author ?? [])
                          .slice(0, maxShown)
                          .map((a) => (a.literal ?? `${a.family ?? ''}${a.given ? ', ' + a.given : ''}`).trim())
                          .join('; ')}
                        {authorCount >= etAlThreshold && t('citationUi.etAl')}
                        {item.issued?.['date-parts']?.[0]?.[0] &&
                          ` (${item.issued['date-parts'][0][0]})`}
                      </p>
                      {item['container-title'] && (
                        <p className="mt-0.5 ps-4 text-xs italic text-muted-foreground">
                          {item['container-title']}
                          {item.volume && `, ${item.volume}`}
                          {item.issue && `(${item.issue})`}
                          {item.page && `, ${item.page}`}
                        </p>
                      )}
                      {!item['container-title'] && item.publisher && (
                        <p className="mt-0.5 ps-4 text-xs text-muted-foreground">
                          {item.publisher}
                          {item['publisher-place'] && `, ${item['publisher-place']}`}
                        </p>
                      )}
                      {item.genre && (
                        <p className="mt-0.5 ps-4 text-xs text-muted-foreground/70">[{item.genre}]</p>
                      )}
                      {item['event-title'] && (
                        <p className="mt-0.5 ps-4 text-xs italic text-muted-foreground">{item['event-title']}</p>
                      )}
                      {item.URL && (
                        <p
                          className="mt-0.5 ps-4 text-xs text-blue-600 dark:text-blue-400 truncate"
                          title={item.URL}
                        >
                          {item.URL}
                        </p>
                      )}
                      {item.DOI && (
                        <a
                          className="mt-0.5 block truncate ps-4 text-xs text-green-700 underline-offset-2 hover:underline dark:text-green-300"
                          href={doiUrl(item.DOI)}
                          rel="noreferrer"
                          target="_blank"
                          title={doiUrl(item.DOI)}
                        >
                          {doiUrl(item.DOI)}
                        </a>
                      )}
                      <div className="mt-1 ps-4 flex flex-wrap items-center gap-1.5">
                        {duplicateMarker && duplicateStyle && (
                          <button
                            className={`rounded px-1.5 py-0.5 text-xs font-semibold ${duplicateStyle.chip}`}
                            onClick={() => {
                              const siblingId = duplicateMarker.siblingIds[0]
                              if (siblingId) {
                                const siblingIndex = citations.findIndex((c) => c.id === siblingId)
                                const rowId =
                                  siblingIndex >= 0
                                    ? citationRowId(siblingId, siblingIndex)
                                    : citationRowId(siblingId)
                                document.getElementById(rowId)?.scrollIntoView({
                                  behavior: 'smooth',
                                  block: 'center'
                                })
                              }
                            }}
                            title={t('outputPanel.scrollDuplicateTitle')}
                            type="button"
                          >
                            {t('outputPanel.matchPercent', {
                              pct: Math.round(duplicateMarker.similarityScore * 100)
                            })}
                          </button>
                        )}
                        {predatoryFlag && (
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                              predatoryFlag.tier === 'predatory'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
                            }`}
                            title={`${predatoryFlag.tier === 'predatory' ? t('predatoryPanel.tierPredatory') : t('predatoryPanel.tierSuspicious')}: ${predatoryFlag.matchedOn} · ${predatoryFlag.matchedValue}`}
                          >
                            {predatoryFlag.tier === 'predatory'
                              ? t('predatoryPanel.badgePredatory')
                              : t('predatoryPanel.badgeSuspicious')}
                          </span>
                        )}
                        {item.DOI && (
                          <span className="rounded bg-green-100 dark:bg-green-900/40 px-1.5 py-0.5 text-xs font-mono text-green-700 dark:text-green-300">
                            DOI
                          </span>
                        )}
                        {item.URL && (
                          <span className="rounded bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 text-xs font-mono text-blue-700 dark:text-blue-300">
                            URL
                          </span>
                        )}
                        {!item.DOI && !item.URL && status !== 'pending' && isGrayLitType(item.type) && (
                          <span className="rounded bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 text-xs font-mono text-red-700 dark:text-red-300">
                            {t('outputPanel.noLink')}
                          </span>
                        )}
                        {!item.DOI && !isGrayLitType(item.type) && status !== 'pending' && (
                          <>
                            <span className="rounded bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 text-xs font-mono text-red-700 dark:text-red-300">
                              {t('outputPanel.noDoi')}
                            </span>
                            <button
                              className="rounded border border-green-500/30 bg-green-500/10 px-1.5 py-0.5 text-xs font-medium text-green-700 hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-green-300"
                              disabled={networkStatus !== 'online' || pendingDoiId === item.id}
                              onClick={() => {
                                setPendingDoiId(item.id)
                                void findMissingDoi(item.id).finally(() => setPendingDoiId(null))
                              }}
                              title={
                                networkStatus === 'online'
                                  ? t('outputPanel.findDoiTitleOnline')
                                  : t('outputPanel.findDoiTitleOffline')
                              }
                              type="button"
                            >
                              {pendingDoiId === item.id ? t('outputPanel.findingDoi') : t('outputPanel.findDoi')}
                            </button>
                          </>
                        )}
                        {item.volume && (
                          <span className="rounded bg-green-100 dark:bg-green-900/40 px-1.5 py-0.5 text-xs font-mono text-green-700 dark:text-green-300">
                            {t('outputPanel.vol', { vol: item.volume })}
                          </span>
                        )}
                        {item.version && (
                          <span className="rounded bg-purple-100 dark:bg-purple-900/40 px-1.5 py-0.5 text-xs font-mono text-purple-700 dark:text-purple-300">
                            {t('outputPanel.versionChip', { v: item.version })}
                          </span>
                        )}
                        {item.accessed && (
                          <span
                            className="rounded bg-sky-100 dark:bg-sky-900/40 px-1.5 py-0.5 text-xs font-mono text-sky-700 dark:text-sky-300"
                            title={accessedLabel}
                          >
                            {t('outputPanel.accessed')}
                            {accessedLabel ? `: ${accessedLabel}` : ''}
                          </span>
                        )}
                        {styles.label && (
                          <span
                            className={`text-xs font-medium ${
                              status === 'fixed'
                                ? 'text-green-600 dark:text-green-400'
                                : status === 'partially-fixed'
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {styles.label}
                          </span>
                        )}
                      </div>
                      {itemIssues.length > 0 && status !== 'fixed' && (
                        <div className="mt-1.5 ps-4 space-y-0.5">
                          {itemIssues.slice(0, 3).map((issue) => (
                            <p key={issue.id} className="text-xs text-muted-foreground/80">
                              <span
                                className={
                                  issue.severity === 'error'
                                    ? 'text-red-500'
                                    : issue.severity === 'warning'
                                      ? 'text-amber-500'
                                      : 'text-blue-500'
                                }
                              >
                                {issue.severity === 'error' ? '●' : issue.severity === 'warning' ? '▲' : 'ℹ'}
                              </span>
                              {' '}
                              {issue.message}
                            </p>
                          ))}
                          {itemIssues.length > 3 && (
                            <p className="text-xs text-muted-foreground/60">
                              {t('outputPanel.moreIssues', { count: itemIssues.length - 3 })}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                          isGrayLitType(item.type)
                            ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300'
                            : 'bg-secondary text-secondary-foreground'
                        }`}
                      >
                        {typeLabel(item.type)}
                      </span>
                      {duplicateMarker && (
                        <details className="relative">
                          <summary className="list-none rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer">
                            ...
                          </summary>
                          <div className="absolute end-0 z-20 mt-1 w-44 rounded-md border border-border bg-popover p-1 shadow-lg rtl:text-start">
                            <button
                              className="block w-full rounded px-2 py-1 text-start text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
                              onClick={(e) => {
                                e.stopPropagation()
                                const msg =
                                  duplicateMarker.siblingIds.length > 1
                                    ? t('outputPanel.keepEntryConfirm', {
                                        count: duplicateMarker.siblingIds.length
                                      })
                                    : null
                                if (msg && typeof window !== 'undefined' && !window.confirm(msg)) return
                                keepDuplicateCitation(item.id, index)
                              }}
                              type="button"
                            >
                              {t('outputPanel.keepEntry')}
                            </button>
                            <button
                              className="block w-full rounded px-2 py-1 text-start text-[11px] text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteCitation(item.id, index)
                              }}
                              type="button"
                            >
                              {t('outputPanel.deleteEntry')}
                            </button>
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
