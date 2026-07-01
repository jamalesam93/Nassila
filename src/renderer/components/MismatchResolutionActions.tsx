import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CslItem, VerificationMismatch } from '../../engine/types'
import { isDoiTitleConflict } from '../../engine/verifier/mismatch-kind'
import { useCitationEngine } from '../hooks/use-citation-engine'
import { Button } from './ui/button'

type MismatchResolutionActionsProps = {
  citation: CslItem
  mismatch: VerificationMismatch
  networkOnline: boolean
}

export function MismatchResolutionActions({
  citation,
  mismatch,
  networkOnline
}: MismatchResolutionActionsProps) {
  const { t } = useTranslation()
  const { resolveDoiForCitation, applyRegistryTitleForMismatch } = useCitationEngine()
  const [busy, setBusy] = useState<'doi' | 'title' | null>(null)

  if (mismatch.field !== 'title' || !isDoiTitleConflict(citation, mismatch)) {
    return null
  }

  return (
    <div className="mt-2 space-y-1.5 border-t border-yellow-500/20 pt-2">
      <p className="text-xs text-yellow-800/90 dark:text-yellow-300/90">
        {t('outputPanel.doiTitleConflictHint')}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 border-green-600/40 bg-green-500/10 text-xs text-green-800 hover:bg-green-500/20 dark:text-green-200"
          disabled={!networkOnline || busy !== null}
          onClick={() => {
            setBusy('doi')
            void resolveDoiForCitation(citation.id).finally(() => setBusy(null))
          }}
        >
          {busy === 'doi' ? t('outputPanel.replaceDoiBusy') : t('outputPanel.findDoiForTitle')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          disabled={busy !== null}
          onClick={() => {
            setBusy('title')
            void applyRegistryTitleForMismatch(citation.id, mismatch.id).finally(() => setBusy(null))
          }}
        >
          {busy === 'title' ? t('outputPanel.applyingRegistryTitle') : t('outputPanel.useRegistryTitle')}
        </Button>
      </div>
    </div>
  )
}

export function mismatchFieldLabel(
  citation: CslItem,
  mismatch: VerificationMismatch,
  t: (key: string, opts?: Record<string, string>) => string
): string {
  if (mismatch.field === 'title' && isDoiTitleConflict(citation, mismatch)) {
    return t('outputPanel.doiTitleConflictField')
  }
  return t('issuePanel.mismatchField', { field: mismatch.field })
}
