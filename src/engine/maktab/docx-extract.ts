/**
 * Maktab (مكتب) — structured DOCX ingest for the manuscript loop (Route C).
 *
 * Replaces the flat `mammoth.extractRawText` manuscript path with
 * `mammoth.convertToHtml` so Word structure survives import:
 *
 * - Paragraphs / headings / list items / table cells map back to `\n\n`
 *   separated blocks, byte-compatible with the old raw-text surface
 *   (segmentation, reference splitting, in-text citation parsing unchanged).
 * - Real heading levels (Heading1..6 → h1..h6) become a side-channel
 *   (`headings`) that `segmentManuscriptText` can consume later instead of
 *   guessing headings from casing.
 *
 * Route C constraints: no native deps, no IPC, bibliography `parseDocx`
 * untouched. Runs in both the renderer (mammoth browser build → `arrayBuffer`)
 * and node tests (node build → `buffer`).
 */

import mammoth from 'mammoth'
import type { HeadingNode } from '../manuscript/segments'
import { MaktabDocxError } from './errors'

export interface DocxExtractionResult {
  text: string
  html: string
  /** Real Word heading levels with character offsets into `text`. */
  headings: HeadingNode[]
  warnings: string[]
  needsReview: boolean
}

const MAX_DOCX_BYTES = 15 * 1024 * 1024

const BLOCK_TAGS = new Set([
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'li',
  'td',
  'th',
  'div',
  'blockquote'
])

const CONTAINER_TAGS = new Set(['table', 'tr', 'ul', 'ol', 'tbody', 'thead', 'figure', 'figcaption'])

const INLINE_TAGS = new Set([
  'strong',
  'em',
  'a',
  'span',
  'b',
  'i',
  'u',
  'sub',
  'sup',
  'code',
  's',
  'small',
  'mark'
])

const ENTITY_MAP: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
  ndash: '\u2013',
  mdash: '\u2014',
  hellip: '\u2026',
  lsquo: '\u2018',
  rsquo: '\u2019',
  ldquo: '\u201c',
  rdquo: '\u201d'
}

function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity.startsWith('#')) {
      const code = entity.startsWith('#x') || entity.startsWith('#X')
        ? parseInt(entity.slice(2), 16)
        : parseInt(entity.slice(1), 10)
      if (Number.isFinite(code)) return String.fromCodePoint(code)
      return match
    }
    return ENTITY_MAP[entity] ?? match
  })
}

interface DocxBlock {
  text: string
  headingLevel?: number
}

/** Tokenize mammoth HTML into paragraph blocks, tracking heading levels. */
function htmlToBlocks(html: string): DocxBlock[] {
  const blocks: DocxBlock[] = []
  let current = ''
  let currentHeading: number | undefined
  const openStack: string[] = []
  const tagRe = /<(\/?)([a-zA-Z0-9]+)((?:"[^"]*"|'[^']*'|[^"'>])*?)(\/?)>/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  const flush = (): void => {
    if (!current.trim()) {
      current = ''
      return
    }
    blocks.push({ text: current.trim(), headingLevel: currentHeading })
    current = ''
    currentHeading = undefined
  }

  while ((match = tagRe.exec(html)) !== null) {
    const text = html.slice(lastIndex, match.index)
    if (text) current += decodeEntities(text)
    lastIndex = tagRe.lastIndex

    const [, closing, rawTag, , selfClosing] = match
    const tag = rawTag.toLowerCase()

    if (selfClosing) {
      if (tag === 'br') current += '\n'
      continue
    }

    if (!closing) {
      if (BLOCK_TAGS.has(tag)) {
        flush()
        openStack.push(tag)
        if (/^h[1-6]$/.test(tag)) currentHeading = Number(tag[1])
      } else if (CONTAINER_TAGS.has(tag) || INLINE_TAGS.has(tag)) {
        openStack.push(tag)
      } else {
        openStack.push(tag)
      }
      continue
    }

    if (BLOCK_TAGS.has(tag)) {
      flush()
      // pop the matching block (or the nearest open block)
      const idx = openStack.lastIndexOf(tag)
      if (idx >= 0) openStack.splice(idx, 1)
      else openStack.pop()
      currentHeading = undefined
    } else {
      const idx = openStack.lastIndexOf(tag)
      if (idx >= 0) openStack.splice(idx, 1)
      else openStack.pop()
    }
  }

  const tail = html.slice(lastIndex)
  if (tail) current += decodeEntities(tail)
  flush()

  return blocks
}

/**
 * Flatten blocks to the `\n\n`-separated text the old raw-text path produced,
 * returning heading side-channel offsets into that same string.
 */
function blocksToText(blocks: DocxBlock[]): { text: string; headings: HeadingNode[] } {
  const headings: HeadingNode[] = []
  const parts: string[] = []
  let offset = 0
  for (const block of blocks) {
    if (parts.length > 0) offset += 2 // "\n\n" separator
    const start = offset
    parts.push(block.text)
    offset += block.text.length
    if (block.headingLevel !== undefined) {
      headings.push({ title: block.text, level: block.headingLevel, start, end: offset })
    }
  }
  return { text: parts.join('\n\n'), headings }
}

/** Mammoth accepts `arrayBuffer` (browser build) or `buffer` (node build). */
function toMammothInput(
  arrayBuffer: ArrayBuffer
): { arrayBuffer: ArrayBuffer } | { buffer: Buffer } {
  if (typeof Buffer !== 'undefined' && typeof process !== 'undefined' && process.versions?.node) {
    return { buffer: Buffer.from(arrayBuffer) }
  }
  return { arrayBuffer }
}

/**
 * Structured DOCX manuscript extraction — Maktab Route C.
 * Plain text stays byte-compatible with `extractRawText`; real Word headings
 * are returned as a segmentation side-channel.
 */
export async function extractStructuredDocx(arrayBuffer: ArrayBuffer): Promise<DocxExtractionResult> {
  if (arrayBuffer.byteLength > MAX_DOCX_BYTES) {
    throw new MaktabDocxError('DOCX file is too large to parse safely')
  }

  const result = await mammoth.convertToHtml(toMammothInput(arrayBuffer))
  const warnings = result.messages
    .filter((message) => message.type === 'warning')
    .map((message) => message.message)
  const errors = result.messages.filter((message) => message.type === 'error')

  const blocks = htmlToBlocks(result.value)
  const { text, headings } = blocksToText(blocks)
  const needsReview = errors.length > 0 || !text.trim()

  return {
    text,
    html: result.value,
    headings,
    warnings,
    needsReview
  }
}


