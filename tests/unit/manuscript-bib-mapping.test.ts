import { describe, expect, it } from 'vitest'
import {
  buildBibEntriesFromReferencesText,
  mapInTextToBibliography,
  selectMappedBibliographyEntries,
  summarizeCitationMappings
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

