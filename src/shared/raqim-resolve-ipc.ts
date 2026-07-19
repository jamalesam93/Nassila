import type { CslItem } from '../engine/types'
import type { RaqimLookupKind, RaqimLookupRequest } from './raqim-resolve'
import { sanitizeCslItem } from './manuscript-registry-ipc'

const LOOKUP_KINDS = new Set<RaqimLookupKind>(['title', 'doi', 'pmid', 'pmcid', 'url'])
const MAX_LOOKUP_KEY_LENGTH = 500

export function sanitizeRaqimLookupRequest(raw: unknown): RaqimLookupRequest | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const candidate = raw as { item?: unknown; key?: unknown; kind?: unknown }
  const item = sanitizeCslItem(candidate.item)
  if (!item) return null

  const key = typeof candidate.key === 'string'
    ? candidate.key.trim().slice(0, MAX_LOOKUP_KEY_LENGTH)
    : undefined
  const kind = typeof candidate.kind === 'string' && LOOKUP_KINDS.has(candidate.kind as RaqimLookupKind)
    ? candidate.kind as RaqimLookupKind
    : undefined

  if (candidate.key !== undefined && !key) return null
  if (candidate.kind !== undefined && !kind) return null

  return {
    item: item as CslItem,
    key,
    kind
  }
}
