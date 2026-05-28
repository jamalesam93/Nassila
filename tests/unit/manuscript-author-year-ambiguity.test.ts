import { describe, expect, it } from 'vitest'
import { mapInTextToBibliography, type BibEntry } from '../../src/engine/manuscript/mapping'

describe('author-year ambiguity', () => {
  it('flags ambiguity when multiple bib entries match same author-year', () => {
    const bib: BibEntry[] = [
      { key: 'ref-1', raw: 'Smith J. A paper. 2020a.' },
      { key: 'ref-2', raw: 'Smith J. Another paper. 2020b.' }
    ]

    const mapped = mapInTextToBibliography(
      [{
        kind: 'author-year',
        raw: '(Smith, 2020)',
        start: 0,
        end: 12,
        authorFamilyNames: ['smith'],
        year: 2020,
        confidence: 'medium'
      }],
      bib
    )

    expect(mapped[0].ambiguity).toBeTruthy()
    expect(mapped[0].ambiguity?.candidates).toEqual(['ref-1', 'ref-2'])
  })
})

