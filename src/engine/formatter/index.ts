import type { CslItem } from '../types'
import { createCiteprocEngine, getDefaultLocale } from './citeproc-wrapper'

function cleanDoi(doi: string): string {
  return doi
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')
    .trim()
    .replace(/[.)\s]+$/, '')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function entryAlreadyIncludesDoi(entry: string, doi: string): boolean {
  const normalizedEntry = entry.toLowerCase()
  const normalizedDoi = doi.toLowerCase()
  return normalizedEntry.includes(normalizedDoi) || normalizedEntry.includes(`doi.org/${normalizedDoi}`)
}

function appendDoiLink(entry: string, doi: string): string {
  const href = `https://doi.org/${encodeURI(doi)}`
  const link = ` <a href="${escapeHtml(href)}">${escapeHtml(href)}</a>`
  const entryWithLink = entry.replace(/(\s*<\/div>\s*)$/i, `${link}$1`)
  return entryWithLink === entry ? `${entry}${link}` : entryWithLink
}

export function ensureDoiLinksInBibliographyEntries(
  entries: string[],
  entryIds: string[][] | undefined,
  items: CslItem[]
): string[] {
  if (!entryIds || entryIds.length === 0) return entries

  const itemMap = new Map(items.map((item) => [item.id, item]))

  return entries.map((entry, index) => {
    const ids = entryIds[index] ?? []
    const itemWithDoi = ids
      .map((id) => itemMap.get(id))
      .find((item): item is CslItem => Boolean(item?.DOI))

    if (!itemWithDoi?.DOI) return entry

    const doi = cleanDoi(itemWithDoi.DOI)
    if (!doi || entryAlreadyIncludesDoi(entry, doi)) return entry

    return appendDoiLink(entry, doi)
  })
}

export async function formatBibliography(
  items: CslItem[],
  styleXml: string
): Promise<string> {
  if (items.length === 0) return ''

  const locale = getDefaultLocale()
  const engine = createCiteprocEngine(items, styleXml, locale)

  engine.updateItems(items.map((item) => item.id))

  const [params, entries] = engine.makeBibliography()
  if (!entries || entries.length === 0) return ''

  const prefix = params.bibstart ?? ''
  const suffix = params.bibend ?? ''
  const entriesWithDoiLinks = ensureDoiLinksInBibliographyEntries(entries, params.entry_ids, items)
  return prefix + entriesWithDoiLinks.join('') + suffix
}

export async function formatInTextCitation(
  items: CslItem[],
  styleXml: string,
  citationItemIds: string[]
): Promise<string> {
  if (items.length === 0) return ''

  const locale = getDefaultLocale()
  const engine = createCiteprocEngine(items, styleXml, locale)
  engine.updateItems(items.map((item) => item.id))

  const citation = {
    citationItems: citationItemIds.map((id) => ({ id })),
    properties: { noteIndex: 0 }
  }

  const result = engine.previewCitationCluster(citation, [], [], 'html')
  return result
}
