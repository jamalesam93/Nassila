import { ipcMain } from 'electron'
import { searchJournalsCrossRef } from '../engine/resolver/journal-search'
import { alignMetadata, resolveRegistry } from '../engine/manuscript/verify'
import { verifyUnifiedRegistryWithPatches } from '../engine/verifier/verify-and-apply'
import { lookupRaqimCandidates } from '../engine/resolver/raqim-resolve'
import type { CslItem } from '../engine/types'
import {
  sanitizeCslItem,
  sanitizeRegistrySource
} from '../shared/manuscript-registry-ipc'
import { MAX_VERIFICATION_ITEMS } from '../shared/verification-limits'
import { sanitizeRaqimLookupRequest } from '../shared/raqim-resolve-ipc'

function sanitizeJournalSearchQuery(query: unknown): string {
  if (typeof query !== 'string') return ''
  return query.trim().slice(0, 200)
}

function sanitizeJournalSearchRows(rows: unknown): number {
  if (typeof rows !== 'number' || !Number.isFinite(rows)) return 15
  return Math.min(25, Math.max(1, Math.floor(rows)))
}

function sanitizeCitations(raw: unknown): CslItem[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (item): item is CslItem =>
      !!item && typeof item === 'object' && typeof (item as CslItem).id === 'string'
  )
}

function sanitizeVerifyMaxItems(maxItems: unknown): number {
  if (typeof maxItems !== 'number' || !Number.isFinite(maxItems)) return MAX_VERIFICATION_ITEMS
  return Math.min(MAX_VERIFICATION_ITEMS, Math.max(1, Math.floor(maxItems)))
}

export function registerRegistryIpcHandlers(): void {
  ipcMain.handle('registry:searchJournals', async (_event, query: unknown, rows: unknown) => {
    const q = sanitizeJournalSearchQuery(query)
    if (q.length < 2) return []
    return searchJournalsCrossRef(q, sanitizeJournalSearchRows(rows))
  })

  ipcMain.handle('registry:verifyUnified', async (_event, citations: unknown, maxItems: unknown) => {
    const items = sanitizeCitations(citations)
    const cap = sanitizeVerifyMaxItems(maxItems)
    return verifyUnifiedRegistryWithPatches(items, cap)
  })

  ipcMain.handle('registry:lookupRaqimCandidates', async (_event, request: unknown) => {
    const sanitized = sanitizeRaqimLookupRequest(request)
    if (!sanitized) return []
    return lookupRaqimCandidates(sanitized)
  })

  /** Manuscript audit L1 — must run in main (production CSP blocks renderer fetch). */
  ipcMain.handle('registry:resolveManuscriptItem', async (_event, item: unknown) => {
    const csl = sanitizeCslItem(item)
    if (!csl) {
      return {
        source: 'none' as const,
        canonical: null,
        l1: { status: 'fail' as const, reasons: ['Invalid citation item'] }
      }
    }
    return resolveRegistry(csl)
  })

  /** Manuscript audit L2 — Crossref/PubMed verify paths use network; keep in main. */
  ipcMain.handle(
    'registry:alignManuscriptMetadata',
    async (_event, userItem: unknown, canonical: unknown, source: unknown) => {
      const user = sanitizeCslItem(userItem)
      const canon = sanitizeCslItem(canonical)
      const src = sanitizeRegistrySource(source)
      if (!user || !canon || !src) {
        return { l2: { status: 'skipped' as const, reason: 'not_applicable' as const }, mismatchedFields: [] }
      }
      return alignMetadata(user, canon, src)
    }
  )
}
