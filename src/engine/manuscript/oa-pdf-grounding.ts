import { extractFromPdf } from '../maktab/extract'
import type { EvidenceSnippet } from './types'

export type OaPdfFullTextSource = {
  kind: 'full_text'
  text: string
  coverage: 'full_text_oa_unpaywall'
  snippetSource: Extract<EvidenceSnippet['source'], 'unpaywall'>
  url: string
  extractionTier: 'pdf_embedded_text' | 'pdf_ocr'
}

type ExtractFn = typeof extractFromPdf

/**
 * Masdar-lite: turn OA PDF bytes into full-text grounding input via Maktab extractFromPdf.
 */
export async function fullTextFromOaPdfBytes(
  pdfBytes: ArrayBuffer,
  url: string,
  extract: ExtractFn = extractFromPdf
): Promise<OaPdfFullTextSource | null> {
  if (!pdfBytes?.byteLength) return null

  const extracted = await extract(pdfBytes, { mode: 'auto' })
  const text = extracted.text.trim()
  if (!text) return null

  return {
    kind: 'full_text',
    text,
    coverage: 'full_text_oa_unpaywall',
    snippetSource: 'unpaywall',
    url,
    extractionTier: extracted.tier === 'ocr' ? 'pdf_ocr' : 'pdf_embedded_text'
  }
}
