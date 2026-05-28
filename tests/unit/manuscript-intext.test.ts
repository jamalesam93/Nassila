import { describe, expect, it } from 'vitest'
import { parseInTextCitations } from '../../src/engine/manuscript/intext'

describe('parseInTextCitations', () => {
  it('parses numeric bracket citations with ranges and groups', () => {
    const text = 'Foo [1-3, 7] bar.'
    const res = parseInTextCitations(text)
    expect(res.warnings).toEqual([])
    expect(res.citations.length).toBeGreaterThan(0)
    const first = res.citations[0]
    expect(first.kind).toBe('numeric')
    expect(first.numbers).toEqual([1, 2, 3, 7])
  })

  it('parses numeric parenthetical citations with ranges and groups', () => {
    const text = 'Reported by GLOBOCAN (1–3). Also see (4) and (6,7).'
    const res = parseInTextCitations(text)
    const nums = res.citations.filter((c) => c.kind === 'numeric')
    expect(nums.length).toBeGreaterThan(0)
    expect(nums.some((c) => c.numbers?.join(',') === '1,2,3')).toBe(true)
    expect(nums.some((c) => c.numbers?.join(',') === '4')).toBe(true)
    expect(nums.some((c) => c.numbers?.join(',') === '6,7')).toBe(true)
  })

  it('parses author-year parenthetical citations', () => {
    const text = 'AMR is rising (Smith, 2020a, p. 12).'
    const res = parseInTextCitations(text)
    const ay = res.citations.find((c) => c.kind === 'author-year')
    expect(ay).toBeTruthy()
    expect(ay?.year).toBe(2020)
    expect(ay?.yearSuffix).toBe('a')
    expect(ay?.authorFamilyNames?.[0]).toBe('smith')
  })
})

