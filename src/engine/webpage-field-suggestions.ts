import type { CslDate, CslItem, CslName } from './types'
import { buildGreyWebPageItem, classifyWebpageHost } from './resolver/webpage-hosts'
import type {
  WebpageFieldSuggestion,
  WebpageSuggestableField,
  WebpageSuggestionBatch,
  WebpageSuggestionSource
} from '../shared/webpage-suggestions'

const SUGGESTABLE_FIELDS: WebpageSuggestableField[] = [
  'title',
  'container-title',
  'publisher',
  'URL',
  'author',
  'issued',
  'accessed',
  'abstract',
  'DOI',
  'genre',
  'type'
]

/** Baseline confidence by field for webpage HTML / grey-lit host stubs. */
const BASE_CONFIDENCE: Record<WebpageSuggestableField, number> = {
  title: 0.85,
  DOI: 0.9,
  URL: 0.95,
  author: 0.72,
  issued: 0.68,
  accessed: 0.8,
  'container-title': 0.62,
  publisher: 0.55,
  abstract: 0.5,
  genre: 0.7,
  type: 0.6
}

const DEFAULT_EVIDENCE: Record<WebpageSuggestionSource, string> = {
  webpage_metadata: 'webpage-html-meta',
  grey_lit: 'grey-web-host-stub'
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function normalizeScalar(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim().replace(/\s+/g, ' ').toLowerCase()
  return JSON.stringify(value)
}

function authorsKey(authors: CslName[] | undefined): string {
  if (!authors?.length) return ''
  return authors
    .map((a) => `${a.family ?? ''}|${a.given ?? ''}|${a.literal ?? ''}`.toLowerCase())
    .join(';')
}

function dateKey(date: CslDate | undefined): string {
  if (!date) return ''
  if (date.literal) return date.literal.trim().toLowerCase()
  if (date.raw) return date.raw.trim().toLowerCase()
  const parts = date['date-parts']?.[0]
  if (parts?.length) return parts.join('-')
  return ''
}

function fieldValuesEqual(field: WebpageSuggestableField, a: unknown, b: unknown): boolean {
  if (field === 'author') {
    return authorsKey(a as CslName[] | undefined) === authorsKey(b as CslName[] | undefined)
  }
  if (field === 'issued' || field === 'accessed') {
    return dateKey(a as CslDate | undefined) === dateKey(b as CslDate | undefined)
  }
  return normalizeScalar(a) === normalizeScalar(b)
}

function readField(
  item: CslItem,
  field: WebpageSuggestableField
): string | CslDate | CslName[] | CslItem['type'] | undefined {
  return item[field] as string | CslDate | CslName[] | CslItem['type'] | undefined
}

function hasValue(field: WebpageSuggestableField, value: unknown): boolean {
  if (value == null) return false
  if (field === 'author') return Array.isArray(value) && value.length > 0
  if (typeof value === 'string') return value.trim().length > 0
  if (field === 'issued' || field === 'accessed') return dateKey(value as CslDate).length > 0
  return true
}

function confidenceFor(
  field: WebpageSuggestableField,
  source: WebpageSuggestionSource,
  hostProfile: { stableParser: boolean } | undefined,
  replacing: boolean
): number {
  let score = BASE_CONFIDENCE[field]
  if (source === 'grey_lit') score -= 0.12
  if (hostProfile && !hostProfile.stableParser) score -= 0.08
  if (replacing) score -= 0.1
  if (field === 'publisher' && source === 'webpage_metadata') score -= 0.05
  return clamp01(score)
}

function evidenceFor(field: WebpageSuggestableField, source: WebpageSuggestionSource): string {
  if (field === 'URL') return 'url-input'
  if (field === 'accessed') return 'accessed-today'
  if (field === 'genre' && source === 'grey_lit') return 'host-kind-classify'
  return DEFAULT_EVIDENCE[source]
}

function todayAccessed(): CslDate {
  const now = new Date()
  return {
    'date-parts': [[now.getFullYear(), now.getMonth() + 1, now.getDate()]]
  }
}

/**
 * Build field-level CSL patches from a proposed webpage/grey-lit item.
 * Never mutates `current` — callers must confirm before apply.
 */
export function buildWebpageFieldSuggestions(
  current: CslItem,
  proposed: Partial<CslItem> | null | undefined,
  options: {
    source: WebpageSuggestionSource
    hostProfile?: { stableParser: boolean }
    /** When true (default), propose today's accessed date if the row lacks one. */
    suggestAccessed?: boolean
  }
): WebpageFieldSuggestion[] {
  if (!proposed) return []

  const source = options.source
  const hostProfile = options.hostProfile
  const suggestAccessed = options.suggestAccessed !== false
  const out: WebpageFieldSuggestion[] = []

  for (const field of SUGGESTABLE_FIELDS) {
    if (field === 'accessed') continue
    const proposedValue = readField(proposed as CslItem, field)
    if (!hasValue(field, proposedValue)) continue

    const currentValue = readField(current, field)
    if (hasValue(field, currentValue) && fieldValuesEqual(field, currentValue, proposedValue)) {
      continue
    }

    const replacing = hasValue(field, currentValue)
    // Do not propose overwriting a non-empty title with a weak grey stub unless empty.
    if (replacing && source === 'grey_lit' && (field === 'title' || field === 'type')) {
      continue
    }

    out.push({
      field,
      proposed: proposedValue as string | CslDate | CslName[] | CslItem['type'],
      current: hasValue(field, currentValue)
        ? (currentValue as string | CslDate | CslName[] | CslItem['type'])
        : undefined,
      provenance: {
        source,
        confidence: confidenceFor(field, source, hostProfile, replacing),
        evidence: evidenceFor(field, source)
      }
    })
  }

  if (suggestAccessed && !hasValue('accessed', current.accessed)) {
    out.push({
      field: 'accessed',
      proposed: todayAccessed(),
      provenance: {
        source,
        confidence: confidenceFor('accessed', source, hostProfile, false),
        evidence: evidenceFor('accessed', source)
      }
    })
  }

  return out
}

/** Offline grey-lit suggestions from URL host/path stubs — no network. */
export function buildGreyLitFieldSuggestions(current: CslItem): WebpageSuggestionBatch | null {
  const url = current.URL?.trim()
  if (!url) return null
  const stub = buildGreyWebPageItem(url)
  if (!stub) return null
  const hostProfile = classifyWebpageHost(url)
  const suggestions = buildWebpageFieldSuggestions(current, stub, {
    source: 'grey_lit',
    hostProfile,
    suggestAccessed: true
  })
  if (suggestions.length === 0) return null
  return { citationId: current.id, url, suggestions }
}

/**
 * Apply only accepted field suggestions onto a CSL item (immutable).
 * Rejected / omitted fields are left untouched.
 */
export function applyWebpageFieldSuggestions(
  current: CslItem,
  suggestions: WebpageFieldSuggestion[],
  acceptedFields: ReadonlySet<WebpageSuggestableField> | WebpageSuggestableField[]
): CslItem {
  const accepted = acceptedFields instanceof Set ? acceptedFields : new Set(acceptedFields)
  if (accepted.size === 0) return { ...current }

  const next: CslItem = { ...current }
  for (const suggestion of suggestions) {
    if (!accepted.has(suggestion.field)) continue
    ;(next as unknown as Record<string, unknown>)[suggestion.field] = suggestion.proposed
  }
  return next
}

/** Format a proposed value for compact UI preview (not for export). */
export function formatWebpageSuggestionPreview(
  field: WebpageSuggestableField,
  value: WebpageFieldSuggestion['proposed']
): string {
  if (field === 'author' && Array.isArray(value)) {
    return (value as CslName[])
      .map((a) => a.literal ?? [a.given, a.family].filter(Boolean).join(' '))
      .filter(Boolean)
      .join('; ')
  }
  if ((field === 'issued' || field === 'accessed') && value && typeof value === 'object') {
    const d = value as CslDate
    if (d.literal) return d.literal
    if (d.raw) return d.raw
    const parts = d['date-parts']?.[0]
    if (parts?.length) return parts.join('-')
    return ''
  }
  return String(value ?? '')
}
