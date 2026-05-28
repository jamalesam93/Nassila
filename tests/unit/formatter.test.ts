import { describe, expect, it } from 'vitest'
import { ensureDoiLinksInBibliographyEntries } from '../../src/engine/formatter/index'
import type { CslItem } from '../../src/engine/types'

describe('formatter DOI output', () => {
  it('appends a DOI link when the CSL entry omits it', () => {
    const items: CslItem[] = [{
      id: 'ref-1',
      type: 'article-journal',
      title: 'Clinical Trial',
      DOI: '10.1000/example'
    }]

    const [entry] = ensureDoiLinksInBibliographyEntries(
      ['<div class="csl-entry">Clinical Trial. Journal.</div>'],
      [['ref-1']],
      items
    )

    expect(entry).toContain('https://doi.org/10.1000/example')
    expect(entry).toContain('<a href="https://doi.org/10.1000/example">')
  })

  it('does not append a duplicate DOI link', () => {
    const items: CslItem[] = [{
      id: 'ref-1',
      type: 'article-journal',
      title: 'Clinical Trial',
      DOI: '10.1000/example'
    }]

    const [entry] = ensureDoiLinksInBibliographyEntries(
      ['<div class="csl-entry">Clinical Trial. https://doi.org/10.1000/example</div>'],
      [['ref-1']],
      items
    )

    expect(entry.match(/https:\/\/doi\.org\/10\.1000\/example/g)).toHaveLength(1)
  })
})
