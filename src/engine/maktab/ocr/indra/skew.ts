/**
 * Deskew and quarter-turn from Indra `pipeline.py` (`estimate_skew`, `upright`).
 * Vertical CJK pages (class 4) are turned like Indra does; Arabic pages stay at 0/1/2/3.
 */
import type { GrayImage, IndraImageOps } from './types'

const DESKEW_MAX = 45
const DESKEW_MIN = 0.3
const PREVIEW_SIDE = 1600
export const ORIENT_SIDE = 768
export const ORIENT_MIN = 0.95
export const VERTICAL = 4

export function rot90(gray: GrayImage, turns: number): GrayImage {
  const k = ((turns % 4) + 4) % 4
  if (k === 0) return gray
  const { width, height, data } = gray
  if (k === 2) {
    const out = new Uint8Array(width * height)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        out[(height - 1 - y) * width + (width - 1 - x)] = data[y * width + x]
      }
    }
    return { width, height, data: out }
  }
  const out = new Uint8Array(width * height)
  const destWidth = height
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = k === 1 ? y : height - 1 - y
      const ny = k === 1 ? width - 1 - x : x
      out[ny * destWidth + nx] = data[y * width + x]
    }
  }
  return { width: height, height: width, data: out }
}

function resizeTo(gray: GrayImage, ops: IndraImageOps, side: number): GrayImage {
  const scale = side / Math.max(gray.height, gray.width)
  const width = Math.max(1, Math.round(gray.width * scale))
  const height = Math.max(1, Math.round(gray.height * scale))
  if (width === gray.width && height === gray.height) return gray
  return ops.resize(gray, width, height, 'area')
}

export function preview(gray: GrayImage, ops: IndraImageOps, side = PREVIEW_SIDE): GrayImage {
  if (side / Math.max(gray.height, gray.width) >= 1) return gray
  return resizeTo(gray, ops, side)
}

function inkThumb(gray: GrayImage, ops: IndraImageOps, side: number): GrayImage {
  const small = resizeTo(gray, ops, side)
  const data = new Uint8Array(small.data.length)
  for (let i = 0; i < data.length; i++) data[i] = 255 - small.data[i]
  return { width: small.width, height: small.height, data }
}

function rowSharpness(ink: GrayImage, degrees: number, ops: IndraImageOps): number {
  const turned = ops.warp(ink, degrees, 'constant')
  let acc = 0
  let prev = 0
  for (let y = 0; y < turned.height; y++) {
    let sum = 0
    const row = y * turned.width
    for (let x = 0; x < turned.width; x++) sum += turned.data[row + x]
    if (y > 0) {
      const d = sum - prev
      acc += d * d
    }
    prev = sum
  }
  return acc
}

function range(start: number, stop: number, step: number): number[] {
  const out: number[] = []
  const count = Math.round((stop - start) / step)
  for (let i = 0; i <= count; i++) out.push(Math.round((start + i * step) * 10) / 10)
  return out
}

/** Degrees counter-clockwise that level the text rows. */
export function estimateSkew(gray: GrayImage, ops: IndraImageOps, side = 800): number {
  const fine = inkThumb(gray, ops, side)
  let mean = 0
  for (let i = 0; i < fine.data.length; i++) mean += fine.data[i]
  mean /= fine.data.length
  if (mean < 0.003 * 255) return 0

  const coarse = inkThumb(gray, ops, Math.floor(side / 2))
  const grid = range(-DESKEW_MAX, DESKEW_MAX, 2)
  const scores = grid.map((angle) => rowSharpness(coarse, angle, ops))
  const ranked = scores
    .map((score, i) => ({ score, angle: grid[i] }))
    .sort((a, b) => b.score - a.score)
  const starts = new Set<number>([0, ranked[0].angle, ranked[1]?.angle ?? 0])
  const near: number[] = []
  const seen = new Set<number>()
  for (const start of starts) {
    for (const angle of range(start - 2, start + 2, 0.5)) {
      const key = angle.toFixed(1)
      if (seen.has(Number(key))) continue
      seen.add(Number(key))
      near.push(Number(key))
    }
  }
  let best = near[0]
  let bestScore = Number.NEGATIVE_INFINITY
  for (const angle of near) {
    const score = rowSharpness(fine, angle, ops)
    if (score > bestScore) {
      bestScore = score
      best = angle
    }
  }
  let winner = best
  let winnerScore = bestScore
  for (const angle of range(best - 0.5, best + 0.5, 0.1)) {
    const score = rowSharpness(fine, angle, ops)
    if (score > winnerScore) {
      winnerScore = score
      winner = angle
    }
  }
  return winner
}

export function orientInput(gray: GrayImage, ops: IndraImageOps, side = ORIENT_SIDE): Float32Array {
  const scale = side / Math.max(gray.height, gray.width)
  const width = Math.max(1, Math.round(gray.width * scale))
  const height = Math.max(1, Math.round(gray.height * scale))
  const small =
    width === gray.width && height === gray.height ? gray : ops.resize(gray, width, height, 'area')
  const out = new Float32Array(side * side)
  for (let y = 0; y < small.height; y++) {
    const row = y * small.width
    for (let x = 0; x < small.width; x++) {
      out[y * side + x] = 1 - small.data[row + x] / 255
    }
  }
  return out
}

export function orientationClass(probs: ArrayLike<number> | null): number {
  if (!probs || probs.length === 0) return 0
  let k = 0
  for (let i = 1; i < probs.length; i++) if (probs[i] > probs[k]) k = i
  return probs[k] > ORIENT_MIN ? k : 0
}

export function turnPage(
  gray: GrayImage,
  quarterTurns: number,
  skew: number,
  previewImage: GrayImage | null,
  ops: IndraImageOps
): { gray: GrayImage; skew: number } {
  let page = gray
  let angle = skew
  const q = quarterTurns === VERTICAL ? 1 : -quarterTurns
  if (quarterTurns === VERTICAL) page = rot90(page, 1)
  else if (quarterTurns) page = rot90(page, -quarterTurns)
  if (quarterTurns === 1 || quarterTurns === 3 || quarterTurns === VERTICAL) {
    const source = previewImage ? rot90(previewImage, q) : page
    angle = estimateSkew(source, ops)
  }
  if (Math.abs(angle) >= DESKEW_MIN) page = ops.warp(page, angle, 'replicate')
  else angle = 0
  return { gray: page, skew: angle }
}
