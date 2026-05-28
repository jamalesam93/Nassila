import type { CslItem, InputFormat } from '../types'
import type { ParseResult } from './index'

export async function parseCslJson(raw: string): Promise<ParseResult> {
  const errors: string[] = []
  const items: CslItem[] = []

  try {
    const parsed = JSON.parse(raw)
    const arr: CslItem[] = Array.isArray(parsed) ? parsed : [parsed]

    for (let i = 0; i < arr.length; i++) {
      const item = arr[i]
      if (!item.type) {
        errors.push(`Item ${i}: missing required "type" field`)
        continue
      }
      items.push({
        ...item,
        id: item.id ?? `csl-${i}`,
        _sourceFormat: 'csl-json' as InputFormat,
        _parseConfidence: 1.0
      })
    }
  } catch (e) {
    errors.push(`JSON parse error: ${(e as Error).message}`)
  }

  return { items, errors, format: 'csl-json' }
}
