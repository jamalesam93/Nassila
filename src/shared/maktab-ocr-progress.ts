/** Progress events for main-process Maktab OCR (IPC → renderer). */

export const MAKTAB_OCR_PROGRESS_CHANNEL = 'maktab:ocrProgress'

export type MaktabOcrProgressEvent = {
  processed: number
  total: number
  /** Wall-clock ms since OCR started (optional ETA helper). */
  elapsedMs?: number
}
