import { describe, expect, it } from 'vitest'
import { resolveDoiFromCandidates } from '../../src/engine/autocorrect/enhance'
import type { CslItem } from '../../src/engine/types'

const row: CslItem = {
  id: 'row-1',
  type: 'article-journal',
  title: 'Importance of incorporating social pharmacy education in Yemeni pharmacy schools curriculum',
  DOI: '10.1186/s40545-021-00300-3'
}

const rightPaper: CslItem = {
  id: 'candidate-right',
  type: 'article-journal',
  title: 'Importance of incorporating social pharmacy education in Yemeni pharmacy schools curriculum',
  DOI: '10.1186/s40545-021-00377-z',
  URL: 'https://doi.org/10.1186/s40545-021-00377-z',
  volume: '14',
  page: '1-9'
}

describe('resolveDoiFromCandidates (Keep my title — find correct DOI)', () => {
  it('swaps the wrong DOI for the candidate that matches the title and fills empty fields', () => {
    const result = resolveDoiFromCandidates(row, [rightPaper])

    expect(result).not.toBeNull()
    expect(result?.item.DOI).toBe('10.1186/s40545-021-00377-z')
    expect(result?.item.volume).toBe('14')
    expect(result?.item.page).toBe('1-9')
    expect(result?.log[0]).toMatchObject({
      citationId: 'row-1',
      field: 'DOI',
      oldValue: '10.1186/s40545-021-00300-3',
      newValue: '10.1186/s40545-021-00377-z',
      rule: 'doi-title-resolve'
    })
  })

  it('short-circuits when the candidate carries the same DOI', () => {
    expect(resolveDoiFromCandidates(row, [{ ...rightPaper, DOI: row.DOI }])).toBeNull()
  })

  it('rejects candidates whose title does not belong to the row (<0.6 similarity)', () => {
    const unrelated: CslItem = {
      id: 'candidate-noise',
      type: 'article-journal',
      title: 'Addressing the medicines access challenge through balance and transparency',
      DOI: '10.9999/noise'
    }
    expect(resolveDoiFromCandidates(row, [unrelated])).toBeNull()
  })

  it('returns null when no candidate carries a DOI', () => {
    expect(
      resolveDoiFromCandidates(row, [{ ...rightPaper, DOI: undefined }])
    ).toBeNull()
  })

  it('picks the first DOI-bearing candidate in confidence order', () => {
    const withoutDoi: CslItem = { ...rightPaper, DOI: undefined }
    const second: CslItem = { ...rightPaper, id: 'candidate-2', DOI: '10.5555/second' }

    const result = resolveDoiFromCandidates(row, [withoutDoi, second])
    expect(result?.item.DOI).toBe('10.5555/second')
  })

  it('falls back to the doi.org URL when the candidate has no URL', () => {
    const result = resolveDoiFromCandidates(
      { ...row, URL: undefined },
      [{ ...rightPaper, URL: undefined }]
    )
    expect(result?.item.URL).toBe('https://doi.org/10.1186/s40545-021-00377-z')
  })
})
