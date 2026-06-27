import { parseInTextCitations } from '../../engine/manuscript/intext'
import { segmentManuscriptText } from '../../engine/manuscript/segments'
import type { AuditReferenceSource } from '../stores/manuscript-audit-store'

export type ManuscriptPreview =
  | { ok: false; reason: 'empty' | 'no_references' | 'no_intext_cites' }
  | {
      ok: true
      wordCount: number
      inTextCitationCount: number
      hasBody: boolean
      referenceSource: 'embedded' | 'bibliography'
    }

export function previewManuscript(
  raw: string,
  options?: { auditReferenceSource?: AuditReferenceSource; bibliographyCount?: number }
): ManuscriptPreview {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: false, reason: 'empty' }

  const seg = segmentManuscriptText(trimmed)
  const inText = parseInTextCitations(seg.bodyText)
  const bibliographyCount = options?.bibliographyCount ?? 0
  const useBibliography = options?.auditReferenceSource === 'bibliography' && bibliographyCount > 0

  if (useBibliography) {
    if (inText.citations.length === 0) return { ok: false, reason: 'no_intext_cites' }
    return {
      ok: true,
      wordCount: seg.fullText.split(/\s+/).filter(Boolean).length,
      inTextCitationCount: inText.citations.length,
      hasBody: seg.bodyText.trim().length > 0,
      referenceSource: 'bibliography'
    }
  }

  if (!seg.referencesText?.trim()) return { ok: false, reason: 'no_references' }

  return {
    ok: true,
    wordCount: seg.fullText.split(/\s+/).filter(Boolean).length,
    inTextCitationCount: inText.citations.length,
    hasBody: seg.bodyText.trim().length > 0,
    referenceSource: 'embedded'
  }
}
