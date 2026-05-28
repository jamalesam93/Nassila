import { Cite } from '@citation-js/core'
import '@citation-js/plugin-bibtex'
import type { CslItem, InputFormat } from '../types'
import type { ParseResult } from './index'

export async function parseBibtex(raw: string): Promise<ParseResult> {
  const errors: string[] = []
  const items: CslItem[] = []

  try {
    const cite = await Cite.async(raw, { forceType: '@bibtex/text' })
    const cslData = cite.get({ type: 'json', style: 'csl' }) as CslItem[]

    for (const item of cslData) {
      items.push({
        ...item,
        id: item.id ?? `bibtex-${items.length}`,
        _sourceFormat: 'bibtex' as InputFormat,
        _parseConfidence: 1.0
      })
    }
  } catch (e) {
    errors.push(`BibTeX parse error: ${(e as Error).message}`)
  }

  return { items, errors, format: 'bibtex' }
}
