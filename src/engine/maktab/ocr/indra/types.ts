/** Grayscale page and the image operations Indra's Python pipeline asks of OpenCV. */

export interface GrayImage {
  width: number
  height: number
  data: Uint8Array
}

export interface IndraImageOps {
  resize(
    src: GrayImage,
    width: number,
    height: number,
    interp: 'area' | 'linear'
  ): GrayImage
  /** Rotate about the centre. `constant` borders with 0 (skew search); `replicate` (deskew). */
  warp(src: GrayImage, degrees: number, border: 'constant' | 'replicate'): GrayImage
}

export interface LineBox {
  x0: number
  y0: number
  x1: number
  y1: number
  score: number
}

/** A recognizer token: a vocab id (base model) or a character (group model), plus page x. */
export interface LineToken {
  v: string | number
  x: number
}

export interface LineRec {
  text: string
  conf: number
  tokens: LineToken[]
}

export interface InkLine {
  width: number
  height: number
  data: Float32Array
}

export interface DetOutput {
  /** Channel-major `[3, height, width]`: core logit, top distance, bottom distance. */
  data: Float32Array
  height: number
  width: number
}

export interface RecOutput {
  ids: ArrayLike<bigint>
  conf: ArrayLike<number>
  lengths: ArrayLike<bigint>
  timeSteps: number
  batch: number
}

export interface OrderOutput {
  /** Pairwise order logits `[n, n]`. */
  a: Float32Array
  /** Layout class logits `[n, 10]`. */
  cls: Float32Array
  /** Same-block logits `[n, n]`. */
  same: Float32Array
  n: number
}
