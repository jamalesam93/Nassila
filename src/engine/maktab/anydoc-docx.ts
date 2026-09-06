/**
 * Optional `@firecrawl/anydoc` DOCX → markdown path for fixture comparison.
 *
 * Mammoth `extractStructuredDocx` remains the default manuscript Route C.
 * anydoc is soft-loaded; when the napi binary is missing this module no-ops.
 */

import type { HeadingNode } from '../manuscript/segments'
import type { DocxExtractionResult } from './docx-extract'
import { MaktabDocxError } from './errors'

const MAX_DOCX_BYTES = 15 * 1024 * 1024

export type DocxExtractionEngine = 'mammoth' | 'anydoc'

export interface AnydocDocxModule {
  toMarkdownBytes: (
    bytes: Uint8Array,
    format?: string
  ) => Promise<string>
  Format?: { docx?: string }
}

let cachedAnydoc: AnydocDocxModule | null | undefined

function nodeRequire(): ((id: string) => unknown) | null {
  try {
    if (typeof process === 'undefined' || !process.versions?.node) return null
    const createRequire = new Function(
      'return require("node:module").createRequire'
    )() as (filename: string) => (id: string) => unknown
    return createRequire(
      typeof __filename !== 'undefined' ? __filename : `${process.cwd()}/package.json`
    )
  } catch {
    return null
  }
}

/** Soft-load anydoc; null when package / win32 binary is unavailable. */
export function tryLoadAnydoc(): AnydocDocxModule | null {
  if (cachedAnydoc !== undefined) return cachedAnydoc
  try {
    const req = nodeRequire()
    if (!req) {
      cachedAnydoc = null
      return null
    }
    cachedAnydoc = req('@firecrawl/anydoc') as AnydocDocxModule
    return cachedAnydoc
  } catch {
    cachedAnydoc = null
    return null
  }
}

export function resetAnydocLoadCache(): void {
  cachedAnydoc = undefined
}

export function isAnydocAvailable(): boolean {
  return tryLoadAnydoc() !== null
}

function markdownToPlainAndHeadings(markdown: string): {
  text: string
  headings: HeadingNode[]
} {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: string[] = []
  const headings: HeadingNode[] = []
  let offset = 0

  for (const line of lines) {
    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line)
    if (headingMatch) {
      const level = headingMatch[1].length
      const title = headingMatch[2].trim()
      if (blocks.length > 0) offset += 2
      const start = offset
      blocks.push(title)
      offset = start + title.length
      headings.push({ title, level, start, end: offset })
      continue
    }
    if (line.trim() === '') continue
    const plain = line.replace(/^[-*+]\s+/, '').replace(/^\d+\.\s+/, '').trim()
    if (!plain) continue
    if (blocks.length > 0) offset += 2
    const start = offset
    blocks.push(plain)
    offset = start + plain.length
  }

  return { text: blocks.join('\n\n'), headings }
}

/**
 * Convert DOCX bytes via anydoc when available.
 * Returns null when the native module cannot load (caller keeps mammoth).
 */
export async function extractDocxWithAnydoc(
  arrayBuffer: ArrayBuffer
): Promise<DocxExtractionResult | null> {
  if (arrayBuffer.byteLength > MAX_DOCX_BYTES) {
    throw new MaktabDocxError('DOCX file is too large to parse safely')
  }

  const mod = tryLoadAnydoc()
  if (!mod) return null

  try {
    const bytes = new Uint8Array(arrayBuffer)
    const format = mod.Format?.docx ?? 'docx'
    const markdown = await mod.toMarkdownBytes(bytes, format)
    const { text, headings } = markdownToPlainAndHeadings(String(markdown ?? ''))
    const warnings: string[] = []
    if (!text.trim()) {
      warnings.push('anydoc produced empty DOCX text.')
    }
    return {
      text,
      html: '',
      headings,
      warnings,
      needsReview: !text.trim()
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      text: '',
      html: '',
      headings: [],
      warnings: [`anydoc DOCX conversion failed: ${msg}`],
      needsReview: true
    }
  }
}
