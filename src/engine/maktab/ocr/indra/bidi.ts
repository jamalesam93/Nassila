/**
 * Lookups over the Python `unicodedata` ranges in `bidi-data.ts`.
 * Indra's RTL flip and line features use these classes; JS has no Bidi_Class.
 */
import { BIDI_EN_AN, BIDI_L, BIDI_MN_ME, BIDI_R_AL, EAST_ASIAN_WIDE } from './bidi-data'

function inRanges(cp: number, ranges: ReadonlyArray<readonly [number, number]>): boolean {
  let lo = 0
  let hi = ranges.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const [start, end] = ranges[mid]
    if (cp < start) hi = mid - 1
    else if (cp > end) lo = mid + 1
    else return true
  }
  return false
}

export function isRtlCp(cp: number): boolean {
  return inRanges(cp, BIDI_R_AL)
}

export function isLtrLetterCp(cp: number): boolean {
  return inRanges(cp, BIDI_L)
}

/** Bidi L, EN, or AN: a left-to-right run inside RTL text. */
export function isLtrRunCp(cp: number): boolean {
  return inRanges(cp, BIDI_L) || inRanges(cp, BIDI_EN_AN)
}

export function isCombiningCp(cp: number): boolean {
  return inRanges(cp, BIDI_MN_ME)
}

export function isEastAsianWideCp(cp: number): boolean {
  return inRanges(cp, EAST_ASIAN_WIDE)
}

export function displayLen(text: string): number {
  let n = 0
  for (const ch of text) n += isEastAsianWideCp(ch.codePointAt(0) ?? 0) ? 2 : 1
  return n
}
