import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCitationStore } from '../stores/citation-store'
import type { JournalGuidelines as JournalGuidelinesData } from '../../engine/types'
import { getJournalGuidelines } from '../../engine/target'

export default function JournalGuidelines() {
  const { t } = useTranslation()
  const selectedJournal = useCitationStore((s) => s.selectedJournal)
  const styleTargetMode = useCitationStore((s) => s.styleTargetMode)
  const [guidelines, setGuidelines] = useState<JournalGuidelinesData | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!selectedJournal) {
      setGuidelines(null)
      return () => {
        cancelled = true
      }
    }

    void getJournalGuidelines(selectedJournal)
      .then((result) => {
        if (!cancelled) {
          setGuidelines(result)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGuidelines(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [selectedJournal])

  if (!selectedJournal || styleTargetMode !== 'journal') {
    return null
  }

  return (
    <div className="border-t border-border">
      <div className="px-4 py-2">
        <h2 className="text-sm font-semibold text-foreground">{t('panels.journalGuidelines')}</h2>
      </div>
      <div className="px-4 pb-3">
        <div className="rounded-md border border-border bg-card p-3">
          <p className="text-xs font-medium text-foreground">{selectedJournal}</p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {t('journalGuidelines.referenceStyle', {
              style: guidelines?.referenceStyle ?? t('journalGuidelines.notMapped')
            })}
          </p>
          {guidelines?.additionalNotes?.length ? (
            <div className="mt-2 space-y-1">
              {guidelines.additionalNotes.map((note) => (
                <p key={note} className="text-[11px] text-muted-foreground">
                  {note}
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-muted-foreground">{t('journalGuidelines.emptyNotes')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
