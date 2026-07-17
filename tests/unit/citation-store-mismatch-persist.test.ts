import { describe, expect, it, beforeEach } from 'vitest'
import type { CslItem, VerificationMismatch } from '../../src/engine/types'
import { setPredatoryListCache, getBundledPredatoryList } from '../../src/engine/predatory/list-store'
import { useCitationStore } from '../../src/renderer/stores/citation-store'

const SOCIAL_LINE =
  '[8] Alshakka M. Importance of incorporating social pharmacy education in Yemeni pharmacy schools curriculum.'

const PPRI_TITLE =
  'Addressing the medicines access challenge through balance, evidence, collaboration and transparency'

describe('citation-store preserves verification mismatches', () => {
  beforeEach(() => {
    useCitationStore.getState().clearCitations()
    setPredatoryListCache(getBundledPredatoryList())
  })

  it('does not clear verificationMismatches when predatory list notifies', () => {
    const item: CslItem = {
      id: 'c1',
      type: 'article-journal',
      title: 'Importance of incorporating social pharmacy education in Yemeni pharmacy schools curriculum',
      DOI: '10.1186/s40545-021-00300-3',
      _original: SOCIAL_LINE,
      'container-title': 'Journal of Pharmaceutical Policy and Practice'
    }
    useCitationStore.getState().setCitations([item])
    const mismatch: VerificationMismatch = {
      id: 'm1',
      citationId: 'c1',
      field: 'title',
      userValue: item.title!,
      canonicalValue: PPRI_TITLE,
      source: 'crossref'
    }
    useCitationStore.getState().setVerificationMismatches([mismatch])
    expect(useCitationStore.getState().verificationMismatches).toHaveLength(1)

    // Re-set cache notifies subscribers → refreshDerivedCitationState
    setPredatoryListCache(getBundledPredatoryList())

    expect(useCitationStore.getState().verificationMismatches).toHaveLength(1)
    expect(useCitationStore.getState().verificationMismatches[0]!.id).toBe('m1')
  })

  it('drops mismatches for removed citations on updateCitation path', () => {
    const a: CslItem = {
      id: 'a',
      type: 'article-journal',
      title: 'Keep me',
      DOI: '10.1/a'
    }
    const b: CslItem = {
      id: 'b',
      type: 'article-journal',
      title: 'Remove me',
      DOI: '10.1/b'
    }
    useCitationStore.getState().setCitations([a, b])
    useCitationStore.getState().setVerificationMismatches([
      {
        id: 'ma',
        citationId: 'a',
        field: 'year',
        userValue: '2020',
        canonicalValue: '2021',
        source: 'crossref'
      },
      {
        id: 'mb',
        citationId: 'b',
        field: 'year',
        userValue: '2020',
        canonicalValue: '2021',
        source: 'crossref'
      }
    ])
    useCitationStore.getState().removeCitation('b')
    const left = useCitationStore.getState().verificationMismatches
    expect(left).toHaveLength(1)
    expect(left[0]!.citationId).toBe('a')
  })
})
