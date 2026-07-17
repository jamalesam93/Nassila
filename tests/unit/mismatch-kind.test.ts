import { describe, expect, it } from 'vitest'
import type { CslItem, VerificationMismatch } from '../../src/engine/types'
import { isDoiTitleConflict, partitionMismatches } from '../../src/engine/verifier/mismatch-kind'

const SOCIAL_LINE =
  '[8] Alshakka M. Importance of incorporating social pharmacy education in Yemeni pharmacy schools curriculum. https://doi.org/10.1186/s40545-021-00300-3.'

const PPRI_TITLE =
  'Addressing the medicines access challenge through balance, evidence, collaboration and transparency'

describe('mismatch-kind', () => {
  it('flags DOI/title identity conflict when canonical disagrees with _original', () => {
    const item: CslItem = {
      id: 'c1',
      type: 'article-journal',
      title: 'Importance of incorporating social pharmacy education in Yemeni pharmacy schools curriculum',
      DOI: '10.1186/s40545-021-00300-3',
      _original: SOCIAL_LINE
    }
    const mismatch: VerificationMismatch = {
      id: 'm1',
      citationId: 'c1',
      field: 'title',
      userValue: item.title!,
      canonicalValue: PPRI_TITLE,
      source: 'crossref'
    }
    expect(isDoiTitleConflict(item, mismatch)).toBe(true)
  })

  it('partitions cosmetic vs DOI conflict mismatches', () => {
    const items: CslItem[] = [
      {
        id: 'a',
        type: 'article-journal',
        title: 'Short typo title for same paper',
        _original: 'Short typo title for same paper extra words from line'
      },
      {
        id: 'b',
        type: 'article-journal',
        title: 'Cardiology pharmacy practice in Saudi Arabia',
        _original: SOCIAL_LINE
      }
    ]
    const mismatches: VerificationMismatch[] = [
      {
        id: 'm1',
        citationId: 'a',
        field: 'title',
        userValue: 'Short typo title',
        canonicalValue: 'Short typo title for same paper',
        source: 'crossref'
      },
      {
        id: 'm2',
        citationId: 'b',
        field: 'title',
        userValue: items[1]!.title!,
        canonicalValue: PPRI_TITLE,
        source: 'crossref'
      }
    ]
    const { cosmetic, doiConflicts } = partitionMismatches(items, mismatches)
    expect(cosmetic).toHaveLength(1)
    expect(cosmetic[0]!.id).toBe('m1')
    expect(doiConflicts).toHaveLength(1)
    expect(doiConflicts[0]!.id).toBe('m2')
  })

  it('holds all field mismatches for a DOI↔title conflict citation id', () => {
    const items: CslItem[] = [
      {
        id: 'b',
        type: 'article-journal',
        title: 'Cardiology pharmacy practice in Saudi Arabia',
        _original: SOCIAL_LINE,
        issued: { 'date-parts': [[2020]] }
      }
    ]
    const mismatches: VerificationMismatch[] = [
      {
        id: 'm2',
        citationId: 'b',
        field: 'title',
        userValue: items[0]!.title!,
        canonicalValue: PPRI_TITLE,
        source: 'crossref'
      },
      {
        id: 'm3',
        citationId: 'b',
        field: 'year',
        userValue: '2020',
        canonicalValue: '2019',
        source: 'crossref'
      }
    ]
    const { cosmetic, doiConflicts } = partitionMismatches(items, mismatches)
    expect(cosmetic).toHaveLength(0)
    expect(doiConflicts).toHaveLength(2)
  })
})
