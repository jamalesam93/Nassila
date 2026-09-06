import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CslItem } from '../../engine/types'
import type {
  RaqimLookupKind,
  RaqimResolveCandidate
} from '../../shared/raqim-resolve'
import type {
  WebpageFieldSuggestion,
  WebpageSuggestableField,
  WebpageSuggestionSource
} from '../../shared/webpage-suggestions'
import {
  applyWebpageFieldSuggestions,
  buildGreyLitFieldSuggestions,
  buildWebpageFieldSuggestions,
  formatWebpageSuggestionPreview
} from '../../engine/webpage-field-suggestions'
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
  const [fieldSuggestions, setFieldSuggestions] = useState<WebpageFieldSuggestion[]>([])
  const [suggestionSource, setSuggestionSource] = useState<WebpageSuggestionSource | null>(null)
  const [acceptedFields, setAcceptedFields] = useState<Set<WebpageSuggestableField>>(new Set())
  const [canUndoApply, setCanUndoApply] = useState(false)
  const keyDirtyRef = useRef(false)
  const networkStatus = useCitationStore((state) => state.networkStatus)
  const selectedStyleId = useCitationStore((state) => state.selectedStyleId)

  const fieldForKey = (lookupKind: RaqimLookupKind): string => {
    switch (lookupKind) {
      case 'doi':
        return item.DOI ?? ''
      case 'pmid':
        return item.PMID ?? ''
      case 'pmcid':
        return item.PMCID ?? ''
      case 'url':
        return item.URL ?? ''
      default:
        return item.title ?? ''
    }
  }

  const bestIdentifier = (): { kind: RaqimLookupKind; value: string } | null => {
    // Mirrors the engine fallback chain (raqim-resolve.ts lookupRaqimCandidates):
    // DOI → PMID → PMCID → URL → title.
    const chain: RaqimLookupKind[] = ['doi', 'pmid', 'pmcid', 'url', 'title']
    for (const lookupKind of chain) {
      const value = fieldForKey(lookupKind).trim()
      if (value) return { kind: lookupKind, value }
    }
    return null
  }

  const syncKey = (lookupKind: RaqimLookupKind) => {
    setKind(lookupKind)
    if (!keyDirtyRef.current) setKey(fieldForKey(lookupKind))
  }

  const clearFieldSuggestions = () => {
    setFieldSuggestions([])
    setSuggestionSource(null)
    setAcceptedFields(new Set())
    setCanUndoApply(false)
  }

  const presentSuggestions = (
    suggestions: WebpageFieldSuggestion[],
    source: WebpageSuggestionSource
  ) => {
    setFieldSuggestions(suggestions)
    setSuggestionSource(source)
    setAcceptedFields(new Set(suggestions.map((s) => s.field)))
    setCanUndoApply(false)
    setOpen(true)
  }

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

  const webpageUrl = item.URL ?? (item.DOI ? `https://doi.org/${item.DOI}` : undefined)
  // Archive lookups always target the page URL — never a doi.org fallback (#18).
  const archiveTargetUrl = item.URL?.trim() || undefined
  const [waybackSnapshot, setWaybackSnapshot] = useState<{ timestamp: string; url: string } | null>(
    null
  )

  const checkWayback = async () => {
    if (!archiveTargetUrl || !window.api?.checkWaybackAvailability || networkStatus !== 'online') {
      setWaybackSnapshot(null)
      return
    }
    try {
      setWaybackSnapshot((await window.api.checkWaybackAvailability(archiveTargetUrl)) ?? null)
    } catch {
      setWaybackSnapshot(null)
    }
  }

  const toggleOpen = () => {
    const next = !open
    setOpen(next)
    if (next) void checkWayback()
  }

  /** Network webpage metadata — suggest only; never auto-apply. */
  const fetchWebpageMeta = async () => {
    if (!webpageUrl || !window.api?.resolveWebpageMetadata || networkStatus !== 'online') return
    setBusy(true)
    setError(null)
    clearFieldSuggestions()
    try {
      const result = (await window.api.resolveWebpageMetadata(webpageUrl)) as {
        item: CslItem | null
        hostProfile?: { kind: string; stableParser: boolean }
        health: { isDead: boolean; waybackUrl: string }
      } | null

      if (!result?.item) {
        setError(t('raqimResolve.webpageMetaFailed'))
        return
      }

      const suggestions = buildWebpageFieldSuggestions(item, result.item, {
        source: 'webpage_metadata',
        hostProfile: result.hostProfile
          ? { stableParser: result.hostProfile.stableParser }
          : undefined,
        suggestAccessed: true
      })

      if (suggestions.length === 0) {
        setError(t('raqimResolve.webpageMetaNoChanges'))
        return
      }
      presentSuggestions(suggestions, 'webpage_metadata')
    } catch (metaErr) {
      setError(metaErr instanceof Error ? metaErr.message : t('raqimResolve.webpageMetaFailed'))
    } finally {
      setBusy(false)
    }
  }

  /** Offline grey-lit host/path stubs — suggest only; never auto-apply. */
  const suggestGreyLit = () => {
    setError(null)
    clearFieldSuggestions()
    const batch = buildGreyLitFieldSuggestions(item)
    if (!batch || batch.suggestions.length === 0) {
      setError(t('raqimResolve.greyLitNoSuggestions'))
      return
    }
    presentSuggestions(batch.suggestions, 'grey_lit')
  }

  const toggleField = (field: WebpageSuggestableField) => {
    setAcceptedFields((prev) => {
      const next = new Set(prev)
      if (next.has(field)) next.delete(field)
      else next.add(field)
      return next
    })
  }

  const applyAcceptedSuggestions = () => {
    if (fieldSuggestions.length === 0 || acceptedFields.size === 0) return
    const patched = applyWebpageFieldSuggestions(item, fieldSuggestions, acceptedFields)
    const updates: Partial<CslItem> = {}
    for (const field of acceptedFields) {
      ;(updates as Record<string, unknown>)[field] = patched[field]
    }
    useCitationStore.getState().updateCitation(item.id, updates)
    clearFieldSuggestions()
    setCanUndoApply(true)
  }

  const rejectSuggestions = () => {
    clearFieldSuggestions()
  }

  const undoLastApply = () => {
    useCitationStore.getState().undo()
    setCanUndoApply(false)
  }

  return (
    <div className="mt-2 ps-4">
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          className="rounded border border-input bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={toggleOpen}
          aria-expanded={open}
        >
          {open ? t('raqimResolve.close') : t('raqimResolve.open')}
        </button>
        <button
          type="button"
          className="rounded border border-input bg-background px-2 py-1 text-xs text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          disabled={networkStatus !== 'online' || busy}
          onClick={() => {
            const best = bestIdentifier()
            if (best) {
              setKind(best.kind)
              setKey(best.value)
              keyDirtyRef.current = false
            }
            setOpen(true)
            void lookup(false)
          }}
        >
          {busy ? t('raqimResolve.searching') : t('raqimResolve.verifyRow')}
        </button>
        {webpageUrl && (
          <button
            type="button"
            className="rounded border border-input bg-background px-2 py-1 text-xs text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            disabled={networkStatus !== 'online' || busy}
            onClick={() => void fetchWebpageMeta()}
          >
            {busy ? t('raqimResolve.fetchingWebpageMeta') : t('raqimResolve.fetchWebpageMeta')}
          </button>
        )}
        {item.URL?.trim() && (
          <button
            type="button"
            className="rounded border border-input bg-background px-2 py-1 text-xs text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy}
            onClick={suggestGreyLit}
          >
            {t('raqimResolve.suggestGreyLit')}
          </button>
        )}
        <button
          type="button"
          className="rounded border border-input bg-background px-2 py-1 text-xs text-foreground hover:bg-accent"
          onClick={autocorrectRow}
        >
          {t('raqimResolve.autocorrectRow')}
        </button>
        {waybackSnapshot && (
          <a
            href={waybackSnapshot.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded border border-input bg-background px-2 py-1 text-xs text-foreground hover:bg-accent"
          >
            {t('raqimResolve.waybackArchive')} ↗
          </a>
        )}
        {canUndoApply && (
          <button
            type="button"
            className="rounded border border-input bg-background px-2 py-1 text-xs text-foreground hover:bg-accent"
            onClick={undoLastApply}
          >
            {t('raqimResolve.undoWebpageApply')}
          </button>
        )}
      </div>

      {open && (
        <div className="mt-2 space-y-2 border-s-2 border-border ps-3">
          <p className="text-xs text-muted-foreground">
            {t(item.type === 'legislation' ? 'raqimResolve.legislationHint' : 'raqimResolve.hint')}
          </p>
          <div className="flex gap-1.5">
            <select
              className="rounded border border-input bg-background px-2 py-1 text-xs text-foreground"
              value={kind}
              onChange={(event) => syncKey(event.target.value as RaqimLookupKind)}
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
              onChange={(event) => {
                keyDirtyRef.current = true
                setKey(event.target.value)
              }}
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

          {fieldSuggestions.length > 0 && suggestionSource && (
            <div className="space-y-2 border border-border bg-muted/20 p-2">
              <p className="text-xs font-medium text-foreground">
                {t('raqimResolve.webpageSuggestionsTitle', {
                  source: t(`raqimResolve.suggestionSource.${suggestionSource}`)
                })}
              </p>
              <p className="text-xs text-muted-foreground">{t('raqimResolve.webpageSuggestionsHint')}</p>
              <div className="divide-y divide-border border-y border-border">
                {fieldSuggestions.map((suggestion) => (
                  <label
                    key={suggestion.field}
                    className="flex cursor-pointer items-start gap-2 py-2 text-xs hover:bg-muted/40"
                  >
                    <input
                      type="checkbox"
                      checked={acceptedFields.has(suggestion.field)}
                      onChange={() => toggleField(suggestion.field)}
                      className="mt-0.5"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-foreground">
                        {t(`raqimResolve.suggestField.${suggestion.field}`)}
                      </span>
                      <span className="mt-0.5 block text-foreground" dir="auto">
                        {formatWebpageSuggestionPreview(suggestion.field, suggestion.proposed)}
                      </span>
                      <span className="mt-0.5 flex flex-wrap gap-x-2 text-muted-foreground">
                        <span>
                          {t('raqimResolve.confidence', {
                            score: Math.round(suggestion.provenance.confidence * 100)
                          })}
                        </span>
                        <span>{suggestion.provenance.evidence}</span>
                        <span>{t(`raqimResolve.suggestionSource.${suggestion.provenance.source}`)}</span>
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{t('raqimResolve.webpageApplyHint')}</p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    className="rounded border border-input bg-background px-2.5 py-1 text-xs text-foreground hover:bg-accent"
                    onClick={rejectSuggestions}
                  >
                    {t('raqimResolve.rejectSuggestions')}
                  </button>
                  <button
                    type="button"
                    className="rounded bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={acceptedFields.size === 0}
                    onClick={applyAcceptedSuggestions}
                  >
                    {t('raqimResolve.applyAcceptedFields')}
                  </button>
                </div>
              </div>
            </div>
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
                      <span>
                        {t('raqimResolve.confidence', { score: Math.round(candidate.confidence * 100) })}
                      </span>
                    </span>
                    {candidate.matchedFields.length > 0 && (
                      <span className="mt-0.5 block text-green-700 dark:text-green-300">
                        {t('raqimResolve.matchedFields', { fields: candidate.matchedFields.join(', ') })}
                      </span>
                    )}
                    {candidate.mismatchReasons.length > 0 && (
                      <span className="mt-0.5 block text-amber-700 dark:text-amber-300">
                        {t('raqimResolve.mismatchReasons', {
                          fields: candidate.mismatchReasons.join(', ')
                        })}
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
