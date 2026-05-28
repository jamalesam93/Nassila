import { describe, it, expect } from 'vitest'
import { detectFormat, parseInput } from '../../src/engine/parser/index'
import { parseRis } from '../../src/engine/parser/ris'

describe('detectFormat', () => {
  it('detects BibTeX', () => {
    expect(detectFormat('@article{smith2024, author={Smith}, title={Test}}')).toBe('bibtex')
  })

  it('detects RIS', () => {
    expect(detectFormat('TY  - JOUR\nAU  - Smith\nTI  - Test\nER  -')).toBe('ris')
  })

  it('detects RIS with single space after tag (common exports)', () => {
    expect(detectFormat('TY - JOUR\nAU - Smith\nTI - Test\nER -')).toBe('ris')
  })

  it('detects CSL-JSON array', () => {
    expect(detectFormat('[{"id":"test","type":"article-journal"}]')).toBe('csl-json')
  })

  it('detects CSL-JSON object', () => {
    expect(detectFormat('{"id":"test","type":"article-journal"}')).toBe('csl-json')
  })

  it('defaults to plain-text', () => {
    expect(detectFormat('Smith, J. (2024). A Study. Journal, 45(2), 112-128.')).toBe('plain-text')
  })
})

describe('parseInput', () => {
  it('parses CSL-JSON', async () => {
    const result = await parseInput(JSON.stringify([{
      id: 'test1',
      type: 'article-journal',
      title: 'Test Article',
      author: [{ family: 'Smith', given: 'John' }]
    }]))
    expect(result.format).toBe('csl-json')
    expect(result.items).toHaveLength(1)
    expect(result.items[0].title).toBe('Test Article')
  })

  it('parses plain text citations', async () => {
    const result = await parseInput(
      'Smith, J. A Study of AI. Journal of Computer Science, 45(2), 112-128.'
    )
    expect(result.format).toBe('plain-text')
    expect(result.items.length).toBeGreaterThanOrEqual(1)
    if (result.items[0]) {
      expect(result.items[0].author).toBeDefined()
    }
  })

  it('parses RIS with standard tag spacing via @ris/file', async () => {
    const raw = 'TY  - JOUR\nTI  - Hello\nER  - \n'
    const result = await parseRis(raw)
    expect(result.errors).toHaveLength(0)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].title).toBe('Hello')
  })

  it('parses RIS with single space after tags (normalized for citation-js)', async () => {
    const raw = 'TY - JOUR\nTI - Hello\nER - \n'
    const result = await parseRis(raw)
    expect(result.errors).toHaveLength(0)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].title).toBe('Hello')
  })

  it('prefers CSL-JSON content over a .ris extension hint', async () => {
    const raw = JSON.stringify([
      { id: 'misnamed', type: 'article-journal', title: 'From JSON with .ris name' }
    ])
    const result = await parseInput(raw, 'ris')
    expect(result.format).toBe('csl-json')
    expect(result.items).toHaveLength(1)
    expect(result.items[0].title).toBe('From JSON with .ris name')
  })
})
