/**
 * OpenCV.js operations for the Indra port. The same library already ships with
 * PaddleOCR (`ppu-ocv` → `@techstark/opencv-js`), so resize and rotation match
 * the OpenCV calls in Indra's Python pipeline.
 *
 * Load it with `require`. A dynamic `import()` is wrapped by the dev runner
 * into a module proxy that is not a real Promise, and this build has no
 * `imdecode`, so page PNGs are decoded with the canvas already used for PDF
 * rasters and converted with `COLOR_RGBA2GRAY`.
 */
import { createRequire } from 'node:module'

import { createCanvas, loadImage } from '@napi-rs/canvas'

import type { GrayImage, IndraImageOps } from '../../engine/maktab/ocr/indra/types'

interface Mat {
  rows: number
  cols: number
  data: Uint8Array
  ucharPtr(row: number, col?: number): Uint8Array
  delete(): void
}

interface Cv {
  CV_8UC1: number
  CV_8UC4: number
  INTER_AREA: number
  INTER_LINEAR: number
  BORDER_CONSTANT: number
  BORDER_REPLICATE: number
  COLOR_RGBA2GRAY: number
  Mat: new () => Mat
  Size: new (width: number, height: number) => unknown
  Point: new (x: number, y: number) => unknown
  Scalar: new (v0: number, v1?: number, v2?: number, v3?: number) => unknown
  matFromArray(rows: number, cols: number, type: number, data: ArrayLike<number>): Mat
  resize(src: Mat, dst: Mat, size: unknown, fx: number, fy: number, interp: number): void
  cvtColor(src: Mat, dst: Mat, code: number): void
  getRotationMatrix2D(center: unknown, angle: number, scale: number): Mat
  warpAffine(
    src: Mat,
    dst: Mat,
    matrix: Mat,
    size: unknown,
    flags: number,
    borderMode: number,
    borderValue?: unknown
  ): void
}

function isCv(value: unknown): value is Cv {
  return (
    Boolean(value) &&
    typeof (value as Cv).resize === 'function' &&
    typeof (value as Cv).cvtColor === 'function'
  )
}

let cvPromise: Promise<Cv> | null = null

export function loadIndraCv(): Promise<Cv> {
  if (!cvPromise) {
    cvPromise = (async () => {
      const require = createRequire(import.meta.url)
      const loaded: unknown = require('@techstark/opencv-js')
      const cv = loaded instanceof Promise ? await loaded : loaded
      if (!isCv(cv)) throw new Error('OpenCV.js did not load')
      return cv
    })().catch((err: unknown) => {
      cvPromise = null
      throw err
    })
  }
  return cvPromise
}

function toMat(cv: Cv, gray: GrayImage): Mat {
  return cv.matFromArray(gray.height, gray.width, cv.CV_8UC1, gray.data)
}

function fromMat(mat: Mat): GrayImage {
  const data = new Uint8Array(mat.cols * mat.rows)
  for (let y = 0; y < mat.rows; y++) {
    data.set(mat.ucharPtr(y).subarray(0, mat.cols), y * mat.cols)
  }
  return { width: mat.cols, height: mat.rows, data }
}

export function opencvImageOps(cv: Cv): IndraImageOps {
  return {
    resize(src, width, height, interp) {
      const input = toMat(cv, src)
      const output = new cv.Mat()
      try {
        cv.resize(
          input,
          output,
          new cv.Size(width, height),
          0,
          0,
          interp === 'area' ? cv.INTER_AREA : cv.INTER_LINEAR
        )
        return fromMat(output)
      } finally {
        input.delete()
        output.delete()
      }
    },
    warp(src, degrees, border) {
      const input = toMat(cv, src)
      const output = new cv.Mat()
      const matrix = cv.getRotationMatrix2D(new cv.Point(src.width / 2, src.height / 2), degrees, 1)
      try {
        cv.warpAffine(
          input,
          output,
          matrix,
          new cv.Size(src.width, src.height),
          cv.INTER_LINEAR,
          border === 'replicate' ? cv.BORDER_REPLICATE : cv.BORDER_CONSTANT,
          new cv.Scalar(0)
        )
        return fromMat(output)
      } finally {
        input.delete()
        output.delete()
        matrix.delete()
      }
    }
  }
}

/** Decode a PNG to gray with the same coefficients as OpenCV `COLOR_RGBA2GRAY`. */
export async function pngToGray(png: Uint8Array): Promise<GrayImage> {
  const cv = await loadIndraCv()
  const image = await loadImage(Buffer.from(png))
  const canvas = createCanvas(image.width, image.height)
  const context = canvas.getContext('2d')
  context.drawImage(image, 0, 0)
  const rgba = context.getImageData(0, 0, image.width, image.height)
  const src = cv.matFromArray(image.height, image.width, cv.CV_8UC4, rgba.data)
  const dst = new cv.Mat()
  try {
    cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY)
    if (dst.rows <= 0 || dst.cols <= 0) throw new Error('Could not decode the page image')
    return fromMat(dst)
  } finally {
    src.delete()
    dst.delete()
  }
}
