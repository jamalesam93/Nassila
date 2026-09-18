/**
 * Shared PDF page rasterization for Maktab OCR backends (Tesseract / Arabic Paddle).
 */
export async function rasterizePdfPage(
  pdf: import('pdfjs-dist').PDFDocumentProxy,
  page: import('pdfjs-dist').PDFPageProxy,
  dpi: number
): Promise<Buffer> {
  const scale = dpi / 72
  const viewport = page.getViewport({ scale })
  const width = Math.ceil(viewport.width)
  const height = Math.ceil(viewport.height)
  // pdf.js v5 NodeCanvasFactory uses @napi-rs/canvas — must render via pdf.canvasFactory,
  // not node-canvas, or embedded images throw "Image or Canvas expected".
  const canvasFactory = pdf.canvasFactory as {
    create: (
      width: number,
      height: number
    ) => { canvas: { toBuffer: (mime: string) => Buffer }; context: unknown }
    destroy: (entry: { canvas: unknown; context: unknown }) => void
  }
  const canvasEntry = canvasFactory.create(width, height)

  try {
    await page.render({
      canvas: null,
      canvasContext: canvasEntry.context as CanvasRenderingContext2D,
      viewport
    }).promise
    return canvasEntry.canvas.toBuffer('image/png')
  } finally {
    canvasFactory.destroy(canvasEntry)
  }
}
