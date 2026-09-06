import { GROUNDING_PASSAGE_MAX_CHARS } from './grounding-llm'

export interface PassageWindow {
  text: string
  start: number
  end: number
}

/** Numeric/author cite span used to clip adjacent sentences that belong to other references. */
export interface PassageCiteSpan {
  start: number
  end: number
  /** Bibliography keys referenced by this span. */
  bibKeys: string[]
}

export interface BuildPassageWindowOptions {
  maxChars?: number
  /** Bib key(s) for the cite site currently being grounded. */
  activeBibKeys?: string[]
  /** Document cite spans used to decide whether a neighbor sentence is foreign. */
  citeSpans?: PassageCiteSpan[]
}

interface TextRange {
  start: number
  end: number
}

const SENTENCE_END = /[.!?…]+(?:["'’”)\]]+)?(?=\s|$)/gu
const WORD_CHAR = /[\p{L}\p{N}\p{M}]/u

/**
 * Build a paragraph-bounded passage around a citation, including the citation
 * sentence and one adjacent sentence on each side when available.
 *
 * When `activeBibKeys` and `citeSpans` are provided, an adjacent sentence is
 * omitted if it only cites other bibliography keys (cross-cite pollution).
 * Same-sentence multi-cites such as `[1,3]` are always retained.
 */
export function buildPassageWindow(
  bodyText: string,
  spanStart: number,
  spanEnd: number,
  maxCharsOrOptions: number | BuildPassageWindowOptions = GROUNDING_PASSAGE_MAX_CHARS
): PassageWindow {
  const options: BuildPassageWindowOptions =
    typeof maxCharsOrOptions === 'number' ? { maxChars: maxCharsOrOptions } : maxCharsOrOptions
  const maxChars = options.maxChars ?? GROUNDING_PASSAGE_MAX_CHARS

  if (!bodyText || maxChars <= 0) return { text: '', start: 0, end: 0 }

  const rawStart = clamp(Math.min(spanStart, spanEnd), 0, bodyText.length)
  const rawEnd = clamp(Math.max(spanStart, spanEnd), 0, bodyText.length)
  const paragraph = paragraphRangeAt(bodyText, rawStart, rawEnd)
  const sentences = sentenceRanges(bodyText, paragraph)
  const citeSentence = sentenceIndexAt(sentences, rawStart, rawEnd)

  let selected: TextRange
  if (citeSentence < 0) {
    selected = paragraph
  } else {
    const active = new Set((options.activeBibKeys ?? []).map(String))
    const spans = options.citeSpans ?? []
    const includePrev =
      citeSentence > 0 &&
      sentenceBelongsWithActive(sentences[citeSentence - 1], active, spans)
    const includeNext =
      citeSentence < sentences.length - 1 &&
      sentenceBelongsWithActive(sentences[citeSentence + 1], active, spans)

    const from = includePrev ? citeSentence - 1 : citeSentence
    const to = includeNext ? citeSentence + 1 : citeSentence
    selected = {
      start: sentences[from].start,
      end: sentences[to].end
    }
  }

  const bounded = fitRangeToMax(bodyText, selected, rawStart, rawEnd, maxChars)
  return {
    text: bodyText.slice(bounded.start, bounded.end),
    start: bounded.start,
    end: bounded.end
  }
}

/**
 * Keep neighbor sentences that have no cites (anaphora) or that also cite an
 * active key. Drop neighbors whose only cites belong to other bib keys.
 * When active keys are empty (legacy callers), keep adjacent sentences.
 */
function sentenceBelongsWithActive(
  sentence: TextRange,
  activeBibKeys: Set<string>,
  citeSpans: PassageCiteSpan[]
): boolean {
  if (activeBibKeys.size === 0) return true

  const overlapping = citeSpans.filter(
    (span) => span.start < sentence.end && span.end > sentence.start
  )
  if (overlapping.length === 0) return true

  return overlapping.some((span) => span.bibKeys.some((key) => activeBibKeys.has(key)))
}

function paragraphRangeAt(text: string, start: number, end: number): TextRange {
  const before = text.slice(0, start)
  const previousBreak = [...before.matchAll(/\r?\n[^\S\r\n]*\r?\n/gu)].at(-1)
  const paragraphStart = previousBreak
    ? previousBreak.index + previousBreak[0].length
    : 0

  const nextBreak = /\r?\n[^\S\r\n]*\r?\n/gu.exec(text.slice(end))
  const paragraphEnd = nextBreak ? end + nextBreak.index : text.length
  return trimRange(text, { start: paragraphStart, end: paragraphEnd })
}

function sentenceRanges(text: string, paragraph: TextRange): TextRange[] {
  const ranges: TextRange[] = []
  const paragraphText = text.slice(paragraph.start, paragraph.end)
  let cursor = 0

  for (const match of paragraphText.matchAll(SENTENCE_END)) {
    const end = (match.index ?? 0) + match[0].length
    const range = trimRange(text, {
      start: paragraph.start + cursor,
      end: paragraph.start + end
    })
    if (range.end > range.start) ranges.push(range)
    cursor = end
  }

  const tail = trimRange(text, {
    start: paragraph.start + cursor,
    end: paragraph.end
  })
  if (tail.end > tail.start) ranges.push(tail)
  return ranges
}

function sentenceIndexAt(sentences: TextRange[], start: number, end: number): number {
  const point = start === end
  return sentences.findIndex((sentence) =>
    point
      ? start >= sentence.start && start <= sentence.end
      : start < sentence.end && end > sentence.start
  )
}

function fitRangeToMax(
  text: string,
  range: TextRange,
  spanStart: number,
  spanEnd: number,
  maxChars: number
): TextRange {
  if (range.end - range.start <= maxChars) return range

  const citeMiddle = (spanStart + spanEnd) / 2
  let start = clamp(Math.floor(citeMiddle - maxChars / 2), range.start, range.end - maxChars)
  let end = start + maxChars

  if (start > range.start && isWordChar(text[start - 1]) && isWordChar(text[start])) {
    while (start < Math.min(spanStart, end) && isWordChar(text[start])) start++
  }
  if (end < range.end && isWordChar(text[end - 1]) && isWordChar(text[end])) {
    while (end > Math.max(spanEnd, start) && isWordChar(text[end - 1])) end--
  }

  return trimRange(text, { start, end })
}

function trimRange(text: string, range: TextRange): TextRange {
  let { start, end } = range
  while (start < end && /\s/u.test(text[start])) start++
  while (end > start && /\s/u.test(text[end - 1])) end--
  return { start, end }
}

function isWordChar(char: string | undefined): boolean {
  return char !== undefined && WORD_CHAR.test(char)
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}
