import { describe, expect, it, vi, afterEach } from 'vitest'
import type { CslItem } from '@engine/types'
import {
  applyWebpageFieldSuggestions,
  buildGreyLitFieldSuggestions,
  buildWebpageFieldSuggestions,
  formatWebpageSuggestionPreview
} from '@engine/webpage-field-suggestions'

const base: CslItem = {
  id: 'row-web-1',
  type: 'webpage',
  URL: 'https://github.com/acme/widgets'
}

describe('webpage field suggestions (confirm-before-apply)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('builds field patches with provenance and does not mutate the current item', () => {
    const current: CslItem = { ...base, title: 'Old title' }
    const snapshot = structuredClone(current)
    const proposed: CslItem = {
      id: 'tmp',
      type: 'webpage',
      title: 'Widgets by Acme',
      publisher: 'GitHub',
      URL: 'https://github.com/acme/widgets',
      'container-title': 'github.com'
    }

    const suggestions = buildWebpageFieldSuggestions(current, proposed, {
      source: 'webpage_metadata',
      hostProfile: { stableParser: true },
      suggestAccessed: false
    })

    expect(current).toEqual(snapshot)
    expect(suggestions.map((s) => s.field).sort()).toEqual(
      ['container-title', 'publisher', 'title'].sort()
    )
    for (const suggestion of suggestions) {
      expect(suggestion.provenance.source).toBe('webpage_metadata')
      expect(suggestion.provenance.confidence).toBeGreaterThan(0)
      expect(suggestion.provenance.confidence).toBeLessThanOrEqual(1)
      expect(suggestion.provenance.evidence.length).toBeGreaterThan(0)
    }
  })

  it('applies only accepted fields and leaves rejected fields untouched', () => {
    const current: CslItem = { ...base, title: 'Keep me', publisher: 'old-host' }
    const suggestions = buildWebpageFieldSuggestions(
      current,
      {
        id: 'tmp',
        type: 'webpage',
        title: 'New title',
        publisher: 'GitHub',
        URL: current.URL
      },
      { source: 'webpage_metadata', suggestAccessed: false }
    )

    const applied = applyWebpageFieldSuggestions(current, suggestions, ['publisher'])

    expect(applied.title).toBe('Keep me')
    expect(applied.publisher).toBe('GitHub')
    expect(applied.URL).toBe(current.URL)
    expect(current.publisher).toBe('old-host')
  })

  it('reject path is a no-op when no fields are accepted', () => {
    const current: CslItem = { ...base, title: 'Keep me' }
    const suggestions = buildWebpageFieldSuggestions(
      current,
      { id: 'tmp', type: 'webpage', title: 'Other', URL: current.URL },
      { source: 'webpage_metadata', suggestAccessed: false }
    )

    const rejected = applyWebpageFieldSuggestions(current, suggestions, [])
    expect(rejected).toEqual({ ...current })
  })

  it('suggests accessed date when missing and formats previews', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-27T12:00:00Z'))

    const suggestions = buildWebpageFieldSuggestions(
      base,
      { id: 'tmp', type: 'webpage', title: 'Widgets', URL: base.URL },
      { source: 'grey_lit', hostProfile: { stableParser: true }, suggestAccessed: true }
    )

    const accessed = suggestions.find((s) => s.field === 'accessed')
    expect(accessed?.proposed).toEqual({ 'date-parts': [[2026, 8, 27]] })
    expect(accessed?.provenance.evidence).toBe('accessed-today')
    expect(formatWebpageSuggestionPreview('accessed', accessed!.proposed)).toBe('2026-8-27')
  })

  it('builds offline grey-lit suggestions from a host stub without mutating the row', () => {
    const current: CslItem = {
      id: 'row-gh',
      type: 'webpage',
      URL: 'https://github.com/acme/widgets'
    }
    const snapshot = structuredClone(current)
    const batch = buildGreyLitFieldSuggestions(current)

    expect(current).toEqual(snapshot)
    expect(batch).not.toBeNull()
    expect(batch!.suggestions.length).toBeGreaterThan(0)
    expect(batch!.suggestions.every((s) => s.provenance.source === 'grey_lit')).toBe(true)
    expect(batch!.suggestions.some((s) => s.field === 'title')).toBe(true)
  })

  it('skips grey-lit title overwrite when the row already has a title', () => {
    const current: CslItem = {
      id: 'row-gh',
      type: 'webpage',
      title: 'My curated title',
      URL: 'https://github.com/acme/widgets'
    }
    const batch = buildGreyLitFieldSuggestions(current)
    expect(batch?.suggestions.some((s) => s.field === 'title')).toBeFalsy()
  })
})
