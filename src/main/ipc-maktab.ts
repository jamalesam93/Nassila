import { ipcMain } from 'electron'
import type { MaktabLanguage } from '../engine/maktab/types'
import { extractPdfWithTesseract, isTesseractOcrAvailable } from './maktab/tesseract-ocr'
import { MAKTAB_OCR_PROGRESS_CHANNEL } from '../shared/maktab-ocr-progress'

const MAX_PDF_BYTES = 12 * 1024 * 1024
const ALLOWED_LANGS = new Set<MaktabLanguage>(['eng', 'fra', 'ara'])

function isMaktabLanguage(value: unknown): value is MaktabLanguage {
  return typeof value === 'string' && ALLOWED_LANGS.has(value as MaktabLanguage)
}

function parseLanguages(raw: unknown): MaktabLanguage[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  if (!raw.every(isMaktabLanguage)) return null
  return raw
}

function bufferFromPayload(raw: unknown): ArrayBuffer | null {
  if (raw instanceof ArrayBuffer) return raw
  if (ArrayBuffer.isView(raw)) {
    const view = raw as ArrayBufferView
    return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength)
  }
  return null
}

export function registerMaktabIpcHandlers(): void {
  ipcMain.handle('maktab:ocrAvailable', async () => isTesseractOcrAvailable())

  ipcMain.handle('maktab:ocrExtract', async (event, payload: unknown, options: unknown) => {
    const buffer = bufferFromPayload(payload)
    if (!buffer || buffer.byteLength === 0 || buffer.byteLength > MAX_PDF_BYTES) {
      throw new Error('Invalid PDF buffer for OCR')
    }

    const opts = options && typeof options === 'object' ? (options as Record<string, unknown>) : {}
    const languages = parseLanguages(opts.languages) ?? ['eng', 'fra']
    const dpi = typeof opts.dpi === 'number' && Number.isFinite(opts.dpi) ? Math.min(400, Math.max(150, opts.dpi)) : 300

    try {
      const result = await extractPdfWithTesseract(buffer, { languages, dpi }, (progress) => {
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
