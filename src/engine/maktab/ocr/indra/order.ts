/**
 * Reading order from Indra `order_post.py`: line features, XY-cut, and the
 * layout-head decoder. The order model itself stays in ONNX.
 */
import { displayLen } from './bidi'
import type { LineBox } from './types'

const N_FEATS = 16
const SENTENCE_END = '.!?:;。！？：；．'
const GRID = new Set([5, 8, 9]) // Table, Table-Of-Contents, Form

function median(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b)
  const mid = sorted.length >> 1
  if (sorted.length % 2 === 1) return sorted[mid]
  return (sorted[mid - 1] + sorted[mid]) / 2
}

function isDigit(ch: string): boolean {
  return /\p{Nd}/u.test(ch)
}

function isUpper(ch: string): boolean {
  return ch !== ch.toLowerCase() && ch === ch.toUpperCase()
}

export function lineFeatures(
  boxes: LineBox[],
  pageWidth: number,
  pageHeight: number,
  texts: readonly string[]
): Float32Array {
  const n = boxes.length
  const feats = new Float32Array(n * N_FEATS)
  if (n === 0) return feats
  const heights = boxes.map((box) => Math.max(box.y1 - box.y0, 1e-3))
  const medH = median(heights)
  for (let i = 0; i < n; i++) {
    const box = boxes[i]
    const w = Math.max(box.x1 - box.x0, 1e-3)
    const h = heights[i]
    const row = i * N_FEATS
    feats[row] = box.x0 / pageWidth
    feats[row + 1] = box.y0 / pageHeight
    feats[row + 2] = box.x1 / pageWidth
    feats[row + 3] = box.y1 / pageHeight
    feats[row + 4] = (box.x0 + box.x1) / (2 * pageWidth)
    feats[row + 5] = (box.y0 + box.y1) / (2 * pageHeight)
    feats[row + 6] = w / pageWidth
    feats[row + 7] = Math.log(h / medH)
    feats[row + 8] = Math.log(w / h) / 4
    feats[row + 9] = (medH / pageHeight) * 20
    const text = (texts[i] ?? '').trim()
    if (!text) continue
    const chars = [...text]
    feats[row + 10] = Math.log1p(displayLen(text)) / 5
    let digits = 0
    for (const ch of chars) if (isDigit(ch)) digits += 1
    feats[row + 11] = digits / chars.length
    const prefix = chars.slice(0, 3).join('').replace(/[.)]+$/u, '')
    const bullet = '•-–▪◦*·→'.includes(chars[0])
    const numbered = prefix.length > 0 && [...prefix].every((ch) => ch >= '0' && ch <= '9')
    feats[row + 12] = bullet || (numbered && chars.length > 3) ? 1 : 0
    feats[row + 13] = text.endsWith('-') ? 1 : 0
    feats[row + 14] = SENTENCE_END.includes(chars[chars.length - 1]) ? 1 : 0
    feats[row + 15] = isUpper(chars[0]) ? 1 : 0
  }
  return feats
}

function logSigmoid(value: number): number {
  if (value >= 0) return -Math.log1p(Math.exp(-value))
  return value - Math.log1p(Math.exp(value))
}

export function decodeOrder(logits: ArrayLike<number>, n: number, sweeps = 4): number[] {
  if (n <= 1) return Array.from({ length: n }, (_, i) => i)
  const lp = new Float64Array(n * n)
  for (let i = 0; i < n * n; i++) lp[i] = logSigmoid(logits[i])
  const score = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    let row = 0
    let col = 0
    for (let j = 0; j < n; j++) {
      row += lp[i * n + j]
      col += lp[j * n + i]
    }
    score[i] = -row + col
  }
  let order = Array.from({ length: n }, (_, i) => i).sort((a, b) => score[a] - score[b])

  for (let sweep = 0; sweep < sweeps; sweep++) {
    let improved = false
    for (const x of order.slice()) {
      const rest = order.filter((i) => i !== x)
      const before = rest.map((i) => lp[i * n + x])
      const after = rest.map((i) => lp[x * n + i])
      const cumBefore: number[] = []
      let sum = 0
      for (const value of before) {
        sum += value
        cumBefore.push(sum)
      }
      const afterRev = after.slice().reverse()
      const cumAfterRev: number[] = []
      sum = 0
      for (const value of afterRev) {
        sum += value
        cumAfterRev.push(sum)
      }
      cumAfterRev.reverse()
      let bestK = 0
      let bestGain = 0 + (cumAfterRev[0] ?? 0)
      const gains = new Array<number>(n)
      for (let k = 0; k < n; k++) {
        const left = k === 0 ? 0 : cumBefore[k - 1]
        const right = k === n - 1 ? 0 : cumAfterRev[k]
        gains[k] = left + right
        if (gains[k] > bestGain) {
          bestGain = gains[k]
          bestK = k
        }
      }
      const current = order.indexOf(x)
      if (gains[bestK] > gains[current] + 1e-6) {
        rest.splice(bestK, 0, x)
        order = rest
        improved = true
      }
    }
    if (!improved) break
  }
  return order
}

export function orderTopDown(boxes: LineBox[]): number[] {
  if (boxes.length === 0) return []
  const heights = boxes.map((box) => box.y1 - box.y0)
  const med = median(heights)
  const band = Math.max(med * 0.5, 1e-3)
  return boxes
    .map((_, i) => i)
    .sort((a, b) => {
      const rowA = Math.round((boxes[a].y0 + boxes[a].y1) / 2 / band)
      const rowB = Math.round((boxes[b].y0 + boxes[b].y1) / 2 / band)
      if (rowA !== rowB) return rowA - rowB
      return boxes[a].x0 - boxes[b].x0
    })
}

function bestCut(
  boxes: LineBox[],
  ids: number[],
  axis: 0 | 1
): { gap: number; k: number; order: number[] } {
  const lo = ids.map((id) => (axis === 1 ? boxes[id].y0 : boxes[id].x0))
  const hi = ids.map((id) => (axis === 1 ? boxes[id].y1 : boxes[id].x1))
  const order = ids.map((_, i) => i).sort((a, b) => lo[a] - lo[b])
  let end = hi[order[0]]
  let gap = 0
  let k = -1
  for (let i = 1; i < order.length; i++) {
    const next = lo[order[i]] - end
    if (next > gap) {
      gap = next
      k = i
    }
    end = Math.max(end, hi[order[i]])
  }
  return { gap, k, order }
}

export function orderXycut(boxes: LineBox[], ids: number[] = boxes.map((_, i) => i)): number[] {
  const rec = (group: number[]): number[] => {
    if (group.length <= 1) return group.slice()
    const y = bestCut(boxes, group, 1)
    const x = bestCut(boxes, group, 0)
    if (y.k < 0 && x.k < 0) {
      const local = group.map((id) => boxes[id])
      return orderTopDown(local).map((i) => group[i])
    }
    const cut = y.gap >= x.gap ? y : x
    const left = cut.order.slice(0, cut.k).map((i) => group[i])
    const right = cut.order.slice(cut.k).map((i) => group[i])
    return rec(left).concat(rec(right))
  }
  return rec(ids)
}

function cluster(logits: Float64Array, n: number): number[][] {
  if (n === 0) return []
  const same = new Float64Array(logits)
  for (let i = 0; i < n; i++) same[i * n + i] = 0
  const size = new Float64Array(n).fill(1)
  const alive = new Array<boolean>(n).fill(true)
  const members: number[][] = Array.from({ length: n }, (_, i) => [i])
  const mean = new Float64Array(same)
  for (let i = 0; i < n; i++) mean[i * n + i] = Number.NEGATIVE_INFINITY
  const best = new Int32Array(n)
  const bestV = new Float64Array(n)
  const argmaxRow = (row: number): void => {
    let index = 0
    let value = Number.NEGATIVE_INFINITY
    const offset = row * n
    for (let j = 0; j < n; j++) {
      if (mean[offset + j] > value) {
        value = mean[offset + j]
        index = j
      }
    }
    best[row] = index
    bestV[row] = value
  }
  for (let i = 0; i < n; i++) argmaxRow(i)

  for (let iter = 0; iter < n - 1; iter++) {
    let a = 0
    for (let i = 1; i < n; i++) if (bestV[i] > bestV[a]) a = i
    let b = best[a]
    if (bestV[a] <= 0) break
    if (a > b) {
      const swap = a
      a = b
      b = swap
    }
    for (let j = 0; j < n; j++) {
      same[a * n + j] += same[b * n + j]
      same[j * n + a] += same[j * n + b]
    }
    same[a * n + a] = 0
    size[a] += size[b]
    alive[b] = false
    members[a].push(...members[b])
    const row = new Float64Array(n)
    for (let j = 0; j < n; j++) {
      row[j] = alive[j] ? same[a * n + j] / (size[a] * size[j]) : Number.NEGATIVE_INFINITY
    }
    row[a] = Number.NEGATIVE_INFINITY
    for (let j = 0; j < n; j++) {
      mean[a * n + j] = row[j]
      mean[j * n + a] = row[j]
      mean[b * n + j] = Number.NEGATIVE_INFINITY
      mean[j * n + b] = Number.NEGATIVE_INFINITY
    }
    bestV[b] = Number.NEGATIVE_INFINITY
    let bi = 0
    let bv = Number.NEGATIVE_INFINITY
    for (let j = 0; j < n; j++) {
      if (row[j] > bv) {
        bv = row[j]
        bi = j
      }
    }
    best[a] = bi
    bestV[a] = bv
    for (let j = 0; j < n; j++) {
      if (!alive[j] || j === a) continue
      if (best[j] === a || best[j] === b) argmaxRow(j)
      if (row[j] > bestV[j]) {
        best[j] = a
        bestV[j] = row[j]
      }
    }
  }
  const groups: number[][] = []
  for (let i = 0; i < n; i++) {
    if (alive[i]) groups.push(members[i].slice().sort((p, q) => p - q))
  }
  return groups
}

export function decodeBlocksOrder(
  orderLogits: ArrayLike<number>,
  sameLogits: ArrayLike<number>,
  boxes: LineBox[],
  cls: ArrayLike<number>
): number[] {
  const n = boxes.length
  if (n <= 1) return Array.from({ length: n }, (_, i) => i)
  const same = new Float64Array(n * n)
  for (let i = 0; i < n * n; i++) same[i] = sameLogits[i]
  const blocks = cluster(same, n)
  const inner = blocks.map((block) => {
    const localBoxes = block.map((i) => boxes[i])
    let clsIndex = 0
    const sums = new Float64Array(10)
    for (const i of block) {
      for (let c = 0; c < 10; c++) sums[c] += cls[i * 10 + c]
    }
    for (let c = 1; c < 10; c++) if (sums[c] > sums[clsIndex]) clsIndex = c
    const local = GRID.has(clsIndex) ? orderTopDown(localBoxes) : orderXycut(localBoxes)
    return local.map((k) => block[k])
  })
  const m = blocks.length
  const between = new Float64Array(m * m)
  for (let p = 0; p < m; p++) {
    for (let q = p + 1; q < m; q++) {
      let sum = 0
      for (const i of blocks[p]) {
        for (const j of blocks[q]) sum += orderLogits[i * n + j]
      }
      const value = sum / (blocks[p].length * blocks[q].length)
      between[p * m + q] = value
      between[q * m + p] = -value
    }
  }
  return decodeOrder(between, m).flatMap((k) => inner[k])
}
