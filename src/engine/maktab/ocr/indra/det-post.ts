/**
 * Line detector pre/post from Indra `det_post.py`.
 * Connected components are pure 4-connected (the component set matches OpenCV).
 */
import type { GrayImage, IndraImageOps, LineBox } from './types'

const CORE_X_SHRINK = 0.15
const OUT_STRIDE = 2
const INPUT_MULTIPLE = 32

export function components4(
  mask: Uint8Array,
  width: number,
  height: number
): { count: number; labels: Int32Array; stats: Int32Array } {
  const pixels = width * height
  const parent = new Int32Array(pixels)
  for (let i = 0; i < pixels; i++) parent[i] = i

  const find = (index: number): number => {
    let root = index
    while (parent[root] !== root) root = parent[root]
    while (parent[index] !== root) {
      const next = parent[index]
      parent[index] = root
      index = next
    }
    return root
  }

  const union = (a: number, b: number): void => {
    const ra = find(a)
    const rb = find(b)
    if (ra === rb) return
    if (ra < rb) parent[rb] = ra
    else parent[ra] = rb
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      if (!mask[i]) continue
      if (x > 0 && mask[i - 1]) union(i, i - 1)
      if (y > 0 && mask[i - width]) union(i, i - width)
    }
  }

  const rootToLabel = new Map<number, number>()
  const labels = new Int32Array(pixels)
  const minX = [0]
  const minY = [0]
  const maxX = [0]
  const maxY = [0]
  const area = [0]
  let count = 1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      if (!mask[i]) continue
      const root = find(i)
      let label = rootToLabel.get(root)
      if (label === undefined) {
        label = count
        count += 1
        rootToLabel.set(root, label)
        minX.push(x)
        minY.push(y)
        maxX.push(x)
        maxY.push(y)
        area.push(0)
      }
      labels[i] = label
      if (x < minX[label]) minX[label] = x
      if (y < minY[label]) minY[label] = y
      if (x > maxX[label]) maxX[label] = x
      if (y > maxY[label]) maxY[label] = y
      area[label] += 1
    }
  }

  const stats = new Int32Array(count * 5)
  for (let label = 1; label < count; label++) {
    const offset = label * 5
    stats[offset] = minX[label]
    stats[offset + 1] = minY[label]
    stats[offset + 2] = maxX[label] - minX[label] + 1
    stats[offset + 3] = maxY[label] - minY[label] + 1
    stats[offset + 4] = area[label]
  }
  return { count, labels, stats }
}

export function pageToInput(
  gray: GrayImage,
  longSide: number,
  ops: IndraImageOps
): { ink: Float32Array; height: number; width: number; scale: number } {
  const scale = longSide / Math.max(gray.height, gray.width)
  const nh = Math.max(1, Math.round(gray.height * scale))
  const nw = Math.max(1, Math.round(gray.width * scale))
  const resized =
    nh === gray.height && nw === gray.width
      ? gray
      : ops.resize(gray, nw, nh, scale < 1 ? 'area' : 'linear')
  const ph = Math.ceil(nh / INPUT_MULTIPLE) * INPUT_MULTIPLE
  const pw = Math.ceil(nw / INPUT_MULTIPLE) * INPUT_MULTIPLE
  const ink = new Float32Array(ph * pw)
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      ink[y * pw + x] = 1 - resized.data[y * resized.width + x] / 255
    }
  }
  return { ink, height: ph, width: pw, scale }
}

/** Decode `[3, h, w]` detector output into boxes in input pixels. */
export function decodeDet(
  out: Float32Array,
  height: number,
  width: number,
  thresh = 0.5,
  minArea = 2
): LineBox[] {
  const plane = height * width
  const prob = new Float32Array(plane)
  const mask = new Uint8Array(plane)
  for (let i = 0; i < plane; i++) {
    const p = 1 / (1 + Math.exp(-out[i]))
    prob[i] = p
    if (p > thresh) mask[i] = 1
  }
  const { count, labels, stats } = components4(mask, width, height)
  if (count <= 1) return []

  const topSum = new Float64Array(count)
  const botSum = new Float64Array(count)
  const scoreSum = new Float64Array(count)
  const seen = new Float64Array(count)
  for (let y = 0; y < height; y++) {
    const ys = (y + 0.5) * OUT_STRIDE
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const label = labels[i]
      if (label <= 0) continue
      topSum[label] += ys - out[plane + i]
      botSum[label] += ys + out[2 * plane + i]
      scoreSum[label] += prob[i]
      seen[label] += 1
    }
  }

  const boxes: LineBox[] = []
  for (let label = 1; label < count; label++) {
    const offset = label * 5
    if (stats[offset + 4] < minArea) continue
    const n = Math.max(seen[label], 1)
    const y0 = topSum[label] / n
    const y1 = botSum[label] / n
    const lh = Math.max(1, y1 - y0)
    const ex = Math.min(CORE_X_SHRINK * lh, 0.5 * lh)
    const left = stats[offset]
    const compWidth = stats[offset + 2]
    boxes.push({
      x0: left * OUT_STRIDE - ex,
      y0,
      x1: (left + compWidth) * OUT_STRIDE + ex,
      y1,
      score: scoreSum[label] / n
    })
  }
  return boxes
}
