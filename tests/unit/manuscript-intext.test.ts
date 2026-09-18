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

  it('rejects objectives-list markers (1) and (2) while keeping Vancouver cites', () => {
    const text =
      'The objectives of this review are to: (1) provide a comprehensive overview of education in both countries; ' +
      '(2) conduct a detailed comparative analysis of educational systems; (3) identify challenges; and (4) propose recommendations. ' +
      'Clinical pharmacy is defined as rational use (5).'
    const res = parseInTextCitations(text)
    const nums = res.citations.filter((c) => c.kind === 'numeric')
    expect(nums.some((c) => ['(1)', '(2)', '(3)', '(4)'].includes(c.raw))).toBe(false)
    expect(nums.some((c) => c.raw === '(5)' && c.numbers?.join(',') === '5')).toBe(true)
  })

  it('keeps end-of-claim parenthetical cites after narrative text', () => {
    const text = 'Clinical pharmacists improve outcomes (4). Stewardship programs help too (6,7).'
    const res = parseInTextCitations(text)
    const nums = res.citations.filter((c) => c.kind === 'numeric')
    expect(nums.map((c) => c.numbers?.join(','))).toEqual(['4', '6,7'])
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

  it('parses Arabic-Indic numeric brackets as ASCII numbers', () => {
    const res = parseInTextCitations('أظهرت الدراسات [١] و[٢-٣] ذلك.')
    const nums = res.citations.filter((c) => c.kind === 'numeric')
    expect(nums.map((c) => c.numbers?.join(','))).toEqual(['1', '2,3'])
  })

  it('parses Arabic parenthetical author-year with Arabic comma and وآخرون', () => {
    const res = parseInTextCitations('أكدت الدراسات (الكتاب وآخرون، 2020) ذلك.')
    const ay = res.citations.find((c) => c.kind === 'author-year')
    expect(ay?.year).toBe(2020)
    expect(ay?.authorFamilyNames?.[0]).toBe('الكتاب')
  })

  it('parses Arabic narrative author-year', () => {
    const res = parseInTextCitations('ويرى الكتاب (2019) أن الترصد ضروري.')
    const ay = res.citations.find((c) => c.kind === 'author-year')
    expect(ay?.year).toBe(2019)
    expect(ay?.authorFamilyNames?.[0]).toBe('الكتاب')
    expect(res.citations.some((c) => c.kind === 'numeric' && c.numbers?.includes(2019))).toBe(false)
  })

  it('rejects Arabic objectives-list markers while keeping a Vancouver cite', () => {
    const text =
      'تهدف هذه المراجعة إلى: (1) تقديم نظرة عامة؛ (2) مقارنة النظم. انظر أيضاً الدراسات السابقة [3].'
    const res = parseInTextCitations(text)
    const nums = res.citations.filter((c) => c.kind === 'numeric')
    expect(nums.some((c) => c.raw === '(1)' || c.raw === '(2)')).toBe(false)
    expect(nums.some((c) => c.raw === '[3]' && c.numbers?.join(',') === '3')).toBe(true)
  })
})
