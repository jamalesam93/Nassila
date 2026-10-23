/**
 * Visual-order flip from Indra `rtl.py`. The recognizer reads left to right, so
 * Arabic comes out in visual order; `flip` is its own inverse back to logical order.
 */
import { isCombiningCp, isLtrLetterCp, isLtrRunCp, isRtlCp } from './bidi'

const MIRROR: Record<string, string> = {
  '(': ')',
  ')': '(',
  '[': ']',
  ']': '[',
  '{': '}',
  '}': '{',
  '<': '>',
  '>': '<',
  '«': '»',
  '»': '«',
  '‹': '›',
  '›': '‹'
}

const PRESENTATION: ReadonlyArray<readonly [number, number]> = [
  [0xfb1d, 0xfdff],
  [0xfe70, 0xfeff]
]
const TATWEEL = 'ـ'

export function isRtlChar(ch: string): boolean {
  const cp = ch.codePointAt(0)
  return cp !== undefined && isRtlCp(cp)
}

export function hasRtl(text: string): boolean {
  for (const ch of text) if (isRtlChar(ch)) return true
  return false
}

/** More RTL letters than LTR letters. Counts ignore order, so visual and logical agree. */
export function rtlBase(text: string): boolean {
  let rtl = 0
  let ltr = 0
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0
    if (isRtlCp(cp)) rtl += 1
    else if (isLtrLetterCp(cp)) ltr += 1
  }
  return rtl > ltr
}

export function normalizeRtl(text: string): string {
  let out = ''
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0
    if (PRESENTATION.some(([a, b]) => cp >= a && cp <= b)) {
      out += ch.normalize('NFKC')
    } else if (ch !== TATWEEL && (out.length > 0 || !isCombiningCp(cp))) {
      out += ch
    }
  }
  return out
}

function clusters(text: string): string[] {
  const out: string[] = []
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0
    if (out.length > 0 && isCombiningCp(cp)) out[out.length - 1] += ch
    else out.push(ch)
  }
  return out
}

function kind(cluster: string): 'R' | 'L' | 'N' {
  const cp = cluster.codePointAt(0) ?? 0
  if (isRtlCp(cp)) return 'R'
  if (isLtrRunCp(cp)) return 'L'
  return 'N'
}

function runs(kinds: string[], strong: string, stop: Set<string>): Array<[number, number]> {
  const spans: Array<[number, number]> = []
  let start: number | null = null
  let last: number | null = null
  const seq = kinds.concat('#')
  for (let i = 0; i < seq.length; i++) {
    const k = seq[i]
    if (k === strong) {
      if (start === null) start = i
      last = i
    } else if (stop.has(k) || k === '#') {
      if (start !== null && last !== null) spans.push([start, last + 1])
      start = null
      last = null
    }
  }
  return spans
}

function mirror(cluster: string): string {
  const head = cluster[0] ?? ''
  return (MIRROR[head] ?? head) + cluster.slice(head.length)
}

/**
 * Logical order to visual order, and back. `baseRtl` null decides from the line;
 * true forces a right-to-left paragraph (Indra passes the page direction this way).
 */
export function flip(text: string, baseRtl: boolean | null = null): string {
  if (!hasRtl(text)) return text
  const cls = clusters(text)
  const kinds = cls.map(kind)
  const rtl = baseRtl === null ? rtlBase(text) : baseRtl
  if (rtl) {
    const units: string[] = []
    const spans = runs(kinds, 'L', new Set(['R']))
    let i = 0
    for (const [a, b] of spans.concat([[cls.length, cls.length]])) {
      for (let j = i; j < a; j++) units.push(mirror(cls[j]))
      if (a < b) units.push(cls.slice(a, b).join(''))
      i = b
    }
    return units.reverse().join('')
  }
  const out = cls.slice()
  for (const [a, b] of runs(kinds, 'R', new Set(['L']))) {
    const seg = cls.slice(a, b).reverse().map(mirror)
    for (let i = a; i < b; i++) out[i] = seg[i - a]
  }
  return out.join('')
}
