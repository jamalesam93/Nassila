import { describe, expect, it } from 'vitest'
import { buildPassageWindow } from '../../src/engine/manuscript/passage-window'

describe('buildPassageWindow', () => {
  it('returns the whole short paragraph with exact offsets', () => {
    const text = 'A short claim is supported (Lee, 2024).'
    expect(buildPassageWindow(text, text.indexOf('('), text.length - 1)).toEqual({
      text,
      start: 0,
      end: text.length
    })
  })

  it('includes the cite sentence and adjacent sentence context', () => {
    const text = 'Context before. The main claim is supported (Lee, 2024). Context after. Unrelated tail.'
    const start = text.indexOf('(Lee')
    const window = buildPassageWindow(text, start, start + '(Lee, 2024)'.length)

    expect(window.text).toBe('Context before. The main claim is supported (Lee, 2024). Context after.')
    expect(text.slice(window.start, window.end)).toBe(window.text)
  })

  it('does not cut words when a long paragraph reaches the cap', () => {
    const left = `Opening sentence. ${'leftword '.repeat(120)}`
    const cite = 'The cited result holds (Lee, 2024).'
    const right = ` ${'rightword '.repeat(120)} Closing sentence.`
    const text = left + cite + right
    const start = text.indexOf('(Lee')
    const window = buildPassageWindow(text, start, start + '(Lee, 2024)'.length, 180)

    expect(window.text.length).toBeLessThanOrEqual(180)
    expect(text.slice(window.start, window.end)).toBe(window.text)
    expect(window.start === 0 || /\s/u.test(text[window.start - 1])).toBe(true)
    expect(window.end === text.length || /\s/u.test(text[window.end])).toBe(true)
    expect(window.text).toContain('(Lee, 2024)')
  })

  it('keeps multiple citations in the same cite sentence', () => {
    const text = 'Prior context. Combined evidence supports the claim (Lee, 2024; Khan, 2025). Later context.'
    const start = text.indexOf('Khan')
    const window = buildPassageWindow(text, start, start + 'Khan, 2025'.length)

    expect(window.text).toBe(text)
    expect(window.text).toContain('Lee, 2024; Khan, 2025')
  })

  it('handles empty and reversed spans at document edges', () => {
    const text = 'First sentence. Second sentence.'

    expect(buildPassageWindow(text, 0, 0)).toEqual({ text, start: 0, end: text.length })
    expect(buildPassageWindow(text, 999, -10)).toEqual({ text, start: 0, end: text.length })
    expect(buildPassageWindow('', 0, 0)).toEqual({ text: '', start: 0, end: 0 })
  })

  it('does not cross paragraph boundaries', () => {
    const text = 'Separate paragraph.\n\nLead sentence. Cited sentence (Lee, 2024). Final sentence.\n\nLast paragraph.'
    const start = text.indexOf('(Lee')
    const window = buildPassageWindow(text, start, start + '(Lee, 2024)'.length)

    expect(window.text).toBe('Lead sentence. Cited sentence (Lee, 2024). Final sentence.')
  })
})
