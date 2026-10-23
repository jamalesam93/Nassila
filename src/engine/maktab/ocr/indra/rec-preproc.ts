/**
 * Line crops and recognizer batches from Indra `rec_preproc.py`.
 */
import type { GrayImage, IndraImageOps, InkLine, LineBox } from './types'

export const LINE_HEIGHT = 32
export const PAD_Y = 0.2
export const PAD_X = 0.3
export const WIDTH_MULTIPLE = 8

function percentiles(values: Uint8Array): [number, number, number] {
  const n = values.length
  const hist = new Int32Array(256)
  for (let i = 0; i < n; i++) hist[values[i]] += 1
  const cum = new Int32Array(256)
  let running = 0
  for (let i = 0; i < 256; i++) {
    running += hist[i]
    cum[i] = running
  }
  const search = (target: number): number => {
    let lo = 0
    let hi = 255
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (cum[mid] > target) hi = mid
      else lo = mid + 1
    }
    return lo
  }
  const out: number[] = []
  for (const q of [0.02, 0.5, 0.98]) {
    const x = q * (n - 1)
    const i = Math.floor(x)
    const g = x - i
    const lo = search(i)
    const hi = search(Math.min(i + 1, n - 1))
    const d = hi - lo
    out.push(g >= 0.5 ? hi - d * (1 - g) : lo + d * g)
  }
  return [out[0], out[1], out[2]]
}

export function isDarkLine(gray: GrayImage, box: LineBox): boolean {
  const x0 = Math.max(0, Math.floor(box.x0))
  const y0 = Math.max(0, Math.floor(box.y0))
  const x1 = Math.min(gray.width, Math.floor(box.x1) + 1)
  const y1 = Math.min(gray.height, Math.floor(box.y1) + 1)
  if (x1 <= x0 || y1 <= y0) return false
  const sample = new Uint8Array((x1 - x0) * (y1 - y0))
  let n = 0
  for (let y = y0; y < y1; y++) {
    const row = y * gray.width
    for (let x = x0; x < x1; x++) sample[n++] = gray.data[row + x]
  }
  const [lo, med, hi] = percentiles(sample.subarray(0, n))
  return hi - med > 2 * (med - lo) + 8
}

export function cropLine(
  gray: GrayImage,
  box: LineBox,
  height: number,
  window: number,
  ops: IndraImageOps,
  dark: boolean | null
): InkLine {
  let padY = PAD_Y
  padY = (window * (1 + 2 * padY) - 1) / 2
  const outH = height * window
  const h = Math.max(1, box.y1 - box.y0)
  const x0 = box.x0 - PAD_X * h
  const x1 = box.x1 + PAD_X * h
  const y0 = box.y0 - padY * h
  const y1 = box.y1 + padY * h
  const ix0 = Math.floor(x0)
  const iy0 = Math.floor(y0)
  const ix1 = Math.ceil(x1)
  const iy1 = Math.ceil(y1)
  const cw = Math.max(1, ix1 - ix0)
  const ch = Math.max(1, iy1 - iy0)
  const sx0 = Math.max(0, ix0)
  const sy0 = Math.max(0, iy0)
  const sx1 = Math.min(gray.width, ix1)
  const sy1 = Math.min(gray.height, iy1)
  const inverted = dark ?? isDarkLine(gray, box)
  const crop = new Uint8Array(ch * cw)
  crop.fill(inverted ? 0 : 255)
  for (let y = sy0; y < sy1; y++) {
    const src = y * gray.width
    const dst = (y - iy0) * cw + (sx0 - ix0)
    crop.set(gray.data.subarray(src + sx0, src + sx1), dst)
  }
  const outW = Math.max(WIDTH_MULTIPLE, Math.min(4096, Math.round((cw * outH) / ch)))
  const resized = ops.resize(
    { width: cw, height: ch, data: crop },
    outW,
    outH,
    ch > outH ? 'area' : 'linear'
  )
  const data = new Float32Array(resized.width * resized.height)
  for (let i = 0; i < resized.data.length; i++) {
    const value = resized.data[i] / 255
    data[i] = inverted ? value : 1 - value
  }
  return { width: resized.width, height: resized.height, data }
}

export function padBatch(
  lines: InkLine[],
  multiple = WIDTH_MULTIPLE
): {
  data: Float32Array
  batch: number
  height: number
  width: number
  widths: Int32Array
} {
  const height = lines[0].height
  let width = 0
  for (const line of lines) width = Math.max(width, line.width)
  width = Math.ceil(width / multiple) * multiple
  const data = new Float32Array(lines.length * height * width)
  const widths = new Int32Array(lines.length)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    widths[i] = line.width
    for (let y = 0; y < height; y++) {
      data.set(
        line.data.subarray(y * line.width, (y + 1) * line.width),
        (i * height + y) * width
      )
    }
  }
  return { data, batch: lines.length, height, width, widths }
}

/** Group line indices into batches of similar width (Indra `width_batches`). */
export function widthBatches(
  widths: readonly number[],
  maxBatch = 64,
  maxRatio = 1.3,
  minWidth = 64,
  maxArea = 64 * 640
): number[][] {
  const order = widths.map((_, i) => i).sort((a, b) => widths[a] - widths[b])
  const batches: number[][] = []
  for (const i of order) {
    const last = batches[batches.length - 1]
    const width = Math.max(widths[i], minWidth)
    if (
      last &&
      last.length < maxBatch &&
      width <= maxRatio * Math.max(widths[last[0]], minWidth) &&
      (last.length + 1) * width <= maxArea
    ) {
      last.push(i)
    } else {
      batches.push([i])
    }
  }
  return batches
}
