import type { CslItem, InputFormat } from '../types'
import { parseBibtex } from './bibtex'
import { parseRis } from './ris'
import { parseCslJson } from './csl-json'
import { parsePlainText } from './plain-text'

export interface ParseResult {
  items: CslItem[]
  errors: string[]
  format: InputFormat
}

export async function parseInput(raw: string, formatHint?: InputFormat): Promise<ParseResult> {
  const sniffed = detectFormat(raw)
  // Extension hints help plain-text exports; structured sniff wins when they disagree
  // (e.g. CSL-JSON saved with a .ris filename).
  const format: InputFormat =
    formatHint && sniffed !== 'plain-text' && sniffed !== formatHint
      ? sniffed
      : (formatHint ?? sniffed)

  switch (format) {
    case 'bibtex':
      return parseBibtex(raw)
    case 'ris':
      return parseRis(raw)
    case 'csl-json':
      return parseCslJson(raw)
    case 'plain-text':
    default:
      return parsePlainText(raw)
  }
}

export function detectFormat(raw: string): InputFormat {
  const trimmed = raw.replace(/^\uFEFF/, '').trim()

  if (trimmed.startsWith('@') && /^@\w+\s*\{/m.test(trimmed)) {
    return 'bibtex'
  }

  // RIS: "TY  - JOUR", "TY  -", single space after TY, or leading blank lines
  if (/^TY\s+-\s+/m.test(trimmed)) {
    return 'ris'
  }

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].type) return 'csl-json'
      if (parsed.type) return 'csl-json'
    } catch {
      // not JSON
    }
  }

  return 'plain-text'
}
