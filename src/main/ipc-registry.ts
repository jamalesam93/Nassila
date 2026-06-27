import { ipcMain } from 'electron'
import { searchJournalsCrossRef } from '../engine/resolver/journal-search'

function sanitizeJournalSearchQuery(query: unknown): string {
  if (typeof query !== 'string') return ''
  return query.trim().slice(0, 200)
}

function sanitizeJournalSearchRows(rows: unknown): number {
  if (typeof rows !== 'number' || !Number.isFinite(rows)) return 15
  return Math.min(25, Math.max(1, Math.floor(rows)))
}

export function registerRegistryIpcHandlers(): void {
  ipcMain.handle('registry:searchJournals', async (_event, query: unknown, rows: unknown) => {
    const q = sanitizeJournalSearchQuery(query)
    if (q.length < 2) return []
    return searchJournalsCrossRef(q, sanitizeJournalSearchRows(rows))
  })
}
