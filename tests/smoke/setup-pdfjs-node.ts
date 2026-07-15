/**
 * pdf.js v5 in Node requires DOMMatrix (and related APIs). Electron/renderer has them; Vitest node does not.
 */
import { DOMMatrix, DOMPoint, ImageData } from 'canvas'

const g = globalThis as typeof globalThis & {
  DOMMatrix?: typeof DOMMatrix
  DOMPoint?: typeof DOMPoint
  ImageData?: typeof ImageData
}

if (!g.DOMMatrix) g.DOMMatrix = DOMMatrix as unknown as typeof globalThis.DOMMatrix
if (!g.DOMPoint) g.DOMPoint = DOMPoint as unknown as typeof globalThis.DOMPoint
if (!g.ImageData) g.ImageData = ImageData as unknown as typeof globalThis.ImageData
