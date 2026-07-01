import { describe, expect, it } from 'vitest'
import type { CslItem, VerificationMismatch } from '../../src/engine/types'
import { applyVerificationMismatches } from '../../src/engine/verifier/apply-mismatches'

const SOCIAL_PHARMACY_ORIGINAL =
  '[8] Alshakka M. Importance of incorporating social pharmacy education in Yemeni pharmacy schools curriculum. https://doi.org/10.1186/s40545-021-00300-3.'

const PPRI_TITLE =
  'Addressing the medicines access challenge through balance, evidence, collaboration and transparency: key take-away lessons of the 4th PPRI Conference'

describe('applyVerificationMismatches title patch guard', () => {
  it('does not overwrite title when canonical conflicts with _original bibliography line', () => {
    const item: CslItem = {
      id: 'c1',
      type: 'article-journal',
      title: 'Importance of incorporating social pharmacy education in Yemeni pharmacy schools curriculum',
      DOI: '10.1186/s40545-021-00300-3',
      _original: SOCIAL_PHARMACY_ORIGINAL
    }
    const mismatches: VerificationMismatch[] = [
      {
        id: 'm1',
        citationId: 'c1',
        field: 'title',
        userValue: item.title!,
        canonicalValue: PPRI_TITLE,
        source: 'crossref'
      }
    ]
    const [next] = applyVerificationMismatches([item], mismatches)
    expect(next.title).toBe(item.title)
  })

  it('overwrites title when user explicitly accepts registry title (applyConflictingTitlePatch)', () => {
    const item: CslItem = {
      id: 'c1',
      type: 'article-journal',
      title: 'Cardiology pharmacy practice in Saudi Arabia',
      DOI: '10.1186/s40545-021-00300-3',
      _original: SOCIAL_PHARMACY_ORIGINAL
    }
    const mismatches: VerificationMismatch[] = [
      {
        id: 'm1',
        citationId: 'c1',
        field: 'title',
        userValue: item.title!,
        canonicalValue: PPRI_TITLE,
        source: 'crossref'
      }
    ]
    const [next] = applyVerificationMismatches([item], mismatches, {
      applyConflictingTitlePatch: true
    })
    expect(next.title).toBe(PPRI_TITLE)
  })
})
