import { parseInTextCitations } from '../../engine/manuscript/intext'
import { segmentManuscriptText } from '../../engine/manuscript/segments'

export type ManuscriptPreview =
  | { ok: false; reason: 'empty' | 'no_references' }
  | {
      ok: true
      wordCount: number
      inTextCitationCount: number
      hasBody: boolean
    }

export function previewManuscript(raw: string): ManuscriptPreview {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: false, reason: 'empty' }

  const seg = segmentManuscriptText(trimmed)
  if (!seg.referencesText?.trim()) return { ok: false, reason: 'no_references' }

  const inText = parseInTextCitations(seg.bodyText)
  return {
    ok: true,
    wordCount: seg.fullText.split(/\s+/).filter(Boolean).length,
    inTextCitationCount: inText.citations.length,
    hasBody: seg.bodyText.trim().length > 0
  }
}
