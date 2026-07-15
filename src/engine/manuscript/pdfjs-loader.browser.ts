/** Renderer / Vite: worker URL must be bundled via ?url (not relative to this module path). */
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

export function configurePdfJsWorkerBrowser(pdfjsLib: typeof import('pdfjs-dist')): void {
  if (pdfjsLib.GlobalWorkerOptions.workerSrc) return
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
}
