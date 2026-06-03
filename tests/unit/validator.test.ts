import { describe, it, expect } from 'vitest'
import { validateCitations } from '../../src/engine/validator/index'
import type { CslItem } from '../../src/engine/types'

describe('validateCitations', () => {
  it('flags missing title', () => {
    const items: CslItem[] = [{
      id: 'test1',
      type: 'article-journal',
      author: [{ family: 'Smith', given: 'J.' }]
    }]
    const issues = validateCitations(items)
    expect(issues.some((i) => i.field === 'title' && i.severity === 'error')).toBe(true)
  })

  it('flags missing journal name for article', () => {
    const items: CslItem[] = [{
      id: 'test2',
      type: 'article-journal',
      title: 'Test Article',
      author: [{ family: 'Smith', given: 'J.' }]
    }]
    const issues = validateCitations(items)
    expect(issues.some((i) => i.field === 'container-title')).toBe(true)
  })

  it('flags invalid DOI', () => {
    const items: CslItem[] = [{
      id: 'test3',
      type: 'article-journal',
      title: 'Test',
      DOI: 'invalid-doi'
    }]
    const issues = validateCitations(items)
    expect(issues.some((i) => i.field === 'DOI')).toBe(true)
  })

  it('does not apply style-specific rules when no style is selected', () => {
    const items: CslItem[] = [{
      id: 'test-no-style',
      type: 'article-journal',
      title: 'Test Article With A Long Journal Name',
      author: [
        { family: 'A', given: '1.' },
        { family: 'B', given: '2.' },
        { family: 'C', given: '3.' },
        { family: 'D', given: '4.' },
        { family: 'E', given: '5.' },
        { family: 'F', given: '6.' },
        { family: 'G', given: '7.' }
      ],
      'container-title': 'International Journal of Something Very Long Indeed',
      issued: { 'date-parts': [[2024]] }
    }]
    const issues = validateCitations(items)
    expect(issues.some((i) => i.message.includes('Vancouver'))).toBe(false)
    expect(issues.some((i) => i.message.includes('IEEE'))).toBe(false)
  })

  it('applies style-specific rules when a style is selected', () => {
    const items: CslItem[] = [{
      id: 'test-vancouver',
      type: 'article-journal',
      title: 'Test',
      author: Array.from({ length: 7 }, (_, i) => ({
        family: `Author${i}`,
        given: 'X.'
      })),
      'container-title': 'Journal',
      issued: { 'date-parts': [[2024]] }
    }]
    const issues = validateCitations(items, 'vancouver')
    // Full author lists in CSL are correct; citeproc applies 6 + et al. on export.
    expect(issues.some((i) => i.message.includes('Vancouver'))).toBe(false)
  })

  it('applies APA-specific rules', () => {
    const items: CslItem[] = [{
      id: 'test4',
      type: 'article-journal',
      title: 'Test Article',
      author: [{ family: 'Smith', given: 'J.' }],
      'container-title': 'Journal',
      issued: { 'date-parts': [[2024]] }
    }]
    const issues = validateCitations(items, 'apa-7th')
    expect(issues.some((i) => i.field === 'DOI' && i.message.includes('APA'))).toBe(true)
  })
})
