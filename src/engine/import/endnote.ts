import type { CslItem, CslName } from '../types'
import type { ImportResult } from './index'
import { parseRis } from '../parser/ris'
import { parseBibtex } from '../parser/bibtex'

/**
 * Import from EndNote.
 * Supports:
 * 1. .xml (EndNote XML export)
 * 2. .ris (RIS export from EndNote)
 * 3. .bib (BibTeX export from EndNote)
 */
export async function importFromEndnote(path?: string): Promise<ImportResult> {
  if (!path) {
    return {
      items: [],
      errors: ['EndNote import requires a file path. Export your library from EndNote as XML, RIS, or BibTeX.'],
      source: 'endnote'
    }
  }

  try {
    const content = await window.api?.readFile(path)
    if (!content) {
      return { items: [], errors: ['Could not read file'], source: 'endnote' }
    }

    const ext = path.toLowerCase().split('.').pop()

    if (ext === 'xml') {
      return parseEndnoteXml(content)
    }

    if (ext === 'ris') {
      const result = await parseRis(content)
      return {
        items: result.items.map((item) => ({
          ...item,
          _sourceFormat: 'endnote' as const
        })),
        errors: result.errors,
        source: 'endnote'
      }
    }

    if (ext === 'bib') {
      const result = await parseBibtex(content)
      return {
        items: result.items.map((item) => ({
          ...item,
          _sourceFormat: 'endnote' as const
        })),
        errors: result.errors,
        source: 'endnote'
      }
    }

    return {
      items: [],
      errors: [`Unsupported file type: .${ext}. Use .xml, .ris, or .bib`],
      source: 'endnote'
    }
  } catch (e) {
    return { items: [], errors: [`Read error: ${(e as Error).message}`], source: 'endnote' }
  }
}

function parseEndnoteXml(xml: string): ImportResult {
  const items: CslItem[] = []
  const errors: string[] = []

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')
    const records = doc.querySelectorAll('record, xml > records > record')

    if (records.length === 0) {
      const altRecords = doc.getElementsByTagName('record')
      if (altRecords.length === 0) {
        return { items: [], errors: ['No records found in EndNote XML'], source: 'endnote' }
      }
    }

    records.forEach((record, i) => {
      try {
        const title = getXmlText(record, 'titles title, title')
        const authors: CslName[] = []

        record.querySelectorAll('contributors authors author, authors author').forEach((authorEl) => {
          const name = authorEl.textContent?.trim()
          if (name) {
            const parts = name.split(',')
            if (parts.length >= 2) {
              authors.push({ family: parts[0].trim(), given: parts[1].trim() })
            } else {
              authors.push({ literal: name })
            }
          }
        })

        const year = getXmlText(record, 'dates year, year')
        const journal = getXmlText(record, 'periodical full-title, secondary-title')
        const volume = getXmlText(record, 'volume')
        const pages = getXmlText(record, 'pages')
        const doi = getXmlText(record, 'electronic-resource-num')
        const isbn = getXmlText(record, 'isbn')
        const publisher = getXmlText(record, 'publisher')

        if (title || authors.length > 0) {
          items.push({
            id: `endnote-${i}`,
            type: 'article-journal',
            title: title || undefined,
            author: authors,
            'container-title': journal || undefined,
            volume: volume || undefined,
            page: pages || undefined,
            DOI: doi || undefined,
            ISBN: isbn || undefined,
            publisher: publisher || undefined,
            issued: year ? { 'date-parts': [[parseInt(year, 10)]] } : undefined,
            _sourceFormat: 'endnote',
            _parseConfidence: 0.9
          })
        }
      } catch (e) {
        errors.push(`Record ${i}: ${(e as Error).message}`)
      }
    })
  } catch (e) {
    errors.push(`XML parse error: ${(e as Error).message}`)
  }

  return { items, errors, source: 'endnote' }
}

function getXmlText(el: Element, selectors: string): string | null {
  for (const selector of selectors.split(',')) {
    const found = el.querySelector(selector.trim())
    if (found?.textContent) return found.textContent.trim()
  }
  return null
}
