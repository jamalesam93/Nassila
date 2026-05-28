import { describe, expect, it } from 'vitest'
import { buildBibEntriesFromReferencesText, mapInTextToBibliography } from '../../src/engine/manuscript/mapping'
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
})

