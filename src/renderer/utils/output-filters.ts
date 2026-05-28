import type { CslItem, CslItemType } from '../../engine/types'
import type { CitationStatus } from '../stores/citation-store'
import type { DuplicateCitationMarker } from '../stores/citation-store'
import type { PredatoryFlag } from '../../engine/types'
import type { ValidationIssue } from '../../engine/types'

const GRAY_LIT_TYPES: Set<CslItemType> = new Set([
  'report',
  'thesis',
  'webpage',
  'post',
  'post-weblog',
  'dataset',
  'software',
  'patent',
  'legislation',
  'legal_case',
  'bill',
  'regulation',
  'standard',
  'manuscript',
  'speech',
  'broadcast',
  'motion_picture',
  'map',
  'personal_communication',
  'paper-conference',
  'document'
])

export type OutputListFilter = 'all' | 'issues' | 'predatory' | 'duplicates' | 'no-doi'

export function isGrayLitType(type: CslItemType): boolean {
  return GRAY_LIT_TYPES.has(type)
}

function authorSearchText(item: CslItem): string {
  return (item.author ?? [])
    .slice(0, 5)
    .map((a) => (a.literal ?? `${a.family ?? ''} ${a.given ?? ''}`).trim())
    .join(' ')
}

export function citationMatchesSearch(item: CslItem, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    item.title,
    authorSearchText(item),
    item.DOI,
    item.URL,
    item['container-title'],
    item.id
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

export function getCitationStatus(
  citationId: string,
  citationStatuses: Record<string, CitationStatus>,
  issues: ValidationIssue[]
): CitationStatus {
  if (citationStatuses[citationId]) return citationStatuses[citationId]
  return issues.some((i) => i.citationId === citationId) ? 'has-issues' : 'pending'
}

export function matchesOutputFilter(
  item: CslItem,
  filter: OutputListFilter,
  ctx: {
    issues: ValidationIssue[]
    citationStatuses: Record<string, CitationStatus>
    predatoryByCitation: Record<string, PredatoryFlag>
    duplicateGroupByCitation: Record<string, DuplicateCitationMarker>
  }
): boolean {
  if (filter === 'all') return true

  if (filter === 'issues') {
    const status = getCitationStatus(item.id, ctx.citationStatuses, ctx.issues)
    return status === 'has-issues' || ctx.issues.some((i) => i.citationId === item.id)
  }

  if (filter === 'predatory') {
    return Boolean(ctx.predatoryByCitation[item.id])
  }

  if (filter === 'duplicates') {
    return Boolean(ctx.duplicateGroupByCitation[item.id])
  }

  if (filter === 'no-doi') {
    return !item.DOI && !isGrayLitType(item.type)
  }

  return true
}

export function filterCitationsForDisplay(
  citations: CslItem[],
  filter: OutputListFilter,
  searchQuery: string,
  ctx: Parameters<typeof matchesOutputFilter>[2]
): CslItem[] {
  return citations.filter(
    (item) =>
      matchesOutputFilter(item, filter, ctx) && citationMatchesSearch(item, searchQuery)
  )
}
