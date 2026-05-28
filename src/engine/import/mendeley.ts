import type { CslItem } from '../types'
import type { ImportResult } from './index'
import { parseBibtex } from '../parser/bibtex'
import { parseRis } from '../parser/ris'

/**
 * Import from Mendeley.
 * Mendeley's API was deprecated in 2023, so we support:
 * 1. Exported .bib files from Mendeley
 * 2. Exported .ris files from Mendeley
 * 3. Exported CSL-JSON files
 */
export async function importFromMendeley(path?: string): Promise<ImportResult> {
  if (!path) {
    return {
      items: [],
      errors: ['Mendeley import requires a file path. Export your library from Mendeley as BibTeX or RIS.'],
      source: 'mendeley'
    }
  }

  try {
    const content = await window.api?.readFile(path)
    if (!content) {
      return { items: [], errors: ['Could not read file'], source: 'mendeley' }
    }

    const ext = path.toLowerCase().split('.').pop()

    if (ext === 'bib') {
      const result = await parseBibtex(content)
      return {
        items: result.items.map((item) => ({
          ...item,
          _sourceFormat: 'mendeley' as const
        })),
        errors: result.errors,
        source: 'mendeley'
      }
    }

    if (ext === 'ris') {
      const result = await parseRis(content)
      return {
        items: result.items.map((item) => ({
          ...item,
          _sourceFormat: 'mendeley' as const
        })),
        errors: result.errors,
        source: 'mendeley'
      }
    }

    if (ext === 'json') {
      try {
        const parsed = JSON.parse(content)
        const arr = Array.isArray(parsed) ? parsed : [parsed]
        return {
          items: arr.map((item: CslItem, i: number) => ({
            ...item,
            id: item.id ?? `mendeley-${i}`,
            _sourceFormat: 'mendeley' as const,
            _parseConfidence: 1.0
          })),
          errors: [],
          source: 'mendeley'
        }
      } catch {
        return { items: [], errors: ['Invalid JSON file'], source: 'mendeley' }
      }
    }

    return {
      items: [],
      errors: [`Unsupported file type: .${ext}. Use .bib, .ris, or .json`],
      source: 'mendeley'
    }
  } catch (e) {
    return { items: [], errors: [`Read error: ${(e as Error).message}`], source: 'mendeley' }
  }
}
