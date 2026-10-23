/**
 * Line splitting, gutter cuts, and tidy-up from Indra `pipeline.py` (`assemble`).
 * Markdown and picture blocks are not ported: Nassila keeps the plain text.
 */
import { isRtlCp } from './bidi'
import { flip, hasRtl } from './rtl'
import type { LineBox, LineRec, LineToken } from './types'
import type { Vocab } from './vocab'

export const SPLIT_GAP = 3
const GUTTER_GAP = 1.6
const GUTTER_EDGES = 3
const MARKER_GAP = 2.5
const LEADERS = new Set(['.', '·', '…', '‥', '_', '-', '–', '—', '='])
const DASHES = new Set(['-', '–', '—'])
const BULLETS = new Set(['•', '◦', '▪', '▫', '●', '○', '■', '□', '‣', '⁃', '∙', '*'])
const ENUMERATOR =
  /^(?:(?:\d{1,3}|[A-Za-z])[.)]|\((?:\d{1,3}|[A-Za-z]|[ivxlcIVXLC]{1,5})\))$/

export function pageIsRtl(lines: readonly LineRec[]): boolean {
  let rtl = 0
  let other = 0
  for (const line of lines) {
    for (const ch of line.text) {
      if (!/\p{L}/u.test(ch)) continue
      const cp = ch.codePointAt(0) ?? 0
      if (isRtlCp(cp)) rtl += 1
      else other += 1
    }
  }
  return rtl > other
}

function isSpace(token: LineToken, spaceId: number | null): boolean {
  return token.v === ' ' || (spaceId !== null && token.v === spaceId)
}

export function decodeTokens(
  tokens: readonly LineToken[],
  pageRtl: boolean,
  vocab: Vocab
): string {
  if (tokens.length > 0 && typeof tokens[0].v === 'string') {
    let text = ''
    for (const token of tokens) text += token.v
    text = text.split(/\s+/u).filter((part) => part.length > 0).join(' ')
    text = text.normalize('NFC')
    if (hasRtl(text)) text = flip(text, pageRtl ? true : null)
    return text
  }
  return vocab.decode(tokens.map((token) => token.v as number))
}

export function gutterCuts(
  boxes: readonly LineBox[],
  lines: readonly LineRec[],
  spaceId: number | null
): number[][] {
  const cuts: number[][] = []
  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i]
    const h = Math.max(1, box.y1 - box.y0)
    const xs = lines[i].tokens.filter((token) => !isSpace(token, spaceId)).map((token) => token.x)
    const mine: number[] = []
    for (let t = 0; t < xs.length - 1; t++) {
      const a = xs[t]
      const c = xs[t + 1]
      if (c - a <= GUTTER_GAP * h) continue
      const gl = a + 0.35 * h
      const gr = c - 0.35 * h
      let near = 0
      for (let j = 0; j < boxes.length; j++) {
        if (j === i) continue
        if (Math.abs(boxes[j].x1 - gl) < 0.5 * h || Math.abs(boxes[j].x0 - gr) < 0.5 * h) near += 1
      }
      if (near >= GUTTER_EDGES) mine.push((a + c) / 2)
    }
    cuts.push(mine)
  }
  return cuts
}

export function splitLine(
  box: LineBox,
  tokens: readonly LineToken[],
  gap: number,
  at: readonly number[],
  pageRtl: boolean,
  vocab: Vocab
): Array<{ box: LineBox; text: string; tokens: LineToken[] }> {
  const h = Math.max(1, box.y1 - box.y0)
  const cuts = at.slice().sort((a, b) => a - b)
  const segs: LineToken[][] = [[]]
  let prev: number | null = null
  for (const token of tokens) {
    if (!isSpace(token, vocab.spaceId)) {
      const cut =
        prev !== null && (token.x - prev > gap * h || cuts.some((c) => prev !== null && prev < c && c < token.x))
      if (cut) segs.push([])
      prev = token.x
    }
    segs[segs.length - 1].push(token)
  }
  if (segs.length === 1) {
    return [{ box: { ...box }, text: decodeTokens(tokens, pageRtl, vocab), tokens: tokens.slice() }]
  }
  const out: Array<{ box: LineBox; text: string; tokens: LineToken[] }> = []
  for (const seg of segs) {
    const text = decodeTokens(seg, pageRtl, vocab).trim()
    const xs = seg.filter((token) => !isSpace(token, vocab.spaceId)).map((token) => token.x)
    if (!text || xs.length === 0) continue
    out.push({
      box: {
        x0: Math.max(box.x0, Math.min(...xs) - 0.35 * h),
        y0: box.y0,
        x1: Math.min(box.x1, Math.max(...xs) + 0.35 * h),
        y1: box.y1,
        score: box.score
      },
      text,
      tokens: seg
    })
  }
  return out
}

function coreChars(text: string): string {
  return text.replace(/ /g, '')
}

export function tidyLines(
  boxes: LineBox[],
  lines: LineRec[],
  pageRtl: boolean,
  vocab: Vocab
): { boxes: LineBox[]; lines: LineRec[] } {
  const keep = lines.map(() => true)
  const next = lines.map((line) => ({
    text: line.text,
    conf: line.conf,
    tokens: line.tokens.slice()
  }))
  const heights = boxes.map((box) => box.y1 - box.y0)
  const widths = boxes.map((box) => box.x1 - box.x0)
  for (let i = 0; i < next.length; i++) {
    const core = coreChars(next[i].text)
    if (!core || ![...core].every((ch) => LEADERS.has(ch))) continue
    const wide = widths[i] >= 3 * heights[i]
    const hasDash = [...core].some((ch) => DASHES.has(ch))
    if (core.length >= 3 || wide || !hasDash) keep[i] = false
  }
  for (let i = 0; i < next.length; i++) {
    const text = next[i].text.trim()
    if (!keep[i] || !(BULLETS.has(text) || ENUMERATOR.test(text))) continue
    let best: number | null = null
    let bestGap: number | null = null
    for (let j = 0; j < next.length; j++) {
      if (j === i || !keep[j] || !next[j].text.trim()) continue
      const overlap =
        Math.min(boxes[i].y1, boxes[j].y1) - Math.max(boxes[i].y0, boxes[j].y0)
      if (overlap < 0.5 * Math.min(heights[i], heights[j])) continue
      const gap = pageRtl ? boxes[i].x0 - boxes[j].x1 : boxes[j].x0 - boxes[i].x1
      if (
        gap >= -0.3 * heights[i] &&
        gap <= MARKER_GAP * Math.max(heights[i], heights[j]) &&
        (bestGap === null || gap < bestGap)
      ) {
        best = j
        bestGap = gap
      }
    }
    if (best === null) continue
    const markerTokens = next[i].tokens
    const item = next[best]
    const chars = item.tokens.length > 0 && typeof item.tokens[0].v === 'string'
    const space: string | number | null = chars ? ' ' : vocab.spaceId
    if (
      !pageRtl &&
      markerTokens.length > 0 &&
      item.tokens.length > 0 &&
      space !== null &&
      typeof markerTokens[0].v === 'string' === chars
    ) {
      const x = (boxes[i].x1 + boxes[best].x0) / 2
      item.tokens = markerTokens.concat([{ v: space, x }], item.tokens)
    }
    item.text = `${text} ${item.text.trim()}`
    boxes[best] = {
      x0: Math.min(boxes[i].x0, boxes[best].x0),
      y0: Math.min(boxes[i].y0, boxes[best].y0),
      x1: Math.max(boxes[i].x1, boxes[best].x1),
      y1: Math.max(boxes[i].y1, boxes[best].y1),
      score: boxes[best].score
    }
    keep[i] = false
  }
  const keptBoxes: LineBox[] = []
  const keptLines: LineRec[] = []
  for (let i = 0; i < keep.length; i++) {
    if (!keep[i]) continue
    keptBoxes.push(boxes[i])
    keptLines.push(next[i])
  }
  return { boxes: keptBoxes, lines: keptLines }
}

export function mirrorBoxes(boxes: readonly LineBox[], pageWidth: number, pageRtl: boolean): LineBox[] {
  if (!pageRtl) return boxes.map((box) => ({ ...box }))
  return boxes.map((box) => ({
    x0: pageWidth - box.x1,
    y0: box.y0,
    x1: pageWidth - box.x0,
    y1: box.y1,
    score: box.score
  }))
}
