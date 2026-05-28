import { describe, it, expect } from 'vitest'
import { autocorrect, normalizePageRange, toTitleCase, toSentenceCase } from '../../src/engine/autocorrect/index'
import { validateCitations } from '../../src/engine/validator/index'
import type { CslItem } from '../../src/engine/types'

describe('autocorrect', () => {
  it('normalizes DOI format', () => {
    const items: CslItem[] = [{
      id: 'test1',
      type: 'article-journal',
      title: 'Test',
      DOI: 'https://doi.org/10.1234/test'
    }]
    const issues = validateCitations(items)
    const { corrected, log } = autocorrect(items, issues)
    expect(corrected[0].DOI).toBe('10.1234/test')
    expect(log.length).toBeGreaterThan(0)
  })

  it('normalizes page ranges', () => {
    expect(normalizePageRange('112\u2013128')).toBe('112-128')
    expect(normalizePageRange('112 - 128')).toBe('112-128')
  })

  it('converts to title case', () => {
    expect(toTitleCase('the quick brown fox')).toBe('The Quick Brown Fox')
    expect(toTitleCase('a study of the effects')).toBe('A Study of the Effects')
  })

  it('converts to sentence case', () => {
    expect(toSentenceCase('THE QUICK BROWN FOX')).toBe('The quick brown fox')
    expect(toSentenceCase('A study of DNA replication')).toBe('A study of DNA replication')
    expect(toSentenceCase('The Quick Brown Fox')).toBe('The Quick Brown Fox')
  })

  it('adds container-title-short for IEEE when journal is in database', () => {
    const items: CslItem[] = [{
      id: 'ieee-journal',
      type: 'article-journal',
      title: 'Test Article',
      'container-title': 'New England Journal of Medicine'
    }]
    const issues = validateCitations(items, 'ieee')
    const abbrevIssue = issues.find((i) => i.message.includes('abbreviated journal names'))
    expect(abbrevIssue?.autoFixable).toBe(true)

    const { corrected, log } = autocorrect(items, issues, 'ieee')
    expect(corrected[0]['container-title-short']).toBe('N. Engl. J. Med.')
    expect(log.some((e) => e.rule === 'ieee-journal-abbreviation')).toBe(true)

    const postIssues = validateCitations(corrected, 'ieee')
    expect(postIssues.some((i) => i.message.includes('abbreviated journal names'))).toBe(false)
  })

  it('uses publisher when container-title was misparsed as article title', () => {
    const items: CslItem[] = [{
      id: 'misplaced-journal',
      type: 'article-journal',
      title: 'An insight into the pharmaceutical sector in Yemen during conflict: challenges and recommendations',
      'container-title': 'An insight into the pharmaceutical sector in Yemen during conflict: challenges and recommendations',
      publisher: 'Med Confl Surviv',
      ISSN: '1362-3699'
    }]
    const issues = validateCitations(items, 'ieee')
    const { corrected } = autocorrect(items, issues, 'ieee')
    expect(corrected[0]['container-title-short']).toBe('Med. Confl. Surviv.')
    expect(validateCitations(corrected, 'ieee').some((i) => i.message.includes('abbreviated journal names'))).toBe(false)
  })

  it('resolves IEEE abbrev from short journal string or ISSN', async () => {
    const items: CslItem[] = [{
      id: 'short-journal',
      type: 'article-journal',
      title: 'Test',
      'container-title': 'Int J Clin Pharm',
      ISSN: '2210-7706'
    }]
    const issues = validateCitations(items, 'ieee')
    const { corrected } = autocorrect(items, issues, 'ieee')
    expect(corrected[0]['container-title-short']).toBe('Int. J. Clin. Pharm.')
  })
})
