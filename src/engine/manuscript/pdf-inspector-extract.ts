import { initSync, processPdf, type PdfProcessResult, type PdfType } from '@firecrawl/pdf-inspector-wasm'

const MAX_PDF_PAGES = 200
const MAX_EXTRACTED_TEXT_CHARS = 4_000_000

export interface PdfInspectorExtraction {
  text: string
  pageCount: number
  pageBoundaries: Array<{ page: number; start: number; end: number }>
  warnings: string[]
  pdfType: PdfType
  confidence: number
  hasEncodingIssues: boolean
  processingTimeMs: number
}

let wasmInitialized = false

function getNodeModules(): {
  readFileSync: (p: string) => Buffer
  existsSync: (p: string) => boolean
  resolve: (...args: string[]) => string
  dirname: (p: string) => string
  fileURLToPath: (u: string) => string
} | null {
  try {
    if (typeof process !== 'undefined' && process.versions?.node) {
      const getReq = new Function('return typeof require !== "undefined" ? require : null')
      const req = getReq()
      if (req) {
        const fs = req('node:fs')
        const path = req('node:path')
        const url = req('node:url')
        return {
          readFileSync: fs.readFileSync,
          existsSync: fs.existsSync,
          resolve: path.resolve,
          dirname: path.dirname,
          fileURLToPath: url.fileURLToPath
        }
      }
    }
  } catch {
    // fallback
  }
  return null
}

export function initPdfInspectorWasm(): boolean {
  if (wasmInitialized) return true

  const nodeMods = getNodeModules()
  if (nodeMods) {
    try {
      const currentDir =
        typeof __dirname !== 'undefined'
          ? __dirname
          : nodeMods.dirname(nodeMods.fileURLToPath(import.meta.url))
      const wasmPath = nodeMods.resolve(
        currentDir,
        '../../../node_modules/@firecrawl/pdf-inspector-wasm/pdf_inspector_wasm_bg.wasm'
      )
      if (nodeMods.existsSync(wasmPath)) {
        const wasmBuffer = nodeMods.readFileSync(wasmPath)
        initSync({ module: wasmBuffer })
        wasmInitialized = true
        return true
      }
    } catch {
      // ignore path read error, try default initSync below
    }
  }

  try {
    initSync()
    wasmInitialized = true
    return true
  } catch {
    return false
  }
}

/**
 * Extract PDF using firecrawl/pdf-inspector WASM engine.
 * Converts PDF into structured Markdown (Headings, Tables, Lists, Column Order).
 */
export function extractFromPdfInspector(
  buffer: ArrayBuffer | Uint8Array
): PdfInspectorExtraction | null {
  const initialized = initPdfInspectorWasm()
  if (!initialized) return null

  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)

  try {
    const rawResult: PdfProcessResult = processPdf(bytes, {
      includePageMarkers: true,
      profile: 'fidelity'
    })

    const pageCount = rawResult.pageCount ?? 0
    if (pageCount > MAX_PDF_PAGES) {
      throw new Error(`PDF has ${pageCount} pages; maximum supported is ${MAX_PDF_PAGES}.`)
    }

    const rawMarkdown = rawResult.markdown ?? ''
    const warnings: string[] = []

    if (rawResult.pdfType === 'Scanned' || rawResult.pdfType === 'ImageBased') {
      throw new Error(
        'This PDF contains no extractable text — it is likely a scan. Run it through OCR (e.g. ocrmypdf, Adobe Acrobat) and re-import.'
      )
    }

    if (rawResult.hasEncodingIssues) {
      warnings.push(
        'Very little text was extracted. The PDF may be partially scanned or use embedded fonts without a Unicode map.'
      )
    }

    if (rawResult.confidence < 0.5) {
      warnings.push(
        'Extraction confidence was low. Some text or mathematical symbols may be degraded.'
      )
    }

    const { text, pageBoundaries } = calculatePageBoundaries(rawMarkdown)

    if (text.length > MAX_EXTRACTED_TEXT_CHARS) {
      throw new Error('PDF text extraction exceeded the safe size limit (4 MB of text).')
    }

    const arabic = (text.match(/[\u0600-\u06FF]/g) ?? []).length
    if (arabic > 500) {
      const fiAsYf = (text.match(/يف/g) ?? []).length
      const fiCorrect = (text.match(/في/g) ?? []).length
      if (fiAsYf > fiCorrect * 2 && fiAsYf > 20) {
        warnings.push(
          'Arabic text from this PDF looks character-reversed (broken font encoding). Prefer the DOCX.'
        )
      }
    }

    const postProcessedText = postProcessText(text)

    return {
      text: postProcessedText,
      pageCount,
      pageBoundaries,
      warnings,
      pdfType: rawResult.pdfType,
      confidence: rawResult.confidence,
      hasEncodingIssues: rawResult.hasEncodingIssues,
      processingTimeMs: rawResult.processingTimeMs ?? 0
    }
  } catch (err) {
    if (
      err instanceof Error &&
      /likely a scan|exceeded the safe size limit|maximum supported/i.test(err.message)
    ) {
      throw err
    }
    return null
  }
}

function calculatePageBoundaries(
  markdown: string
): { text: string; pageBoundaries: Array<{ page: number; start: number; end: number }> } {
  const markerRegex = /<!--\s*Page\s+(\d+)\s*-->/gi
  const matches: Array<{ page: number; index: number; length: number }> = []

  let m: RegExpExecArray | null
  while ((m = markerRegex.exec(markdown)) !== null) {
    matches.push({
      page: parseInt(m[1], 10),
      index: m.index,
      length: m[0].length
    })
  }

  if (matches.length === 0) {
    const text = markdown.trim()
    return {
      text,
      pageBoundaries: [{ page: 1, start: 0, end: text.length }]
    }
  }

  let cleanText = ''
  const pageBoundaries: Array<{ page: number; start: number; end: number }> = []
  let lastIndex = 0

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]
    const segment = markdown.slice(lastIndex, current.index)

    if (i > 0) {
      const pageNum = matches[i - 1].page
      const start = cleanText.length - segment.length
      const end = cleanText.length
      pageBoundaries.push({ page: pageNum, start: Math.max(0, start), end })
    }

    cleanText += segment
    lastIndex = current.index + current.length
  }

  const finalSegment = markdown.slice(lastIndex)
  const lastPageNum = matches[matches.length - 1].page
  const start = cleanText.length
  cleanText += finalSegment
  pageBoundaries.push({ page: lastPageNum, start, end: cleanText.length })

  if (pageBoundaries.length === 0) {
    pageBoundaries.push({ page: 1, start: 0, end: cleanText.length })
  }

  return { text: cleanText.trim(), pageBoundaries }
}

function postProcessText(text: string): string {
  let out = text
  out = out
    .replace(/\uFB00/g, 'ff')
    .replace(/\uFB01/g, 'fi')
    .replace(/\uFB02/g, 'fl')
    .replace(/\uFB03/g, 'ffi')
    .replace(/\uFB04/g, 'ffl')
    .replace(/\uFB05/g, 'ft')
    .replace(/\uFB06/g, 'st')

  out = out.replace(/([A-Za-z]{2,})-\n([a-z]{2,})/g, '$1$2')
  out = out.replace(/([A-Za-z]{2,})-\s*\n([a-z]{2,})/g, '$1$2')
  out = out.replace(/\n{3,}/g, '\n\n')
  out = out.replace(/[ \t]+\n/g, '\n')
  return out.trim()
}
