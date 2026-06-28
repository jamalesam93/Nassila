import mammoth from 'mammoth'
import type { CslItem } from '../types'
import type { ParseResult } from './index'
import { parsePlainText } from './plain-text'
import { resolveDoi, searchCrossRef } from '../resolver/crossref'
import { segmentManuscriptText } from '../manuscript/segments'
import { extractManuscriptFromPdf } from '../manuscript/pdf-extract'

const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024
const MAX_EXTRACTED_TEXT_CHARS = 2_000_000

export async function parseDocx(buffer: ArrayBuffer): Promise<ParseResult> {
  const errors: string[] = []
  const items: CslItem[] = []

  try {
    if (buffer.byteLength > MAX_DOCUMENT_BYTES) {
      return { items: [], errors: ['DOCX file is too large to parse safely'], format: 'docx' }
    }

    const result = await mammoth.extractRawText({ arrayBuffer: buffer })
    const text = result.value
    if (text.length > MAX_EXTRACTED_TEXT_CHARS) {
      return { items: [], errors: ['DOCX text extraction exceeded the safe size limit'], format: 'docx' }
    }

    if (!text.trim()) {
      return { items: [], errors: ['Empty document'], format: 'docx' }
    }

    // Find the references section
    const refSection = extractReferenceSection(text)
    if (!refSection) {
      return { items: [], errors: ['Could not locate a references/bibliography section'], format: 'docx' }
    }

    // Split into individual entries
    const entries = splitReferenceEntries(refSection)
    if (entries.length === 0) {
      return { items: [], errors: ['No individual reference entries found'], format: 'docx' }
    }

    // Parse each entry
    const combinedInput = entries.join('\n')
    const parseResult = await parsePlainText(combinedInput)
    items.push(...parseResult.items.map((item) => ({
      ...item,
      _sourceFormat: 'docx' as const
    })))
    errors.push(...parseResult.errors)
  } catch (e) {
    errors.push(`DOCX parse error: ${(e as Error).message}`)
  }

  return { items, errors, format: 'docx' }
}

export async function parsePdf(buffer: ArrayBuffer): Promise<ParseResult> {
  const errors: string[] = []
  const items: CslItem[] = []

  try {
    if (buffer.byteLength > MAX_DOCUMENT_BYTES) {
      return { items: [], errors: ['PDF file is too large to parse safely'], format: 'pdf' }
    }

    let fullText: string
    try {
      const extraction = await extractManuscriptFromPdf(buffer)
      fullText = extraction.text
      if (extraction.warnings.length > 0) {
        errors.push(...extraction.warnings)
      }
    } catch (e) {
      return { items: [], errors: [(e as Error).message], format: 'pdf' }
    }

    if (fullText.length > MAX_EXTRACTED_TEXT_CHARS) {
      return { items: [], errors: ['PDF text extraction exceeded the safe size limit'], format: 'pdf' }
    }

    if (!fullText.trim()) {
      return { items: [], errors: ['Empty PDF or could not extract text'], format: 'pdf' }
    }

    const refSection = extractReferenceSection(fullText)
    if (refSection) {
      const entries = splitReferenceEntries(refSection)
      if (entries.length > 0) {
        const combinedInput = entries.join('\n')
        const parseResult = await parsePlainText(combinedInput)
        items.push(...parseResult.items.map((item) => ({
          ...item,
          _sourceFormat: 'pdf' as const
        })))
        errors.push(...parseResult.errors)
      }
    }

    if (items.length === 0) {
      const resolved = await extractCitationFromPdfText(fullText)
      if (resolved) {
        items.push({ ...resolved, _sourceFormat: 'pdf' as const })
      } else {
        errors.push('Could not extract citation metadata from this PDF')
      }
    }
  } catch (e) {
    errors.push(`PDF parse error: ${(e as Error).message}`)
  }

  return { items, errors, format: 'pdf' }
}


/** Shared with manuscript audit — numbered [22] / 53. blocks, refs-only paste, section-heading guard. */
export function extractReferenceSection(text: string): string | null {
  const seg = segmentManuscriptText(text)
  return seg.referencesText?.trim() || null
}

export function splitReferenceEntries(text: string): string[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const entries: string[] = []
  let current = ''

  const numberedPattern = /^\s*\[?\d+[\].)]\s*/
  const isNumbered = lines.filter((l) => numberedPattern.test(l)).length >= 2

  for (const line of lines) {
    if (isNumbered && numberedPattern.test(line)) {
      if (current.trim()) entries.push(current.trim())
      current = line
    } else if (!isNumbered && /^[A-Z][a-z]+[\s,]/.test(line) && current.trim()) {
      // Author-date style: new entry starts with author name
      entries.push(current.trim())
      current = line
    } else {
      current += ' ' + line
    }
  }

  if (current.trim()) entries.push(current.trim())
  return entries
}

async function extractCitationFromPdfText(text: string): Promise<CslItem | null> {
  const doiMatch = text.match(/\b(10\.\d{4,}\/[^\s,;)}\]]+)/i)
  if (doiMatch) {
    const doi = doiMatch[1].replace(/[.)]+$/, '')
    const item = await resolveDoi(doi)
    if (item) return item
  }

  const firstPage = text.slice(0, 3000)
  const lines = firstPage.split('\n').map((l) => l.trim()).filter((l) => l.length > 10)
  const titleCandidate = lines.find((l) =>
    l.length > 20 && l.length < 300 && !/^(abstract|introduction|doi|http|volume|issue)/i.test(l)
  )

  if (titleCandidate) {
    const results = await searchCrossRef(titleCandidate, 1)
    if (results.length > 0) return results[0]
  }

  return null
}
