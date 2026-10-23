import { ipcMain } from 'electron'
import type { MaktabLanguage } from '../engine/maktab/types'
import {
  classifyPdfNative,
  isNativePdfInspectorAvailable,
  processPdfNative
} from '../engine/maktab/native-pdf-inspector'
import {
  registerMainNativePdfBackend,
  resolvePdfInspectorModelDirectory
} from './maktab/native-pdf-inspector'
import { extractPdfWithTesseract, isTesseractOcrAvailable } from './maktab/tesseract-ocr'
import {
  isArabicPaddleOcrAvailable,
  recognizeArabicPageImage
} from './maktab/arabic-paddle-ocr'
import { extractPdfWithArabicOcr } from './maktab/indra-ocr'
import {
  assertMaktabPdfBuffer,
  clampMaktabDpi
} from './maktab/pdf-buffer-sanitize'
import {
  fetchIndraRuntimeOnce,
  getIndraRuntimeStatus,
  resolveIndraRuntimeDirectory
} from './maktab/indra-runtime'
import {
  INDRA_RUNTIME_FETCH_CHANNEL,
  INDRA_RUNTIME_PROGRESS_CHANNEL,
  INDRA_RUNTIME_STATUS_CHANNEL
} from '../shared/indra-runtime'
import { MAKTAB_OCR_PROGRESS_CHANNEL } from '../shared/maktab-ocr-progress'

const ALLOWED_LANGS = new Set<MaktabLanguage>(['eng', 'fra', 'ara'])

function resolveIndraDirectoryFromApp(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { app } = require('electron') as typeof import('electron')
    return resolveIndraRuntimeDirectory({
      userDataPath: app.getPath('userData'),
      envDir: process.env.NASSILA_INDRA_DIR
    })
  } catch {
    return resolveIndraRuntimeDirectory({
      userDataPath: process.cwd(),
      envDir: process.env.NASSILA_INDRA_DIR
    })
  }
}

function resolvePdfInspectorModelDirectoryFromApp(): string | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { app } = require('electron') as typeof import('electron')
    return resolvePdfInspectorModelDirectory({
      isPackaged: app.isPackaged,
      appPath: app.getAppPath(),
      resourcesPath: process.resourcesPath,
      userDataPath: app.getPath('userData')
    })
  } catch {
    return undefined
  }
}

function isMaktabLanguage(value: unknown): value is MaktabLanguage {
  return typeof value === 'string' && ALLOWED_LANGS.has(value as MaktabLanguage)
}

function parseLanguages(raw: unknown): MaktabLanguage[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  if (!raw.every(isMaktabLanguage)) return null
  return raw
}

export function registerMaktabIpcHandlers(): void {
  registerMainNativePdfBackend()

  ipcMain.handle('maktab:ocrAvailable', async () => isTesseractOcrAvailable())

  ipcMain.handle('maktab:arabicOcrAvailable', async () => isArabicPaddleOcrAvailable())

  // Optional Indra candidate runtime: fetched on first use, never bundled.
  ipcMain.handle(INDRA_RUNTIME_STATUS_CHANNEL, async () =>
    getIndraRuntimeStatus(resolveIndraDirectoryFromApp())
  )

  ipcMain.handle(INDRA_RUNTIME_FETCH_CHANNEL, async (event) => {
    const directory = resolveIndraDirectoryFromApp()
    return fetchIndraRuntimeOnce(directory, {
      onProgress: (progress) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send(INDRA_RUNTIME_PROGRESS_CHANNEL, progress)
        }
      }
    })
  })

  ipcMain.handle('maktab:nativeAvailable', async () => isNativePdfInspectorAvailable())

  ipcMain.handle('maktab:nativeClassify', async (_event, payload: unknown) => {
    const buffer = assertMaktabPdfBuffer(payload, 'native classify')
    return classifyPdfNative(buffer)
  })

  ipcMain.handle('maktab:nativeExtract', async (_event, payload: unknown, options: unknown) => {
    const buffer = assertMaktabPdfBuffer(payload, 'native extract')
    const opts = options && typeof options === 'object' ? (options as Record<string, unknown>) : {}
    const modelDirectory =
      typeof opts.modelDirectory === 'string' && opts.modelDirectory.length > 0
        ? opts.modelDirectory
        : resolvePdfInspectorModelDirectoryFromApp()
    const result = await processPdfNative(buffer, {
      offline: opts.offline !== false,
      modelDirectory,
      dpi: clampMaktabDpi(opts.dpi, 72, 400)
    })
    if (!result) return null
    return {
      text: result.text,
      pageCount: result.pageCount,
      pageBoundaries: result.pageBoundaries,
      warnings: result.warnings,
      processingTimeMs: result.processingTimeMs,
      provenance: result.provenance
    }
  })

  ipcMain.handle('maktab:arabicOcrRecognize', async (_event, payload: unknown) => {
    const opts = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
    const raw = opts.bytes
    let bytes: Uint8Array | null = null
    if (raw instanceof ArrayBuffer) {
      bytes = new Uint8Array(raw)
    } else if (ArrayBuffer.isView(raw) && raw.buffer instanceof ArrayBuffer) {
      bytes = new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength)
    }
    if (!bytes || bytes.length === 0 || bytes.length > 40 * 1024 * 1024) {
      throw new Error('Invalid Arabic OCR page image')
    }
    const dpi = clampMaktabDpi(opts.dpi, 72, 400, 300) ?? 300
    return recognizeArabicPageImage({
      bytes,
      width: typeof opts.width === 'number' ? opts.width : undefined,
      height: typeof opts.height === 'number' ? opts.height : undefined,
      dpi
    })
  })

  ipcMain.handle('maktab:ocrExtract', async (event, payload: unknown, options: unknown) => {
    const buffer = assertMaktabPdfBuffer(payload, 'OCR')

    const opts = options && typeof options === 'object' ? (options as Record<string, unknown>) : {}
    const languages = parseLanguages(opts.languages) ?? ['eng', 'fra']
    const dpi = clampMaktabDpi(opts.dpi, 150, 400, 300) ?? 300
    const useArabic = languages.includes('ara')

    try {
      const result = useArabic
        ? await extractPdfWithArabicOcr(buffer, { languages, dpi }, (progress) => {
            if (!event.sender.isDestroyed()) {
              event.sender.send(MAKTAB_OCR_PROGRESS_CHANNEL, progress)
            }
          })
        : await extractPdfWithTesseract(buffer, { languages, dpi }, (progress) => {
            if (!event.sender.isDestroyed()) {
              event.sender.send(MAKTAB_OCR_PROGRESS_CHANNEL, progress)
            }
          })
      // Structured-cloneable plain object for IPC (no class instances / Buffers).
      return {
        text: String(result.text ?? ''),
        pageCount: Number(result.pageCount) || 1,
        pageBoundaries: (result.pageBoundaries ?? []).map((b) => ({
          page: Number(b.page),
          start: Number(b.start),
          end: Number(b.end)
        })),
        warnings: (result.warnings ?? []).map(String),
        tier: result.tier === 'ocr' ? 'ocr' : 'embedded_text',
        languages: [...(result.languages ?? languages)],
        needsReview: Boolean(result.needsReview),
        pageConfidences: Array.isArray(result.pageConfidences)
          ? result.pageConfidences.map((c) => Number(c) || 0)
          : undefined
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(message)
    }
  })
}
