/**
 * Firecrawl native `@firecrawl/pdf-inspector` seam (Nassila 2.0 MaktabOCR).
 *
 * Soft-loads the napi package when available; returns null when the binary,
 * PDFium/ONNX, or offline model directory is missing so callers fall back to
 * WASM → pdf.js → Tesseract.
 *
 * Prefer main-process IPC from the renderer (`maktab:nativeClassify` /
 * `maktab:nativeExtract`). This module is for main / Vitest node.
 *
 * WASM fallback stays on `@firecrawl/pdf-inspector-wasm@0.1.3` — newer WASM
 * majors (1.14+) change the `processPdf` options surface and break
 * `pdf-inspector-extract.ts`.
 */

export const NATIVE_PDF_INSPECTOR_ENGINE_ID = 'firecrawl-pdf-inspector-native' as const

export interface NativePdfClassification {
  pdfType: string
  pageCount: number
  /** 0-indexed pages that need OCR (upstream classifyPdf). */
  pagesNeedingOcr: number[]
  confidence: number
}

export interface NativePdfInspectorProvenance {
  engineId: typeof NATIVE_PDF_INSPECTOR_ENGINE_ID
  confidence: number
  pagesRoutedToOcr: number[]
  pagesWithTables: number[]
  warnings: string[]
}

export interface NativePdfInspectorExtraction {
  text: string
  pageCount: number
  pageBoundaries: Array<{ page: number; start: number; end: number }>
  warnings: string[]
  provenance: NativePdfInspectorProvenance
  processingTimeMs?: number
}

/** Subset of upstream OcrPdfResult used for mapping (keeps engine free of hard deps). */
export interface NativeOcrPdfResultLike {
  markdown?: string
  pageCount?: number
  pagesRoutedToOcr?: number[]
  pagesWithTables?: number[]
  pages?: Array<{
    pageNumber: number
    markdown?: string
    provenance?: { ocrConfidence?: number; warnings?: string[]; hostedRecommended?: boolean }
  }>
  processingTimeMs?: number
}

export interface NativePdfInspectorModule {
  classifyPdf: (buffer: Buffer) => {
    pdfType: string | { toString(): string }
    pageCount: number
    pagesNeedingOcr: number[]
    confidence: number
  }
  classifyPdfAsync?: (buffer: Buffer) => Promise<{
    pdfType: string | { toString(): string }
    pageCount: number
    pagesNeedingOcr: number[]
    confidence: number
  }>
  processPdfWithOcr: (
    buffer: Buffer,
    options?: {
      mode?: string
      offline?: boolean
      modelDirectory?: string
      dpi?: number
    }
  ) => Promise<NativeOcrPdfResultLike>
  OcrMode?: { Auto?: string; Off?: string; Force?: string }
}

export interface NativeExtractOptions {
  /** Offline PP-OCRv6 Small model directory (required when offline: true). */
  modelDirectory?: string
  /** Default true — on-device only; no model network fetch. */
  offline?: boolean
  dpi?: number
}

let cachedModule: NativePdfInspectorModule | null | undefined

function nodeRequire(): ((id: string) => unknown) | null {
  try {
    if (typeof process === 'undefined' || !process.versions?.node) return null
    // Avoid static node:module imports so accidental renderer pulls stay soft.
    const createRequire = new Function(
      'return require("node:module").createRequire'
    )() as (filename: string) => (id: string) => unknown
    return createRequire(
      typeof __filename !== 'undefined' ? __filename : `${process.cwd()}/package.json`
    )
  } catch {
    return null
  }
}

function nodeExistsSync(path: string): boolean {
  try {
    const req = nodeRequire()
    if (!req) return false
    const fs = req('node:fs') as { existsSync: (p: string) => boolean }
    return fs.existsSync(path)
  } catch {
    return false
  }
}

function toNodeBuffer(buffer: ArrayBuffer | Uint8Array): Buffer {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  const req = nodeRequire()
  if (req) {
    const { Buffer: NodeBuffer } = req('node:buffer') as {
      Buffer: { from: (data: Uint8Array) => Buffer }
    }
    return NodeBuffer.from(bytes)
  }
  return Buffer.from(bytes)
}

/**
 * Soft-load the native napi package. Returns null when the package or platform
 * binary is missing (graceful degrade).
 */
export function tryLoadNativePdfInspector(): NativePdfInspectorModule | null {
  if (cachedModule !== undefined) return cachedModule

  try {
    const req = nodeRequire()
    if (!req) {
      cachedModule = null
      return null
    }
    cachedModule = req('@firecrawl/pdf-inspector') as NativePdfInspectorModule
    return cachedModule
  } catch {
    cachedModule = null
    return null
  }
}

/** Test hook — clear the soft-load cache. */
export function resetNativePdfInspectorLoadCache(): void {
  cachedModule = undefined
}

export function isNativePdfInspectorAvailable(): boolean {
  return tryLoadNativePdfInspector() !== null
}

export function mapNativeClassification(raw: {
  pdfType: string | { toString(): string }
  pageCount: number
  pagesNeedingOcr: number[]
  confidence: number
}): NativePdfClassification {
  return {
    pdfType: String(raw.pdfType),
    pageCount: Number(raw.pageCount) || 0,
    pagesNeedingOcr: Array.isArray(raw.pagesNeedingOcr) ? raw.pagesNeedingOcr.map(Number) : [],
    confidence: Number(raw.confidence) || 0
  }
}

function pageBoundariesFromMarkdown(
  markdown: string
): { text: string; pageBoundaries: Array<{ page: number; start: number; end: number }> } {
  const markerRegex = /<!--\s*Page\s+(\d+)\s*-->/gi
  const matches: Array<{ page: number; index: number; length: number }> = []
  let m: RegExpExecArray | null
  while ((m = markerRegex.exec(markdown)) !== null) {
    matches.push({ page: parseInt(m[1], 10), index: m.index, length: m[0].length })
  }

  if (matches.length === 0) {
    const text = markdown.trim()
    return { text, pageBoundaries: [{ page: 1, start: 0, end: text.length }] }
  }

  let cleanText = ''
  const pageBoundaries: Array<{ page: number; start: number; end: number }> = []
  let lastIndex = 0

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]
    const segment = markdown.slice(lastIndex, current.index)
    if (i > 0) {
      const pageNum = matches[i - 1].page
      pageBoundaries.push({
        page: pageNum,
        start: Math.max(0, cleanText.length - segment.length),
        end: cleanText.length
      })
    }
    cleanText += segment
    lastIndex = current.index + current.length
  }

  const finalSegment = markdown.slice(lastIndex)
  const lastPageNum = matches[matches.length - 1].page
  const start = cleanText.length
  cleanText += finalSegment
  pageBoundaries.push({ page: lastPageNum, start, end: cleanText.length })
  return { text: cleanText.trim(), pageBoundaries }
}

function pageBoundariesFromPages(
  pages: NonNullable<NativeOcrPdfResultLike['pages']>
): { text: string; pageBoundaries: Array<{ page: number; start: number; end: number }> } {
  const parts: string[] = []
  const pageBoundaries: Array<{ page: number; start: number; end: number }> = []
  let offset = 0
  for (const page of pages) {
    const chunk = String(page.markdown ?? '').trim()
    if (parts.length > 0) offset += 2
    const start = offset
    parts.push(chunk)
    offset = start + chunk.length
    pageBoundaries.push({ page: page.pageNumber, start, end: offset })
  }
  return { text: parts.join('\n\n').trim(), pageBoundaries }
}

/** Map upstream OCR/native result into Maktab-compatible extraction + provenance. */
export function mapNativeOcrResult(raw: NativeOcrPdfResultLike): NativePdfInspectorExtraction {
  const warnings: string[] = []
  const pagesRoutedToOcr = Array.isArray(raw.pagesRoutedToOcr)
    ? raw.pagesRoutedToOcr.map(Number)
    : []
  const pagesWithTables = Array.isArray(raw.pagesWithTables) ? raw.pagesWithTables.map(Number) : []

  let text = ''
  let pageBoundaries: Array<{ page: number; start: number; end: number }> = []

  if (Array.isArray(raw.pages) && raw.pages.length > 0) {
    const mapped = pageBoundariesFromPages(raw.pages)
    text = mapped.text
    pageBoundaries = mapped.pageBoundaries
    for (const page of raw.pages) {
      for (const w of page.provenance?.warnings ?? []) warnings.push(String(w))
      if (page.provenance?.hostedRecommended) {
        warnings.push(`Page ${page.pageNumber}: local OCR quality is low; review recommended.`)
      }
    }
  } else {
    const mapped = pageBoundariesFromMarkdown(String(raw.markdown ?? ''))
    text = mapped.text
    pageBoundaries = mapped.pageBoundaries
  }

  const confidences = (raw.pages ?? [])
    .map((p) => p.provenance?.ocrConfidence)
    .filter((c): c is number => typeof c === 'number' && Number.isFinite(c))
  const confidence =
    confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : pagesRoutedToOcr.length > 0
        ? 0.5
        : 0.9

  if (pagesRoutedToOcr.length > 0) {
    warnings.push(
      `Native pdf-inspector routed ${pagesRoutedToOcr.length} page(s) to selective OCR.`
    )
  }

  return {
    text,
    pageCount: Number(raw.pageCount) || pageBoundaries.length || 1,
    pageBoundaries,
    warnings,
    processingTimeMs: raw.processingTimeMs,
    provenance: {
      engineId: NATIVE_PDF_INSPECTOR_ENGINE_ID,
      confidence,
      pagesRoutedToOcr,
      pagesWithTables,
      warnings: [...warnings]
    }
  }
}

/**
 * Classify via native module, or null when unavailable / load failure.
 */
export async function classifyPdfNative(
  buffer: ArrayBuffer | Uint8Array,
  mod: NativePdfInspectorModule | null = tryLoadNativePdfInspector()
): Promise<NativePdfClassification | null> {
  if (!mod) return null
  try {
    const buf = toNodeBuffer(buffer)
    if (typeof mod.classifyPdfAsync === 'function') {
      return mapNativeClassification(await mod.classifyPdfAsync(buf))
    }
    return mapNativeClassification(mod.classifyPdf(buf))
  } catch {
    return null
  }
}

/**
 * Extract with selective OCR (`mode: Auto`, `offline: true` by default).
 * Returns null when the native module/DLL/model path cannot run.
 */
export async function processPdfNative(
  buffer: ArrayBuffer | Uint8Array,
  options: NativeExtractOptions = {},
  mod: NativePdfInspectorModule | null = tryLoadNativePdfInspector()
): Promise<NativePdfInspectorExtraction | null> {
  if (!mod) return null

  const offline = options.offline !== false
  const modelDirectory = options.modelDirectory
  if (offline && modelDirectory && !nodeExistsSync(modelDirectory)) {
    return null
  }

  try {
    const buf = toNodeBuffer(buffer)
    const mode = mod.OcrMode?.Auto ?? 'Auto'
    const raw = await mod.processPdfWithOcr(buf, {
      mode,
      offline,
      ...(modelDirectory ? { modelDirectory } : {}),
      ...(typeof options.dpi === 'number' ? { dpi: options.dpi } : {})
    })
    const mapped = mapNativeOcrResult(raw)
    if (!mapped.text.trim() && (mapped.pageCount ?? 0) === 0) return null
    return mapped
  } catch {
    // Missing PDFium/ONNX/model or napi failure → caller falls back.
    return null
  }
}
