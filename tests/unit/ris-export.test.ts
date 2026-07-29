import { describe, expect, it } from 'vitest'
import { formatRis } from '../../src/engine/formatter/ris-export'
import { parseRis } from '../../src/engine/parser/ris'
import type { CslItem } from '../../src/engine/types'

const sampleItems: CslItem[] = [
  {
    id: 'ref-1',
    type: 'article-journal',
    title: 'Cross-Institutional Blood Pressure Prediction and the Limits of Electronic Health Record-Based Models',
    author: [
      { family: 'Azam', given: 'M' },
      { family: 'Singh', given: 'SI' }
    ],
    'container-title': 'Journal of Biomedical Informatics',
    issued: { 'date-parts': [[2025]] },
    volume: '150',
    issue: '2',
    page: '104200-104210',
    DOI: '10.1016/j.jbi.2025.104200',
    URL: 'https://doi.org/10.1016/j.jbi.2025.104200',
    abstract: 'Electronic health record (EHR) models face cross-institutional validation challenges.',
    publisher: 'Elsevier'
  },
  {
    id: 'ref-2',
    type: 'book',
    title: 'Deep Learning for Healthcare',
    author: [{ literal: 'World Health Organization' }],
    publisher: 'WHO Press',
    'publisher-place': 'Geneva',
    issued: { 'date-parts': [[2024, 6, 15]] }
  }
]

describe('RIS Exporter', () => {
  it('formats CSL items into valid RIS specification lines', () => {
    const risText = formatRis(sampleItems)

    expect(risText).toContain('TY  - JOUR')
    expect(risText).toContain('TI  - Cross-Institutional Blood Pressure Prediction and the Limits of Electronic Health Record-Based Models')
    expect(risText).toContain('AU  - Azam, M')
    expect(risText).toContain('AU  - Singh, SI')
    expect(risText).toContain('JO  - Journal of Biomedical Informatics')
    expect(risText).toContain('PY  - 2025')
    expect(risText).toContain('VL  - 150')
    expect(risText).toContain('IS  - 2')
    expect(risText).toContain('SP  - 104200')
    expect(risText).toContain('EP  - 104210')
    expect(risText).toContain('DO  - 10.1016/j.jbi.2025.104200')
    expect(risText).toContain('UR  - https://doi.org/10.1016/j.jbi.2025.104200')
    expect(risText).toContain('ER  - ')

    expect(risText).toContain('TY  - BOOK')
    expect(risText).toContain('AU  - World Health Organization')
    expect(risText).toContain('PY  - 2024/06/15/')
    expect(risText).toContain('PB  - WHO Press')
    expect(risText).toContain('CY  - Geneva')
  })

  it('exports RIS text that can be parsed back by parseRis', async () => {
    const risText = formatRis(sampleItems)
    const result = await parseRis(risText)

    expect(result.errors).toHaveLength(0)
    expect(result.items.length).toBeGreaterThanOrEqual(2)
    expect(result.items[0].title).toContain('Cross-Institutional Blood Pressure Prediction')
  })
})
