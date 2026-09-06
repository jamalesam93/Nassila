import type { CslItem } from '../types'

export interface PaperIdentitySignals {
  doi?: string
  title?: string
}

/** A bibliography entry eligible for paper matching. */
export interface PaperMatchTarget {
  bibKey: string
  DOI?: string
  title?: string
  year?: number
}

export type PaperMatchKind = 'matched' | 'ambiguous' | 'unmatched'

export interface PaperMatch {
  bibKeys: string[]
  kind: PaperMatchKind
  matchedBy: 'doi' | 'title' | 'bibKey' | null
}

const FIRST_PAGES = 2
const DOI_TEXT_PATTERN = /(?:doi[:\s]*|https?:\/\/(?:dx\.)?doi\.org\/)?(10\.\d{4,9}\/[^\s"<>]+)/i

function normalizeDoi(value: string): string {
  return value.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').toLowerCase().trim()
}

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function targetDoi(target: PaperMatchTarget): string | undefined {
  return target.DOI?.trim() ? normalizeDoi(target.DOI) : undefined
}

function targetTitle(target: PaperMatchTarget): string | undefined {
  const title = target.title?.trim()
  return title ? normalizeTitle(title) : undefined
}

/** DOI printed on the first pages of the PDF body text. */
function doiFromBodyText(text: string): string | undefined {
  const match = text.match(DOI_TEXT_PATTERN)
  return match ? normalizeDoi(match[1].replace(/[.,;)]+$/, '')) : undefined
}

/** DOI encoded in the file name (e.g. `10.1000/journal.123.pdf`). */
function doiFromFileName(fileName: string | undefined): string | undefined {
  if (!fileName) return undefined
  const stem = fileName.replace(/\.pdf$/i, '')
  const match = stem.match(/10\.\d{4,9}\/[^\s]+/i)
  return match ? normalizeDoi(match[0]) : undefined
}

/**
 * Bibliography key guessed from a bare file stem (`3.pdf` → `3`, `ref-12.pdf` → `ref-12`).
 * Skips DOI-shaped stems so those stay on the DOI path.
 */
export function bibKeyFromFileName(fileName: string | undefined): string | undefined {
  if (!fileName) return undefined
  const stem = fileName.replace(/\.pdf$/i, '').trim()
  if (!stem) return undefined
  if (/^10\.\d{4,9}\//i.test(stem)) return undefined
  // Numbered Vancouver keys and simple alphanumeric keys only — reject titles/slugs with spaces.
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(stem)) return undefined
  return stem
}

/**
 * Title guess from first-page lines: deterministic heuristics only — skip
 * header/DOI/URL noise and take the first substantial line.
 */
export function guessTitleFromFirstPage(pageText: string): string | undefined {
  const lines = pageText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  for (const line of lines.slice(0, 15)) {
    if (line.length < 15 || line.length > 300) continue
    if (/^(?:doi\b|https?:\/\/|www\.|arxiv|issn|isbn|copyright|©|licensed under|received|accepted)/i.test(line)) continue
    if (/^\d+\s/.test(line) && line.length < 40) continue
    if (/^(?:proceedings|journal|vol\.|volume|issue)\b/i.test(line)) continue
    const letters = (line.match(/[A-Za-z]/g) ?? []).length
    if (letters < line.length * 0.5) continue
    return line.replace(/\s+/g, ' ')
  }
  return undefined
}

/**
 * Extract identity signals for one paper PDF: DOI from the first two pages of
 * body text (falling back to the file name), title guessed from page one.
 */
export async function extractPaperIdentity(
  buffer: ArrayBuffer,
  fileName: string
): Promise<PaperIdentitySignals> {
  let pageItems: string[][] = []
  try {
    const { loadPdfJs, configurePdfJsWorker } = await import('../manuscript/pdfjs-loader')
    const pdfjsLib = await loadPdfJs()
    await configurePdfJsWorker(pdfjsLib)
    // Copy bytes — pdf.js may transfer/detach the underlying buffer.
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) }).promise
    const pageCount = Math.min(pdf.numPages, FIRST_PAGES)
    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      pageItems.push(
        (content.items as { str?: string }[])
          .map((item) => (item.str ?? '').trim())
          .filter(Boolean)
      )
      if (page.cleanup) void page.cleanup()
    }
    await pdf.destroy()
  } catch {
    pageItems = []
  }

  const bodyText = pageItems.map((items) => items.join(' ')).join('\n')
  const doi = doiFromBodyText(bodyText) ?? doiFromFileName(fileName)

  const titleGuess = guessTitleFromFirstPage(
    (pageItems[0] ?? []).join('\n').replace(DOI_LINE_NOISE, '\n')
  )

  return {
    ...(doi ? { doi } : {}),
    ...(titleGuess ? { title: titleGuess } : {})
  }
}

const DOI_LINE_NOISE = /(?:doi[:\s]*)?10\.\d{4,9}\/\S*/gi

/**
 * Deterministic matcher: DOI exact → normalized title exact → filename stem
 * equal to a bibliography key (`3.pdf` → `[3]`). Ambiguous when a signal hits
 * multiple targets. Confirm-before-apply lives in the UI.
 */
export function matchPaperIdentity(
  signals: PaperIdentitySignals & { fileName?: string },
  targets: PaperMatchTarget[]
): PaperMatch {
  const signalDoi = signals.doi
    ? normalizeDoi(signals.doi)
    : doiFromFileName(signals.fileName)

  if (signalDoi) {
    const byDoi = targets.filter((target) => targetDoi(target) === signalDoi)
    if (byDoi.length === 1) {
      return { bibKeys: [byDoi[0].bibKey], kind: 'matched', matchedBy: 'doi' }
    }
    if (byDoi.length > 1) {
      return { bibKeys: byDoi.map((target) => target.bibKey), kind: 'ambiguous', matchedBy: 'doi' }
    }
  }

  const candidateTitle = signals.title ? normalizeTitle(signals.title) : undefined
  if (candidateTitle) {
    const byTitle = targets.filter((target) => {
      const title = targetTitle(target)
      return Boolean(title && title === candidateTitle)
    })
    if (byTitle.length === 1) {
      return { bibKeys: [byTitle[0].bibKey], kind: 'matched', matchedBy: 'title' }
    }
    if (byTitle.length > 1) {
      return { bibKeys: byTitle.map((target) => target.bibKey), kind: 'ambiguous', matchedBy: 'title' }
    }
  }

  const stemKey = bibKeyFromFileName(signals.fileName)
  if (stemKey) {
    const byKey = targets.filter((target) => target.bibKey === stemKey)
    if (byKey.length === 1) {
      return { bibKeys: [byKey[0].bibKey], kind: 'matched', matchedBy: 'bibKey' }
    }
    if (byKey.length > 1) {
      return { bibKeys: byKey.map((target) => target.bibKey), kind: 'ambiguous', matchedBy: 'bibKey' }
    }
  }

  return { bibKeys: [], kind: 'unmatched', matchedBy: null }
}

/** Build match targets from resolved citation items + their bib keys. */
export function targetsFromItems(items: { bibKey: string; item?: CslItem; raw?: string }[]): PaperMatchTarget[] {
  return items.map(({ bibKey, item }) => ({
    bibKey,
    ...(item?.DOI ? { DOI: item.DOI } : {}),
    ...(item?.title ? { title: item.title } : {})
  }))
}
