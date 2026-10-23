/**
 * Shared contract for the optional Indra OCR candidate runtime.
 *
 * The runtime is fetched on first use (weights are a modified OpenRAIL-M
 * license and are never bundled). Main owns the download/install; the renderer
 * only triggers it and renders progress.
 */

export const INDRA_RUNTIME_STATUS_CHANNEL = 'maktab:indraStatus'
export const INDRA_RUNTIME_FETCH_CHANNEL = 'maktab:indraFetch'
export const INDRA_RUNTIME_PROGRESS_CHANNEL = 'maktab:indraFetchProgress'

/** License of the Indra weights (not OSI; see resources/indra-ocr/README.md). */
export const INDRA_LICENSE_LABEL = 'modified OpenRAIL-M'

export type IndraFetchPhase = 'models' | 'venv' | 'package' | 'verify'

export interface IndraFetchProgress {
  phase: IndraFetchPhase
  completed: number
  total: number
  /** Optional human-readable detail (current file, command step). */
  message?: string
}

export interface IndraRuntimeStatus {
  /** Marker + every model file + the Python env are present. */
  ready: boolean
  /** Destination directory (userData/indra-ocr unless overridden). */
  directory: string
  /** Bytes occupied by the model files (0 when not fetched). */
  modelBytes: number
  /** `indra-ocr` package version recorded at fetch time. */
  packageVersion: string | null
  license: string
  /** Present when the last fetch attempt failed. */
  error?: string
}
