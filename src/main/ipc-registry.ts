import { ipcMain } from 'electron'
import { searchJournalsCrossRef } from '../engine/resolver/journal-search'
import { verifyUnifiedRegistryWithPatches } from '../engine/verifier/verify-and-apply'
import type { CslItem } from '../engine/types'
import { MAX_VERIFICATION_ITEMS } from '../shared/verification-limits'

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
}
