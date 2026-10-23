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

/**
 * Structurally decoded signals from `@firecrawl/pdf-inspector` >= 1.23.
 *
 * These replace Nassila's document-wide heuristics where the native engine
 * can answer directly: which fonts lost characters (`cmapGaps`), whether the
 * page carries a fabricated invisible text layer, and which pages the native
 * pass says need OCR.
 */
export interface NativeCmapGap {
  /** Font's /BaseFont name, or its resource name when it has none. */
  font: string
  /** Codes shown through the font's CMap, repeats included. */
  codes: number
  /** Codes without an entry, read from the mapped codes around them. */
  interpolated: number
  /** Codes without an entry, left as U+FFFD. */
  unmapped: number
}

export interface NativeDocumentInfo {
  title?: string
  author?: string
  subject?: string
  keywords?: string
  creator?: string
  producer?: string
  creationDate?: string
  modDate?: string
}

export interface NativePdfSignals {
  cmapGaps: NativeCmapGap[]
  /** Σ unmapped / Σ codes across `cmapGaps`; 0 when the fonts mapped cleanly. */
  cmapGapRatio: number
  /** Upstream flagged structural encoding problems on this document. */
  hasEncodingIssues: boolean
  /** 1-indexed pages the native pass says need OCR (normalized from upstream). */
  pagesNeedingOcr: number[]
  /** 1-indexed pages whose text layer is invisible (fabricated OCR layer). */
  pagesWithInvisibleTextLayer: number[]
  documentInfo?: NativeDocumentInfo
}

export interface NativePdfInspectorExtraction {
  text: string
  pageCount: number
  pageBoundaries: Array<{ page: number; start: number; end: number }>
  warnings: string[]
  provenance: NativePdfInspectorProvenance
  processingTimeMs?: number
  /** Present on native results from pdf-inspector >= 1.23. */
  signals?: NativePdfSignals
}

/** Subset of upstream OcrPdfResult used for mapping (keeps engine free of hard deps). */
export interface NativeOcrPdfResultLike {
  markdown?: string
  pageCount?: number
  pagesRoutedToOcr?: number[]
  pagesWithTables?: number[]
  ocrReasonsByPage?: Array<{ page: number; reasons: string[] }>
  pages?: Array<{
    pageNumber: number
    markdown?: string
    provenance?: { ocrConfidence?: number; warnings?: string[]; hostedRecommended?: boolean }
  }>
  processingTimeMs?: number
}

/**
 * Subset of upstream PdfResult (`processPdf` / `processPdfAsync`) used for the
 * text-only fast path. `cmapGaps` and document info exist only on this result
 * shape — not on `OcrPdfResult`.
 */
export interface NativePdfResultLike {
  markdown?: string
  pageCount?: number
  /** 1-indexed upstream. */
  pagesNeedingOcr?: number[]
  pagesWithTables?: number[]
  pagesWithColumns?: number[]
  ocrReasonsByPage?: Array<{ page: number; reasons: string[] }>
  hasEncodingIssues?: boolean
  cmapGaps?: NativeCmapGap[]
  processingTimeMs?: number
  title?: string
  author?: string
  subject?: string
  keywords?: string
  creator?: string
  producer?: string
  creationDate?: string
  modDate?: string
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
  /**
   * Text-only path (present since pdf-inspector 1.16). Runs on the libuv
   * thread pool and never loads PDFium/ONNX or the OCR models — used when
   * classification says no page needs OCR.
   */
  processPdfAsync?: (buffer: Buffer) => Promise<NativePdfResultLike>
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

/** Upstream OCR reason for a page whose text layer is invisible (fabricated layer). */
export const INVISIBLE_TEXT_LAYER_OCR_REASON = 'invisible_text_layer'

function normalizeCmapGaps(raw: unknown): NativeCmapGap[] {
  if (!Array.isArray(raw)) return []
  const gaps: NativeCmapGap[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const gap = entry as Partial<NativeCmapGap>
    const codes = Number(gap.codes)
    const interpolated = Number(gap.interpolated)
    const unmapped = Number(gap.unmapped)
    if (!Number.isFinite(codes) || !Number.isFinite(interpolated) || !Number.isFinite(unmapped)) {
      continue
    }
    gaps.push({ font: String(gap.font ?? ''), codes, interpolated, unmapped })
  }
  return gaps
}

function isFinitePage(page: unknown): page is number {
  return typeof page === 'number' && Number.isFinite(page)
}

/** Σ unmapped / Σ codes over the document's fonts; 0 when everything mapped. */
export function computeCmapGapRatio(gaps: readonly NativeCmapGap[]): number {
  let codes = 0
  let unmapped = 0
  for (const gap of gaps) {
    codes += Math.max(0, gap.codes)
    unmapped += Math.max(0, gap.unmapped)
  }
  return codes > 0 ? Math.min(1, unmapped / codes) : 0
}

/** Normalize the upstream signals shared by the text-only and OCR result shapes. */
export function mapNativeSignals(raw: {
  cmapGaps?: NativeCmapGap[]
  hasEncodingIssues?: boolean
  /** 1-indexed. */
  pagesNeedingOcr?: number[]
  ocrReasonsByPage?: Array<{ page: number; reasons: string[] }>
  documentInfo?: Partial<NativeDocumentInfo>
}): NativePdfSignals {
  const cmapGaps = normalizeCmapGaps(raw.cmapGaps)
  const pagesWithInvisibleTextLayer = (Array.isArray(raw.ocrReasonsByPage) ? raw.ocrReasonsByPage : [])
    .filter(
      (entry) =>
        Array.isArray(entry?.reasons) &&
        entry.reasons.map(String).includes(INVISIBLE_TEXT_LAYER_OCR_REASON)
    )
    .map((entry) => Number(entry.page))
    .filter(isFinitePage)

  const pagesNeedingOcr = (Array.isArray(raw.pagesNeedingOcr) ? raw.pagesNeedingOcr : [])
    .map(Number)
    .filter(isFinitePage)

  const infoEntries = raw.documentInfo
    ? (Object.entries(raw.documentInfo).filter(
        ([, value]) => typeof value === 'string' && value.length > 0
      ) as Array<[keyof NativeDocumentInfo, string]>)
    : []
  const documentInfo = infoEntries.length > 0 ? (Object.fromEntries(infoEntries) as NativeDocumentInfo) : undefined

  return {
    cmapGaps,
    cmapGapRatio: computeCmapGapRatio(cmapGaps),
    hasEncodingIssues: Boolean(raw.hasEncodingIssues),
    pagesNeedingOcr,
    pagesWithInvisibleTextLayer,
    ...(documentInfo ? { documentInfo } : {})
  }
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

  const signals = mapNativeSignals({
    pagesNeedingOcr: pagesRoutedToOcr,
    ocrReasonsByPage: raw.ocrReasonsByPage
  })

  return {
    text,
    pageCount: Number(raw.pageCount) || pageBoundaries.length || 1,
    pageBoundaries,
    warnings,
    processingTimeMs: raw.processingTimeMs,
    signals,
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
 * Map the text-only `processPdfAsync` result. This is the only upstream shape
 * that carries `cmapGaps` and document info, so the fast path preserves them.
 */
export function mapNativePdfResult(raw: NativePdfResultLike): NativePdfInspectorExtraction {
  const mapped = pageBoundariesFromMarkdown(String(raw.markdown ?? ''))
  const signals = mapNativeSignals({
    cmapGaps: raw.cmapGaps,
    hasEncodingIssues: raw.hasEncodingIssues,
    pagesNeedingOcr: raw.pagesNeedingOcr,
    ocrReasonsByPage: raw.ocrReasonsByPage,
    documentInfo: {
      title: raw.title,
      author: raw.author,
      subject: raw.subject,
      keywords: raw.keywords,
      creator: raw.creator,
      producer: raw.producer,
      creationDate: raw.creationDate,
      modDate: raw.modDate
    }
  })

  const warnings: string[] = []
  const unmapped = signals.cmapGaps.reduce((sum, gap) => sum + Math.max(0, gap.unmapped), 0)
  if (unmapped > 0) {
    warnings.push(
      `Native pdf-inspector found ${unmapped} unmapped code(s) in the PDF text layer.`
    )
  }

  return {
    text: mapped.text,
    pageCount: Number(raw.pageCount) || mapped.pageBoundaries.length || 1,
    pageBoundaries: mapped.pageBoundaries,
    warnings,
    processingTimeMs: raw.processingTimeMs,
    signals,
    provenance: {
      engineId: NATIVE_PDF_INSPECTOR_ENGINE_ID,
      confidence: 0.9,
      pagesRoutedToOcr: [],
      pagesWithTables: Array.isArray(raw.pagesWithTables)
        ? raw.pagesWithTables.map(Number).filter(isFinitePage)
        : [],
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
 *
 * Routing: a cheap `classifyPdfAsync` decides whether any page needs OCR. When
 * none does, the text-only `processPdfAsync` path runs (no PDFium/ONNX/model
 * load, and it is the shape that carries `cmapGaps` + document info). Pages
 * that need OCR go through `processPdfWithOcr` as before.
 *
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
    const classification = await classifyPdfNative(buffer, mod)
    const needsOcr = (classification?.pagesNeedingOcr.length ?? 0) > 0

    if (!needsOcr && typeof mod.processPdfAsync === 'function') {
      try {
        const textRaw = await mod.processPdfAsync(buf)
        const textMapped = mapNativePdfResult(textRaw)
        if (textMapped.pageCount > 0) return textMapped
      } catch {
        // Text-only path failed — fall through to the OCR-shaped call.
      }
    }

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
