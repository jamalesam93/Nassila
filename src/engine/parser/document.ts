import mammoth from 'mammoth'
import type { CslItem } from '../types'
import type { ParseResult } from './index'
import { parsePlainText } from './plain-text'
import { resolveDoi, searchCrossRef } from '../resolver/crossref'

const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024
const MAX_PDF_PAGES = 150
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

    const pdfjsLib = await import('pdfjs-dist')
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).href
    }

    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) })
    const pdf = await loadingTask.promise

    if (pdf.numPages > MAX_PDF_PAGES) {
      return { items: [], errors: ['PDF has too many pages to parse safely'], format: 'pdf' }
    }

    let fullText = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items
        .map((item: { str?: string }) => item.str ?? '')
        .join(' ')
      fullText += pageText + '\n'

      if (fullText.length > MAX_EXTRACTED_TEXT_CHARS) {
        return { items: [], errors: ['PDF text extraction exceeded the safe size limit'], format: 'pdf' }
      }
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

const REFERENCE_HEADERS = [
  /^references?\s*$/im,
  /^bibliography\s*$/im,
  /^works?\s+cited\s*$/im,
  /^literature\s+cited\s*$/im,
  /^cited\s+references?\s*$/im,
  /^reference\s+list\s*$/im
]

export function extractReferenceSection(text: string): string | null {
  for (const pattern of REFERENCE_HEADERS) {
    const match = text.match(pattern)
    if (match && match.index != null) {
      const startIdx = match.index + match[0].length
      const remaining = text.slice(startIdx).trim()

      // Try to find the end of references (next major heading or end of doc)
      const nextHeading = remaining.match(
        /\n\s*(?:appendix|supplementary|acknowledgment|funding|conflict|author\s+contribution|figure|table)\s*\n/i
      )
      if (nextHeading?.index != null) {
        return remaining.slice(0, nextHeading.index).trim()
      }
      return remaining
    }
  }

  // Fallback: look for a block of numbered references near the end
  const lastQuarter = text.slice(Math.floor(text.length * 0.6))
  const numberedBlock = lastQuarter.match(
    /(?:^|\n)\s*\[?1[\].)][\s\S]*?(?:\n\s*\[?\d+[\].)][\s\S]*?){2,}/
  )
  if (numberedBlock) {
    return numberedBlock[0].trim()
  }

  return null
}

export function splitReferenceEntries(text: string): string[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const entries: string[] = []
  let current = ''

  // Detect if entries are numbered
  const numberedPattern = /^\s*\[?\d+[\].)]\s/
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
