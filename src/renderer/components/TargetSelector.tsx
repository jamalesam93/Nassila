import { useState, useEffect, useRef, useCallback } from 'react'
import { useCitationStore } from '../stores/citation-store'
import { useCitationEngine } from '../hooks/use-citation-engine'
import { findJournalByName, getStyleForJournal } from '../../engine/target/journal-database'
import { searchJournalsCrossRef } from '../../engine/resolver/journal-search'
import { useTranslation } from 'react-i18next'

type Tab = 'style' | 'journal'

interface JournalSuggestion {
  name: string
  publisher?: string
  styleId?: string
  source: 'local' | 'crossref'
  field?: string
  abbreviation?: string
}

export default function TargetSelector() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<Tab>('journal')
  const [styleSearch, setStyleSearch] = useState('')
  const [journalSearch, setJournalSearch] = useState('')
  const [suggestions, setSuggestions] = useState<JournalSuggestion[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const searchRequestIdRef = useRef(0)
  const selectedStyleId = useCitationStore((s) => s.selectedStyleId)
  const selectedJournal = useCitationStore((s) => s.selectedJournal)
  const setSelectedJournal = useCitationStore((s) => s.setSelectedJournal)
  const networkStatus = useCitationStore((s) => s.networkStatus)
  const recentStyles = useCitationStore((s) => s.recentStyles)
  const presets = useCitationStore((s) => s.presets)
  const { changeStyle, clearStyleTarget, availableStyles } = useCitationEngine()

  const filteredStyles = styleSearch
    ? availableStyles.filter((s) =>
        s.name.toLowerCase().includes(styleSearch.toLowerCase()) ||
        s.id.toLowerCase().includes(styleSearch.toLowerCase())
      )
    : availableStyles

  const handleSelectStyle = (styleId: string) => {
    const store = useCitationStore.getState()
    store.setStyleTargetMode('style')
    store.setSelectedJournal(null)
    changeStyle(styleId)
  }

  const handleClearStyle = () => {
    clearStyleTarget()
    setJournalSearch('')
    setSuggestions([])
  }

  const handleSelectJournal = (suggestion: JournalSuggestion) => {
    const store = useCitationStore.getState()
    store.setStyleTargetMode('journal')
    setSelectedJournal(suggestion.name)
    if (suggestion.styleId) {
      changeStyle(suggestion.styleId)
    }
    setJournalSearch('')
    setSuggestions([])
  }

  const searchJournals = useCallback(async (query: string) => {
    const requestId = ++searchRequestIdRef.current
    if (!query || query.length < 2) {
      setSuggestions([])
      setSearching(false)
      return
    }

    const localResults = findJournalByName(query)
    const localSuggestions: JournalSuggestion[] = localResults.map((entry) => ({
      name: entry.name,
      publisher: entry.publisher,
      styleId: entry.styleId,
      source: 'local' as const,
      field: entry.field,
      abbreviation: entry.abbreviation
    }))

    setSuggestions(localSuggestions)

    if (networkStatus === 'online' && localResults.length < 5) {
      setSearching(true)
      try {
        const crossrefResults = await searchJournalsCrossRef(query, 10)
        const localNames = new Set(localResults.map((r) => r.name.toLowerCase()))

        const crossrefSuggestions: JournalSuggestion[] = crossrefResults
          .filter((r) => !localNames.has(r.title.toLowerCase()))
          .map((r) => ({
            name: r.title,
            publisher: r.publisher,
            styleId: getStyleForJournal(r.title) ?? resolveStyleByPublisher(r.publisher),
            source: 'crossref' as const,
            field: r.subjects[0]
          }))

        if (requestId === searchRequestIdRef.current) {
          setSuggestions([...localSuggestions, ...crossrefSuggestions])
        }
      } catch {
        // keep local results
      } finally {
        if (requestId === searchRequestIdRef.current) {
          setSearching(false)
        }
      }
    }
  }, [networkStatus])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchJournals(journalSearch), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [journalSearch, searchJournals])

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h2 className="text-sm font-semibold text-foreground">{t('panels.targetStyle')}</h2>
        {(selectedStyleId || selectedJournal) && (
          <button
            onClick={handleClearStyle}
            className="rounded px-1.5 py-0.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
            title={t('targetSelector.clearStyleTitle')}
          >
            {t('targetSelector.clear')}
          </button>
        )}
      </div>

      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('journal')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'journal'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('targetSelector.byJournal')}
        </button>
        <button
          onClick={() => setActiveTab('style')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'style'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('targetSelector.byStyle')}
        </button>
      </div>

      {presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                if (preset.styleId) handleSelectStyle(preset.styleId)
              }}
              className="rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] font-medium text-foreground hover:bg-accent transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      <div className="px-4 py-3">
        {activeTab === 'journal' ? (
          <div>
            <div className="relative">
              <input
                type="text"
                value={journalSearch}
                onChange={(e) => setJournalSearch(e.target.value)}
                placeholder={t('targetSelector.journalPlaceholder')}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {searching && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {t('targetSelector.searching')}
                </span>
              )}
            </div>
            {suggestions.length > 0 && (
              <div className="mt-1 max-h-72 overflow-y-auto rounded-md border border-border bg-card shadow-sm">
                {suggestions.map((entry, idx) => (
                  <button
                    key={`${entry.name}-${idx}`}
                    onClick={() => handleSelectJournal(entry)}
                    className="block w-full px-3 py-2 text-left hover:bg-accent transition-colors border-b border-border/50 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground flex-1">{entry.name}</span>
                      {entry.source === 'crossref' && (
                        <span className="shrink-0 rounded bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 text-[9px] font-medium text-blue-700 dark:text-blue-300">
                          {t('targetSelector.crossRefBadge')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {entry.publisher && (
                        <span className="text-xs text-muted-foreground">{entry.publisher}</span>
                      )}
                      {entry.styleId && (
                        <span className="text-xs text-primary/70">{entry.styleId}</span>
                      )}
                      {entry.field && (
                        <span className="text-xs text-muted-foreground/60">{entry.field}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {journalSearch.length >= 2 && suggestions.length === 0 && !searching && (
              <p className="mt-2 text-xs text-muted-foreground">{t('targetSelector.noJournalsFound', { query: journalSearch })}</p>
            )}
            {selectedJournal && (
              <div className="mt-2 rounded-md bg-primary/10 px-3 py-2 flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-primary">{selectedJournal}</p>
                  {selectedStyleId && (
                    <p className="text-xs text-primary/70 mt-0.5">{t('toolbar.style', { id: selectedStyleId })}</p>
                  )}
                </div>
                <button
                  onClick={handleClearStyle}
                  className="shrink-0 ml-2 rounded-full p-0.5 text-primary/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title={t('targetSelector.removeSelectionTitle')}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l6 6M9 3l-6 6"/></svg>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <input
              data-style-search-input
              type="text"
              value={styleSearch}
              onChange={(e) => setStyleSearch(e.target.value)}
              placeholder={t('targetSelector.stylePlaceholder')}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-2 space-y-1 max-h-72 overflow-y-auto">
              {filteredStyles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => handleSelectStyle(style.id)}
                  className={`block w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    selectedStyleId === style.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  {style.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {recentStyles.length > 0 && (
        <div className="border-t border-border px-4 py-2">
          <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">{t('targetSelector.recentlyUsed')}</p>
          <div className="space-y-1">
            {recentStyles.map((styleId) => (
              <button
                key={styleId}
                onClick={() => handleSelectStyle(styleId)}
                className="block w-full rounded px-2 py-1 text-left text-xs text-foreground hover:bg-accent transition-colors"
              >
                {availableStyles.find((s) => s.id === styleId)?.name ?? styleId}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function resolveStyleByPublisher(publisher: string): string | undefined {
  const p = publisher.toLowerCase()
  if (p.includes('springer') || p.includes('biomed central')) return 'springer-basic-author-date'
  if (p.includes('elsevier')) return 'elsevier-harvard'
  if (p.includes('wiley')) return 'vancouver'
  if (p.includes('taylor') || p.includes('routledge')) return 'chicago-author-date'
  if (p.includes('ieee')) return 'ieee'
  if (p.includes('sage')) return 'apa-7th'
  if (p.includes('oxford') || p.includes('oup')) return 'vancouver'
  if (p.includes('cambridge')) return 'vancouver'
  if (p.includes('nature') || p.includes('macmillan')) return 'nature'
  if (p.includes('acs') || p.includes('american chemical')) return 'acs'
  if (p.includes('aps') || p.includes('american physical')) return 'aps'
  if (p.includes('mdpi')) return 'vancouver'
  if (p.includes('frontiers')) return 'vancouver'
  if (p.includes('hindawi')) return 'vancouver'
  if (p.includes('de gruyter')) return 'chicago-author-date'
  if (p.includes('lippincott') || p.includes('wolters kluwer')) return 'vancouver'
  return undefined
}
