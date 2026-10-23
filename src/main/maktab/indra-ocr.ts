/**
 * Indra OCR in the main process, on the onnxruntime-node the app already ships.
 * No Python. Weights stay a download (modified OpenRAIL-M); see indra-runtime.ts.
 * Arabic pages go here first. A page that fails or comes back near-empty is
 * re-read by PaddleOCR.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { InferenceSession, Tensor } from 'onnxruntime-common'
import { MIN_ARABIC_PAGE_CHARS, chooseArabicPage } from '../../engine/maktab/ocr/indra/route'
import { recognizeGrayPage, type IndraModels } from '../../engine/maktab/ocr/indra/recognize'
import type { DetOutput, OrderOutput, RecOutput } from '../../engine/maktab/ocr/indra/types'
import { Vocab } from '../../engine/maktab/ocr/indra/vocab'
import type {
  MaktabExtractionResult,
  MaktabLanguage,
  MaktabOcrExtractOptions
} from '../../engine/maktab/types'
import {
  extractPdfWithArabicPaddle,
  recognizeArabicPageImage
} from './arabic-paddle-ocr'
import { loadIndraCv, opencvImageOps, pngToGray } from './indra-cv'
import { indraRuntimePaths, isIndraModelReady } from './indra-runtime'
import { rasterizePdfPage } from './pdf-page-raster'

const MAX_OCR_PAGES = 200

interface OrtModule {
  InferenceSession: {
    create(
      path: string,
      options?: {
        intraOpNumThreads?: number
        interOpNumThreads?: number
        graphOptimizationLevel?: 'all'
        enableCpuMemArena?: boolean
        executionProviders?: string[]
      }
    ): Promise<InferenceSession>
  }
  Tensor: new (type: 'float32' | 'int64' | 'bool', data: unknown, dims: readonly number[]) => Tensor
}

let ortPromise: Promise<OrtModule> | null = null

function ort(): Promise<OrtModule> {
  if (!ortPromise) {
    ortPromise = import('onnxruntime-node') as Promise<OrtModule>
  }
  return ortPromise
}

interface LoadedIndra {
  directory: string
  models: IndraModels
}

let loaded: LoadedIndra | null = null

function floatTensor(mod: OrtModule, data: Float32Array, dims: readonly number[]): Tensor {
  return new mod.Tensor('float32', data, dims)
}

async function runDet(session: InferenceSession, ink: Float32Array, height: number, width: number): Promise<DetOutput> {
  const mod = await ort()
  const out = await session.run({ x: floatTensor(mod, ink, [1, 1, height, width]) })
  const tensor = out.out ?? out[session.outputNames[0]]
  return {
    data: tensor.data as Float32Array,
    height: Number(tensor.dims[2]),
    width: Number(tensor.dims[3])
  }
}

async function runWidths(
  session: InferenceSession,
  data: Float32Array,
  batch: number,
  height: number,
  width: number,
  widths: Int32Array,
  output: string
): Promise<Tensor> {
  const mod = await ort()
  const feeds = {
    x: floatTensor(mod, data, [batch, 1, height, width]),
    widths: new mod.Tensor('int64', BigInt64Array.from(widths, (value) => BigInt(value)), [batch])
  }
  const result = await session.run(feeds)
  return result[output] ?? result[session.outputNames[0]]
}

function recOutput(tensorIds: Tensor, tensorConf: Tensor, tensorLengths: Tensor): RecOutput {
  return {
    ids: tensorIds.data as BigInt64Array,
    conf: tensorConf.data as Float32Array,
    lengths: tensorLengths.data as BigInt64Array,
    timeSteps: Number(tensorIds.dims[1] ?? 1),
    batch: Number(tensorIds.dims[0] ?? 1)
  }
}

export async function loadIndraModels(modelsDirectory: string): Promise<IndraModels> {
  if (loaded?.directory === modelsDirectory) return loaded.models
  const mod = await ort()
  const options = {
    intraOpNumThreads: 4,
    interOpNumThreads: 1,
    graphOptimizationLevel: 'all' as const,
    enableCpuMemArena: false,
    executionProviders: ['cpu']
  }
  const meta = JSON.parse(readFileSync(join(modelsDirectory, 'meta.json'), 'utf8')) as {
    det_long_side: number
    rec_height: number
    rec_window?: number
    script_groups?: string[]
    vocab: string
    vocab_rtl?: string
  }
  const det = await mod.InferenceSession.create(join(modelsDirectory, 'det.onnx'), options)
  const rec = await mod.InferenceSession.create(join(modelsDirectory, 'rec.onnx'), options)
  const rtl = await mod.InferenceSession.create(join(modelsDirectory, 'rec_rtl.onnx'), options)
  const script = await mod.InferenceSession.create(join(modelsDirectory, 'script.onnx'), options)
  const orient = await mod.InferenceSession.create(join(modelsDirectory, 'orient.onnx'), options)
  const order = await mod.InferenceSession.create(join(modelsDirectory, 'order.onnx'), options)
  const models: IndraModels = {
    detLongSide: meta.det_long_side,
    recHeight: meta.rec_height,
    recWindow: meta.rec_window ?? 1,
    scriptGroups: meta.script_groups ?? ['base', 'cjk', 'rtl', 'other'],
    base: Vocab.fromJson(meta.vocab),
    rtl: meta.vocab_rtl ? Vocab.fromJson(meta.vocab_rtl) : null,
    det: (ink, height, width) => runDet(det, ink, height, width),
    script: async (data, batch, height, width, widths) => {
      const tensor = await runWidths(script, data, batch, height, width, widths, 'p')
      return tensor.data as Float32Array
    },
    rec: async (which, data, batch, height, width, widths) => {
      const session = which === 'rtl' ? rtl : rec
      const result = await session.run({
        x: floatTensor(mod, data, [batch, 1, height, width]),
        widths: new mod.Tensor('int64', BigInt64Array.from(widths, (value) => BigInt(value)), [batch])
      })
      return recOutput(result.ids, result.conf, result.lengths)
    },
    orient: async (ink) => {
      const result = await orient.run({ x: floatTensor(mod, ink, [1, 1, 768, 768]) })
      const tensor = result.p ?? result[orient.outputNames[0]]
      return tensor.data as Float32Array
    },
    order: async (feats, n) => {
      const mask = new Uint8Array(n)
      mask.fill(1)
      const result = await order.run({
        feats: floatTensor(mod, feats, [1, n, 16]),
        mask: new mod.Tensor('bool', mask, [1, n])
      })
      const a = result.a
      const cls = result.cls
      const same = result.same
      if (!a || !cls || !same) return null
      const output: OrderOutput = {
        a: a.data as Float32Array,
        cls: cls.data as Float32Array,
        same: same.data as Float32Array,
        n
      }
      return output
    }
  }
  loaded = { directory: modelsDirectory, models }
  return models
}

/** Test hook. */
export function resetIndraModels(): void {
  loaded = null
}

export async function recognizeIndraPng(
  png: Uint8Array,
  modelsDirectory: string
): Promise<{ text: string; confidence: number }> {
  const [cv, models] = await Promise.all([loadIndraCv(), loadIndraModels(modelsDirectory)])
  const gray = await pngToGray(png)
  return recognizeGrayPage(gray, models, opencvImageOps(cv))
}

function resolveIndraModelsDir(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { app } = require('electron') as typeof import('electron')
    return indraRuntimePaths(
      process.env.NASSILA_INDRA_DIR && process.env.NASSILA_INDRA_DIR.length > 0
        ? process.env.NASSILA_INDRA_DIR
        : join(app.getPath('userData'), 'indra-ocr')
    ).models
  } catch {
    return null
  }
}

/**
 * Arabic OCR entry. Indra reads each page when its models are installed.
 * Paddle reads the document when they are not, and any page Indra cannot read.
 */
export async function extractPdfWithArabicOcr(
  buffer: ArrayBuffer,
  options: MaktabOcrExtractOptions,
  onProgress?: (progress: { processed: number; total: number; elapsedMs: number }) => void
): Promise<MaktabExtractionResult> {
  const modelsDirectory = resolveIndraModelsDir()
  if (!modelsDirectory || !isIndraModelReady(modelsDirectory)) {
    return extractPdfWithArabicPaddle(buffer, options, onProgress)
  }

  const dpi = options.dpi ?? 300
  const languages: MaktabLanguage[] = options.languages?.includes('ara')
    ? options.languages
    : (['ara'] as MaktabLanguage[])
  const warnings: string[] = []
  const [{ loadPdfJs, configurePdfJsWorker }] = await Promise.all([
    import('../../engine/manuscript/pdfjs-loader')
  ])
  const pdfjsLib = await loadPdfJs()
  await configurePdfJsWorker(pdfjsLib)

  let models: IndraModels
  let ops: ReturnType<typeof opencvImageOps>
  try {
    const cv = await loadIndraCv()
    ops = opencvImageOps(cv)
    models = await loadIndraModels(modelsDirectory)
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    warnings.push(`Indra OCR could not start (${detail}). Arabic pages used PaddleOCR.`)
    const paddle = await extractPdfWithArabicPaddle(buffer, options, onProgress)
    return { ...paddle, warnings: warnings.concat(paddle.warnings) }
  }

  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) }).promise
  const pageCount = Math.min(pdf.numPages, MAX_OCR_PAGES)
  if (pdf.numPages > MAX_OCR_PAGES) {
    warnings.push(`OCR limited to first ${MAX_OCR_PAGES} of ${pdf.numPages} pages.`)
  }

  const pageTexts: string[] = []
  const pageConfidences: number[] = []
  let fallbacks = 0
  const startedAt = Date.now()
  onProgress?.({ processed: 0, total: pageCount, elapsedMs: 0 })

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const png = await rasterizePdfPage(pdf, page, dpi)
    const chosen = await chooseArabicPage(
      async () => {
        const gray = await pngToGray(png)
        return recognizeGrayPage(gray, models, ops)
      },
      async () => {
        const paddle = await recognizeArabicPageImage({ bytes: png, dpi })
        return { text: paddle.text, confidence: paddle.confidence }
      }
    )
    if (chosen.engine === 'paddle') fallbacks += 1
    const text = chosen.result.text.trim()
    if (text) {
      pageTexts.push(text)
      pageConfidences.push(chosen.result.confidence)
    }
    onProgress?.({ processed: pageNum, total: pageCount, elapsedMs: Date.now() - startedAt })
  }

  if (fallbacks > 0) {
    warnings.push(
      `PaddleOCR read ${fallbacks} page(s) where Indra returned little or no text.`
    )
  }

  const text = pageTexts.join('\n\n').trim()
  let offset = 0
  const pageBoundaries = pageTexts.map((pageText, index) => {
    const boundary = { page: index + 1, start: offset, end: offset + pageText.length }
    offset = boundary.end + 2
    return boundary
  })
  if (text.length < MIN_ARABIC_PAGE_CHARS && pageTexts.length > 0) {
    warnings.push(
      'Very little Arabic OCR text was recovered. Prefer DOCX for broken font-encoding PDFs.'
    )
  }

  return {
    text,
    pageCount: pageTexts.length || 1,
    pageBoundaries,
    pageConfidences,
    warnings,
    tier: 'ocr',
    languages,
    needsReview: text.length < MIN_ARABIC_PAGE_CHARS || pageConfidences.some((c) => c < 0.78)
  }
}
