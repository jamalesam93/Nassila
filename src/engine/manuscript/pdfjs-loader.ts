/** Load pdf.js for Node (legacy) vs browser/Electron renderer (default build). */
export function isNodePdfJsRuntime(): boolean {
  return (
    typeof process !== 'undefined' &&
    Boolean(process.versions?.node) &&
    typeof window === 'undefined'
  )
}

export async function loadPdfJs(): Promise<typeof import('pdfjs-dist')> {
  if (isNodePdfJsRuntime()) {
    return import('pdfjs-dist/legacy/build/pdf.mjs') as Promise<typeof import('pdfjs-dist')>
  }
  return import('pdfjs-dist')
}

export async function configurePdfJsWorker(pdfjsLib: typeof import('pdfjs-dist')): Promise<void> {
  if (pdfjsLib.GlobalWorkerOptions.workerSrc) return

  if (isNodePdfJsRuntime()) {
    const { pathToFileURL } = await import('node:url')
    const { createRequire } = await import('node:module')
    const require = createRequire(import.meta.url)
    const workerPath = require.resolve('pdfjs-dist/legacy/build/pdf.worker.min.mjs')
    pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href
  } else {
    const { configurePdfJsWorkerBrowser } = await import('./pdfjs-loader.browser')
    configurePdfJsWorkerBrowser(pdfjsLib)
  }
}
