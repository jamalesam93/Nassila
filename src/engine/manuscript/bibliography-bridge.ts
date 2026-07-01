import type { CslItem } from '../types'
import type { BibEntry } from './mapping'
import { buildBibEntriesFromReferencesText } from './mapping'

/** Citation-store ids for rows exported from a manuscript References block. */
export const MANUSCRIPT_REF_ID_PREFIX = 'manuscript-ref:'

export function isManuscriptRefCitationId(id: string): boolean {
  return id.startsWith(MANUSCRIPT_REF_ID_PREFIX)
}

export function manuscriptRefCitationId(bibKey: string): string {
  return `${MANUSCRIPT_REF_ID_PREFIX}${bibKey}`
}

export function bibKeyFromManuscriptRefCitationId(id: string): string | null {
  if (!isManuscriptRefCitationId(id)) return null
  const key = id.slice(MANUSCRIPT_REF_ID_PREFIX.length).trim()
  return key.length > 0 ? key : null
}

/** Prefer parsed manuscript line (`_original`) over rebuilt title+DOI after registry patches. */
export function manuscriptBibliographyLine(item: CslItem): string {
  const original = item._original?.trim()
  if (original) {
    return original.replace(/^\s*\[?\d+[\].)]\s+/, '').trim()
  }
  const title = item.title?.trim()
  const doi = item.DOI?.trim()
  if (title && doi) return `${title}. ${doi}`
  return title ?? doi ?? item.id
}

function bibEntryRawLine(item: CslItem): string {
  return manuscriptBibliographyLine(item)
}

export function cslItemsFromManuscriptBibEntries(entries: BibEntry[]): CslItem[] {
  return entries
    .filter((e): e is BibEntry & { item: CslItem } => Boolean(e.item))
    .map((e) => ({
      ...e.item,
      id: manuscriptRefCitationId(e.key)
    }))
}

export function bibEntriesFromCitationLibrary(citations: CslItem[]): BibEntry[] {
  return citations.map((item, idx) => {
    const key = bibKeyFromManuscriptRefCitationId(item.id) ?? String(idx + 1)
    return {
      key,
      raw: bibEntryRawLine(item),
      item
    }
  })
}

export function mergeManuscriptRefsIntoCitations(existing: CslItem[], incoming: CslItem[]): CslItem[] {
  const kept = existing.filter((c) => !isManuscriptRefCitationId(c.id))
  return [...kept, ...incoming]
}

export async function manuscriptReferencesToCslItems(referencesText: string): Promise<{
  items: CslItem[]
  entries: BibEntry[]
  errors: string[]
}> {
  const bib = await buildBibEntriesFromReferencesText(referencesText)
  const items = cslItemsFromManuscriptBibEntries(bib.entries)
  return { items, entries: bib.entries, errors: bib.errors }
}
