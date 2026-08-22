import { describe, expect, it } from 'vitest'
import {
  applyDedupeAliases,
  buildBibEntriesFromReferencesText,
  dedupeBibEntries,
  mapInTextToBibliography,
  selectMappedBibliographyEntries,
  summarizeCitationMappings,
  type BibEntry
} from '../../src/engine/manuscript/mapping'
import { parseInTextCitations } from '../../src/engine/manuscript/intext'

describe('bibliography parsing + mapping', () => {
  it('builds numbered bib entries and maps numeric in-text citations', async () => {
    const refs = `
References
[1] Smith J. Title one. Journal. 2020.
[2] Doe A. Title two. Journal. 2021.
`.trim()

    const bib = await buildBibEntriesFromReferencesText(refs)
    expect(bib.entries.map((e) => e.key)).toEqual(['1', '2'])

    const inText = parseInTextCitations('See [2] for details.')
    const mapped = mapInTextToBibliography(inText.citations, bib.entries)
    expect(mapped[0].matchedBibKeys).toEqual(['2'])
  })

  it('reports zero mappings without selecting bibliography fallback entries', async () => {
    const bib = await buildBibEntriesFromReferencesText('[1] Smith J. Title one. Journal. 2020.')
    const inText = parseInTextCitations('An unsupported citation appears here [9].')
    const mapped = mapInTextToBibliography(inText.citations, bib.entries)

    expect(summarizeCitationMappings(mapped)).toEqual({
      matched: 0,
      ambiguous: 0,
      unmatched: 1
    })
    expect(selectMappedBibliographyEntries(bib.entries, mapped)).toEqual([])
  })
})

describe('bibliography dedupe (#19)', () => {
  function item(partial: Record<string, unknown>): BibEntry['item'] {
    return { id: String(partial.id ?? 'x'), type: 'article-journal', ...partial } as BibEntry['item']
  }

  it('merges same-DOI entries and preserves cite sites via aliases', () => {
    const entries: BibEntry[] = [
      { key: '3', raw: 'Vaswani A. Attention. 2017.', item: item({ id: 'a', DOI: '10.5555/attn' }) },
      {
        key: '18',
        raw: 'Vaswani A. Attention. NeurIPS. 2017.',
        item: item({ id: 'b', DOI: 'https://doi.org/10.5555/attn' })
      }
    ]

    const result = dedupeBibEntries(entries)

    expect(result.entries.map((entry) => entry.key)).toEqual(['3'])
    expect(result.aliases).toEqual({ '18': '3' })
    expect(result.ambiguousGroups).toEqual([])
  })

  it('merges by normalized title + year when DOIs are absent', () => {
    const entries: BibEntry[] = [
      {
        key: '2',
        raw: 'Smith J. Deep Residual Learning. CVPR 2015.',
        item: item({ id: 'a', title: 'Deep Residual Learning for Image Recognition', issued: { 'date-parts': [[2015]] } })
      },
      {
        key: '9',
        raw: 'Smith, John. Deep residual learning for image recognition. 2015.',
        item: item({ id: 'b', title: 'Deep  residual learning for IMAGE recognition!', issued: { 'date-parts': [[2015]] } })
      }
    ]

    const result = dedupeBibEntries(entries)
    expect(result.aliases).toEqual({ '9': '2' })
  })

  it('keeps conflicting-DOI same-title entries separate', () => {
    const entries: BibEntry[] = [
      {
        key: '4',
        raw: 'A retracted paper. 2019.',
        item: item({ id: 'a', title: 'Retracted findings', DOI: '10.1/one', issued: { 'date-parts': [[2019]] } })
      },
      {
        key: '5',
        raw: 'The corrected paper. 2019.',
        item: item({ id: 'b', title: 'Retracted findings', DOI: '10.2/two', issued: { 'date-parts': [[2019]] } })
      }
    ]

    expect(dedupeBibEntries(entries).aliases).toEqual({})
  })

  it('reports title-only look-alikes as ambiguous instead of merging', () => {
    const entries: BibEntry[] = [
      {
        key: '6',
        raw: 'An untitled-year study.',
        item: item({ id: 'a', title: 'Ambiguous Study' })
      },
      {
        key: '7',
        raw: 'Another ambiguous study.',
        item: item({ id: 'b', title: 'Ambiguous Study' })
      }
    ]

    const result = dedupeBibEntries(entries)
    expect(result.entries.map((entry) => entry.key)).toEqual(['6', '7'])
    expect(result.aliases).toEqual({})
    expect(result.ambiguousGroups).toEqual([['6', '7']])
  })

  it('rewrites citation matches onto canonical keys so both cite sites survive', () => {
    const entries: BibEntry[] = [
      { key: '3', raw: 'Same paper one.', item: item({ id: 'a', DOI: '10.5555/same' }) },
      { key: '18', raw: 'Same paper two.', item: item({ id: 'b', DOI: '10.5555/same' }) }
    ]
    const dedupe = dedupeBibEntries(entries)
    // Mapping runs on the ORIGINAL keys (both resolve); aliases collapse them.
    const mapped = mapInTextToBibliography(
      parseInTextCitations('As shown in [3], and confirmed by [18].').citations,
      entries
    )
    applyDedupeAliases(mapped, dedupe.aliases)

    const merged = mapped.find((m) => m.matchedBibKeys.length > 0) ?? mapped[0]
    expect(merged.matchedBibKeys).toEqual(['3'])
    const selected = selectMappedBibliographyEntries(dedupe.entries, mapped)
    expect(selected.map((entry) => entry.key)).toEqual(['3'])
  })

  it('returns no-op results for duplicate-free bibliographies', () => {
    const entries: BibEntry[] = [
      { key: '1', raw: 'One.', item: item({ id: 'a', DOI: '10.1/a' }) },
      { key: '2', raw: 'Two.', item: item({ id: 'b', DOI: '10.1/b' }) }
    ]
    const result = dedupeBibEntries(entries)
    expect(result.entries).toHaveLength(2)
    expect(result.aliases).toEqual({})
    expect(result.ambiguousGroups).toEqual([])
  })
})


