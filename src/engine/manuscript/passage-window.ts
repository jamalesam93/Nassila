import { GROUNDING_PASSAGE_MAX_CHARS } from './grounding-llm'

export interface PassageWindow {
  text: string
  start: number
  end: number
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
 */
export function buildPassageWindow(
  bodyText: string,
  spanStart: number,
  spanEnd: number,
  maxChars = GROUNDING_PASSAGE_MAX_CHARS
): PassageWindow {
  if (!bodyText || maxChars <= 0) return { text: '', start: 0, end: 0 }

  const rawStart = clamp(Math.min(spanStart, spanEnd), 0, bodyText.length)
  const rawEnd = clamp(Math.max(spanStart, spanEnd), 0, bodyText.length)
  const paragraph = paragraphRangeAt(bodyText, rawStart, rawEnd)
  const sentences = sentenceRanges(bodyText, paragraph)
  const citeSentence = sentenceIndexAt(sentences, rawStart, rawEnd)

  const selected: TextRange = citeSentence < 0
    ? paragraph
    : {
        start: sentences[Math.max(0, citeSentence - 1)].start,
        end: sentences[Math.min(sentences.length - 1, citeSentence + 1)].end
      }

  const bounded = fitRangeToMax(bodyText, selected, rawStart, rawEnd, maxChars)
  return {
    text: bodyText.slice(bounded.start, bounded.end),
    start: bounded.start,
    end: bounded.end
  }
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
