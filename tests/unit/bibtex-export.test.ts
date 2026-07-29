import { describe, expect, it } from 'vitest'
import { formatBibtex } from '../../src/engine/formatter/bibtex-export'
import { parseBibtex } from '../../src/engine/parser/bibtex'
import type { CslItem } from '../../src/engine/types'

const sampleItems: CslItem[] = [
  {
    id: 'azam2025',
    type: 'article-journal',
    title: 'Cross-Institutional Blood Pressure Prediction',
    author: [{ family: 'Azam', given: 'M' }],
    'container-title': 'Journal of Biomedical Informatics',
    issued: { 'date-parts': [[2025]] },
    volume: '150',
    issue: '2',
    page: '100-110',
    DOI: '10.1016/j.jbi.2025.104200'
  }
]

describe('BibTeX Exporter', () => {
  it('formats CSL items into valid BibTeX entries', () => {
    const bibText = formatBibtex(sampleItems)

    expect(bibText).toContain('@article{azam2025,')
    expect(bibText).toContain('title = {Cross-Institutional Blood Pressure Prediction}')
    expect(bibText).toContain('author = {Azam, M}')
    expect(bibText).toContain('journal = {Journal of Biomedical Informatics}')
    expect(bibText).toContain('year = {2025}')
    expect(bibText).toContain('pages = {100--110}')
    expect(bibText).toContain('doi = {10.1016/j.jbi.2025.104200}')
  })

  it('exports BibTeX text that can be parsed back by parseBibtex', async () => {
    const bibText = formatBibtex(sampleItems)
    const result = await parseBibtex(bibText)

    expect(result.errors).toHaveLength(0)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].title).toBe('Cross-Institutional Blood Pressure Prediction')
  })
})
