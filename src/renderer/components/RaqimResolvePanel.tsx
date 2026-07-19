import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CslItem } from '../../engine/types'
import type {
  RaqimLookupKind,
  RaqimResolveCandidate
} from '../../shared/raqim-resolve'
import { autocorrect } from '../../engine/autocorrect'
import { validateCitations } from '../../engine/validator'
import { useCitationStore } from '../stores/citation-store'

const LOOKUP_KINDS: RaqimLookupKind[] = ['title', 'doi', 'pmid', 'pmcid', 'url']

interface RaqimResolvePanelProps {
  item: CslItem
}

export default function RaqimResolvePanel({ item }: RaqimResolvePanelProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<RaqimLookupKind>('title')
  const [key, setKey] = useState(item.title ?? item.DOI ?? item.PMID ?? item.PMCID ?? item.URL ?? '')
  const [candidates, setCandidates] = useState<RaqimResolveCandidate[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const networkStatus = useCitationStore((state) => state.networkStatus)
  const selectedStyleId = useCitationStore((state) => state.selectedStyleId)

  const lookup = async (manual: boolean) => {
    if (!window.api?.lookupRaqimCandidates || networkStatus !== 'online') return
    setBusy(true)
    setError(null)
    setSearched(true)
    try {
      const result = await window.api.lookupRaqimCandidates({
        item,
        key: manual ? key : undefined,
        kind: manual ? kind : undefined
      })
      setCandidates(result)
      setSelectedId(null)
    } catch (lookupError) {
      setCandidates([])
      setError(lookupError instanceof Error ? lookupError.message : t('raqimResolve.lookupFailed'))
    } finally {
      setBusy(false)
    }
  }

  const applySelected = () => {
    const selected = candidates.find((candidate) => candidate.id === selectedId)
    if (!selected) return
    const store = useCitationStore.getState()
    const replacement: CslItem = {
      ...selected.item,
      id: item.id,
      _original: item._original
    }
    store.replaceCitation(item.id, replacement)
    setOpen(false)
  }

  const autocorrectRow = () => {
    const issues = validateCitations([item], selectedStyleId ?? undefined)
    const corrected = autocorrect([item], issues, selectedStyleId ?? undefined).corrected[0]
    if (corrected) {
      useCitationStore.getState().updateCitation(item.id, corrected)
    }
  }

  return (
    <div className="mt-2 ps-4">
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          className="rounded border border-input bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          {open ? t('raqimResolve.close') : t('raqimResolve.open')}
        </button>
        <button
          type="button"
          className="rounded border border-input bg-background px-2 py-1 text-xs text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          disabled={networkStatus !== 'online' || busy}
          onClick={() => {
            setOpen(true)
            void lookup(false)
          }}
        >
          {busy ? t('raqimResolve.searching') : t('raqimResolve.verifyRow')}
        </button>
        <button
          type="button"
          className="rounded border border-input bg-background px-2 py-1 text-xs text-foreground hover:bg-accent"
          onClick={autocorrectRow}
        >
          {t('raqimResolve.autocorrectRow')}
        </button>
      </div>

      {open && (
        <div className="mt-2 space-y-2 border-s-2 border-border ps-3">
          <p className="text-xs text-muted-foreground">{t('raqimResolve.hint')}</p>
          <div className="flex gap-1.5">
            <select
              className="rounded border border-input bg-background px-2 py-1 text-xs text-foreground"
              value={kind}
              onChange={(event) => setKind(event.target.value as RaqimLookupKind)}
              aria-label={t('raqimResolve.keyType')}
            >
              {LOOKUP_KINDS.map((lookupKind) => (
                <option key={lookupKind} value={lookupKind}>
                  {t(`raqimResolve.lookupKind.${lookupKind}`)}
                </option>
              ))}
            </select>
            <input
              className="min-w-0 flex-1 rounded border border-input bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              placeholder={t('raqimResolve.keyPlaceholder')}
              dir={kind === 'title' ? undefined : 'ltr'}
            />
            <button
              type="button"
              className="rounded bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              disabled={networkStatus !== 'online' || busy || key.trim().length < 2}
              onClick={() => void lookup(true)}
            >
              {busy ? t('raqimResolve.searching') : t('raqimResolve.search')}
            </button>
          </div>

          {networkStatus !== 'online' && (
            <p className="text-xs text-amber-700 dark:text-amber-300">{t('raqimResolve.offline')}</p>
          )}
          {error && <p className="text-xs text-red-700 dark:text-red-300">{error}</p>}
          {searched && !busy && candidates.length === 0 && !error && (
            <p className="text-xs text-muted-foreground">{t('raqimResolve.noCandidates')}</p>
          )}

          {candidates.length > 0 && (
            <div className="divide-y divide-border border-y border-border">
              {candidates.map((candidate) => (
                <label
                  key={candidate.id}
                  className="flex cursor-pointer items-start gap-2 py-2 text-xs hover:bg-muted/40"
                >
                  <input
                    type="radio"
                    name={`raqim-candidate-${item.id}`}
                    checked={selectedId === candidate.id}
                    onChange={() => setSelectedId(candidate.id)}
                    className="mt-0.5"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-foreground">
                      {candidate.item.title ?? t('outputPanel.untitled')}
                    </span>
                    <span className="mt-0.5 flex flex-wrap gap-x-2 text-muted-foreground">
                      <span>{t(`raqimResolve.provider.${candidate.provider}`)}</span>
                      <span>{t(`raqimResolve.candidateKind.${candidate.kind}`)}</span>
                      <span>{t('raqimResolve.confidence', { score: Math.round(candidate.confidence * 100) })}</span>
                    </span>
                    {candidate.matchedFields.length > 0 && (
                      <span className="mt-0.5 block text-green-700 dark:text-green-300">
                        {t('raqimResolve.matchedFields', { fields: candidate.matchedFields.join(', ') })}
                      </span>
                    )}
                    {candidate.mismatchReasons.length > 0 && (
                      <span className="mt-0.5 block text-amber-700 dark:text-amber-300">
                        {t('raqimResolve.mismatchReasons', { fields: candidate.mismatchReasons.join(', ') })}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          )}

          {candidates.length > 0 && (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">{t('raqimResolve.selectionRequired')}</p>
              <button
                type="button"
                className="rounded bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!selectedId}
                onClick={applySelected}
              >
                {t('raqimResolve.applySelected')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
