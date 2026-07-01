import { describe, expect, it } from 'vitest'
import type { CslItem } from '../../src/engine/types'
import { bibEntriesFromCitationLibrary, manuscriptRefCitationId, manuscriptBibliographyLine } from '../../src/engine/manuscript/bibliography-bridge'

const SOCIAL_PHARMACY_ORIGINAL =
  '[8] Alshakka M, Aldubhani A, Basaleem H, Hassali MA, Izham M, Ibrahim M. Importance of incorporating social pharmacy education in Yemeni pharmacy schools curriculum. J Pharm Policy Pract 2021;14:1–9. https://doi.org/10.1186/s40545-021-00300-3.'

const PPRI_TITLE =
  'Addressing the medicines access challenge through balance, evidence, collaboration and transparency: key take-away lessons of the 4th PPRI Conference'

describe('manuscriptBibliographyLine', () => {
  it('prefers _original over registry-patched title', () => {
    const item: CslItem = {
      id: manuscriptRefCitationId('8'),
      type: 'article-journal',
      title: PPRI_TITLE,
      DOI: '10.1186/s40545-021-00300-3',
      _original: SOCIAL_PHARMACY_ORIGINAL
    }
    expect(manuscriptBibliographyLine(item)).toContain('Importance of incorporating social pharmacy education')
    expect(manuscriptBibliographyLine(item)).not.toContain('PPRI Conference')
  })

  it('bibEntriesFromCitationLibrary uses _original for raw', () => {
    const item: CslItem = {
      id: manuscriptRefCitationId('8'),
      type: 'article-journal',
      title: PPRI_TITLE,
      DOI: '10.1186/s40545-021-00300-3',
      _original: SOCIAL_PHARMACY_ORIGINAL
    }
    const [entry] = bibEntriesFromCitationLibrary([item])
    expect(entry.key).toBe('8')
    expect(entry.raw).toContain('social pharmacy education')
  })
})
