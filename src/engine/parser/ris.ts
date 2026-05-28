import { Cite } from '@citation-js/core'
import '@citation-js/plugin-ris'
import type { CslItem, InputFormat } from '../types'
import type { ParseResult } from './index'

/** @citation-js/plugin-ris only registers @ris/file (not @ris/text). Lines must match "XX  - ". */
function normalizeRisLines(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const m = line.match(/^([A-Z][A-Z0-9])\s*-\s*(.*)$/)
      if (m) {
        return `${m[1]}  - ${m[2]}`
      }
      return line
    })
    .join('\n')
}

export async function parseRis(raw: string): Promise<ParseResult> {
  const errors: string[] = []
  const items: CslItem[] = []

  const normalized = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const forParser = normalizeRisLines(normalized)

  try {
    const cite = await Cite.async(forParser, { forceType: '@ris/file' })
    const cslData = cite.get({ type: 'json', style: 'csl' }) as CslItem[]

    for (const item of cslData) {
      items.push({
        ...item,
        id: item.id ?? `ris-${items.length}`,
        _sourceFormat: 'ris' as InputFormat,
        _parseConfidence: 1.0
      })
    }
  } catch (e) {
    errors.push(`RIS parse error: ${(e as Error).message}`)
  }

  return { items, errors, format: 'ris' }
}
