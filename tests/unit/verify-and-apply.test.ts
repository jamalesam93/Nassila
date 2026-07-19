import { describe, expect, it } from 'vitest'
import { prioritizeVerifiableCitations } from '../../src/engine/verifier/verify-and-apply'
import type { CslItem } from '../../src/engine/types'

function row(partial: Partial<CslItem> & { id: string }): CslItem {
  return {
    type: 'article-journal',
    id: partial.id,
    title: partial.title ?? '',
    ...partial
  }
}

describe('prioritizeVerifiableCitations', () => {
  it('puts unusual issued years with identifiers ahead of mundane rows', () => {
    const cy = 2026
    const mundaneYear = cy - 1

    const normal = Array.from({ length: 26 }, (_, i) =>
      row({
        id: `n-${i}`,
        DOI: `10.test/n-${i}`,
        issued: { 'date-parts': [[mundaneYear]] }
      })
    )
    const outlierIndex = normal.length // after 26 normals in original naive order we'd miss this
    const outlier = row({
      id: 'bad-year',
      DOI: '10.3390/outlier',
      issued: { 'date-parts': [[1200]] }
    })

    const list = [...normal, outlier]
    const prioritized = prioritizeVerifiableCitations(list, cy).slice(0, 200)
    expect(prioritized.some((c) => c.id === 'bad-year')).toBe(true)
    expect(prioritized[0]?.id).toBe('bad-year')
    expect(outlierIndex).toBeGreaterThan(24)
  })

  it('drops rows without a registry identifier even if year is odd', () => {
    const a = row({ id: 'a', issued: { 'date-parts': [[3000]] } })
    const b = row({ id: 'b', DOI: '10.x/b', issued: { 'date-parts': [[3000]] } })
    expect(prioritizeVerifiableCitations([a, b])).toEqual([b])
  })

  it('includes PMCID-only rows in unified L1 verification priority', () => {
    const pmc = row({ id: 'pmc', PMCID: 'PMC12919426' })
    const unkeyed = row({ id: 'unkeyed' })
    expect(prioritizeVerifiableCitations([unkeyed, pmc])).toEqual([pmc])
  })
})
