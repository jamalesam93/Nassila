import mammoth from 'mammoth'
import type { CslItem } from '../types'
import type { ParseResult } from './index'
import { parsePlainText } from './plain-text'
import { resolveDoi, searchCrossRef } from '../resolver/crossref'
import { segmentManuscriptText } from '../manuscript/segments'
import { extractFromPdf } from '../maktab/extract'

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
    let refSection = extractReferenceSection(text)
    if (!refSection) {
      return { items: [], errors: ['Could not locate a references/bibliography section'], format: 'docx' }
    }
    refSection = trimReferencesPreamble(refSection)

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
      const extraction = await extractFromPdf(buffer, { mode: 'auto' })
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

    let refSection = extractReferenceSection(fullText)
    if (refSection) {
      refSection = trimReferencesPreamble(refSection)
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

/** True bibliography marker — not a bare year ("2025."), page ("241."), or DOI ("10.1038/..."). */
function matchBibliographyNumber(line: string): number | null {
  const bracket = line.match(/^\s*\[(\d+)\]\s*\S/)
  if (bracket) return parseInt(bracket[1], 10)
  // Require whitespace after "12." / "12)" so DOIs like 10.1038/... do not match.
  const dotted = line.match(/^\s*(\d+)[.)]\s+\S/)
  if (dotted) return parseInt(dotted[1], 10)
  return null
}

function looksLikeAuthorDateStart(line: string): boolean {
  // Unicode letters (Giuffré), initials (U.S.), or plain Author,
  return /^(?:(?:\p{Lu}\.)+\s*[\p{Lu}\p{L}]|\p{Lu}[\p{L}'’-]*[\s,])/u.test(line)
}

const RESUME_OR_CV_HEADING =
  /(?:السيرة\s*الذاتية|السيرة\s*العلمية|ملخص\s*(?:ال)?(?:بحث|دراسة|منشورات|السيرة)|curriculum\s*vitae|\bcv\b|resume|professional\s+summary|research\s+summary|abstract\s+of\s+(?:the\s+)?(?:thesis|dissertation))/iu

/** Subsection labels inside a references chapter — not standalone citations. */
function isBibliographySubsectionHeading(text: string): boolean {
  const t = text.trim()
  if (t.length > 140) return false
  if (/^(?:أولاً|ثانيا|ثالثا|رابعا|خامسا)[ًا]?\s*[:：.]?\s*(?:ال?\S{0,4}مراجع|references?|bibliography|sources?)/iu.test(t)) {
    return true
  }
  if (/\((?:Arabic|English|French)\s+References?\)/i.test(t)) return true
  if (/^(?:Arabic|English|French)\s+References?\s*[:.]?\s*$/i.test(t)) return true
  return false
}

function isResumeOrCvHeading(text: string): boolean {
  return RESUME_OR_CV_HEADING.test(text.trim())
}

function looksLikeReferenceEntry(text: string): boolean {
  const t = text.trim()
  if (t.length < 12) return false
  if (isBibliographySubsectionHeading(t) || isResumeOrCvHeading(t)) return false
  if (matchBibliographyNumber(t)) return true
  if (/\b(19|20)\d{2}\b/.test(t)) return true
  if (/doi\.org|10\.\d{4,}\//i.test(t)) return true
  if (looksLikeAuthorDateStart(t)) return true
  if (/[\u0600-\u06FF]/.test(t) && /\b(19|20)\d{2}\b/.test(t) && t.length >= 20) return true
  return false
}

/** Drop resume / narrative preamble that sometimes follows the references heading in Arabic theses. */
export function trimReferencesPreamble(text: string): string {
  const blocks = text
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  if (blocks.length === 0) return text

  let i = 0
  while (i < blocks.length) {
    const block = blocks[i]!
    if (isResumeOrCvHeading(block)) {
      i++
      while (
        i < blocks.length &&
        !isBibliographySubsectionHeading(blocks[i]!) &&
        !looksLikeReferenceEntry(blocks[i]!)
      ) {
        i++
      }
      continue
    }
    if (looksLikeReferenceEntry(block) || isBibliographySubsectionHeading(block)) break
    if (!looksLikeReferenceEntry(block) && block.length < 220 && !/\b(19|20)\d{2}\b/.test(block)) {
      i++
      continue
    }
    break
  }
  return blocks.slice(i).join('\n\n')
}

function filterReferenceEntries(entries: string[]): string[] {
  return entries.filter((entry) => {
    const t = entry.trim()
    if (!t) return false
    if (isBibliographySubsectionHeading(t) || isResumeOrCvHeading(t)) return false
    return looksLikeReferenceEntry(t)
  })
}

export function splitReferenceEntries(text: string): string[] {
  // DOCX/mammoth: one unnumbered reference per paragraph (blank-line separated).
  // Skip for numbered lists — a stray blank line in a PDF would under-split.
  const paragraphs = text
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  if (paragraphs.length >= 2) {
    const numberedParas = paragraphs.filter((p) => matchBibliographyNumber(p) !== null).length
    if (numberedParas === 0) {
      return filterReferenceEntries(paragraphs)
    }
  }

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const entries: string[] = []
  let current = ''
  let prevNum: number | null = null

  const numberedHits = lines.map(matchBibliographyNumber).filter((n): n is number => n !== null)
  const isNumbered = numberedHits.length >= 2

  for (const line of lines) {
    const num = matchBibliographyNumber(line)
    if (isNumbered && num !== null) {
      // Prefer sequential markers (1,2,3…) so wrapped years like "2025. More text" do not split.
      const sequential = prevNum === null || num === prevNum + 1
      if (sequential) {
        if (current.trim()) entries.push(current.trim())
        current = line
        prevNum = num
        continue
      }
    } else if (!isNumbered && looksLikeAuthorDateStart(line) && current.trim()) {
      entries.push(current.trim())
      current = line
      continue
    }
    current = current ? `${current} ${line}` : line
  }

  if (current.trim()) entries.push(current.trim())
  return filterReferenceEntries(entries)
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
