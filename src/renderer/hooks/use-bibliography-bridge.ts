import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { segmentManuscriptText } from '../../engine/manuscript/segments'
import { manuscriptReferencesToCslItems } from '../../engine/manuscript/bibliography-bridge'
import { useCitationEngine } from './use-citation-engine'
import { useManuscriptAuditStore } from '../stores/manuscript-audit-store'
import { useShellStore } from '../stores/shell-store'

export type ExportManuscriptRefsResult =
  | { ok: true; count: number; parseErrors: number }
  | { ok: false; reason: 'empty' | 'no_references' | 'no_parsed_items' }

export function useBibliographyBridge() {
  const { t } = useTranslation()
  const { ingestManuscriptReferenceItems } = useCitationEngine()
  const setAuditReferenceSource = useManuscriptAuditStore((s) => s.setAuditReferenceSource)
  const setBibliographyImportStatus = useShellStore((s) => s.setBibliographyImportStatus)

  const exportManuscriptRefsToBibliography = useCallback(
    async (rawManuscriptText: string): Promise<ExportManuscriptRefsResult> => {
      const trimmed = rawManuscriptText.trim()
      if (!trimmed) return { ok: false, reason: 'empty' }

      const seg = segmentManuscriptText(trimmed)
      if (!seg.referencesText?.trim()) return { ok: false, reason: 'no_references' }

      const { items, errors } = await manuscriptReferencesToCslItems(seg.referencesText)
      if (items.length === 0) return { ok: false, reason: 'no_parsed_items' }

      ingestManuscriptReferenceItems(items, t('loop.exportRefsUndoLabel'))
      setAuditReferenceSource('bibliography')
      setBibliographyImportStatus(
        t('loop.exportRefsStatus', { count: items.length, errors: errors.length })
      )

      return { ok: true, count: items.length, parseErrors: errors.length }
    },
    [ingestManuscriptReferenceItems, setAuditReferenceSource, setBibliographyImportStatus, t]
  )

  return { exportManuscriptRefsToBibliography }
}
