import { describe, expect, it } from 'vitest'
import fixtures from '../fixtures/raqim-operator-regressions.json'
import {
  extractArxivIdentity,
  parsePlainText
} from '../../src/engine/parser/plain-text'
import { extractDoiFromOxfordAcademicUrl } from '../../src/engine/resolver/url'
import { validateCitations } from '../../src/engine/validator'
import type { CslItem } from '../../src/engine/types'

type OperatorFixture = (typeof fixtures.cases)[number]

function fixture(id: string): OperatorFixture {
  const found = fixtures.cases.find((entry) => entry.id === id)
  if (!found) throw new Error(`Missing operator fixture: ${id}`)
  return found
}

describe('Raqim operator regression fixtures', () => {
  it('records every operator-map case offline', () => {
    expect(fixtures.cases.map((entry) => entry.id)).toEqual(expect.arrayContaining([
      'oup-jamia-article-abstract',
      'pmcid-l1-pmc12919426',
      'arxiv-2507-19530',
      'delong-pmid-3203132',
      'qlora-neurips-baseline',
      'gemma-report-no-registry-hit',
      'dwork-lncs-chapter',
      'kaggle-dataset-manual',
      'nature-npj-wrong-title'
    ]))
  })

  it('extracts OUP article-abstract DOI', () => {
    const entry = fixture('oup-jamia-article-abstract')
    expect(extractDoiFromOxfordAcademicUrl(entry.input.URL!)).toBe(entry.mock?.doi)
  })

  it('preserves arXiv preprint identity and version', async () => {
    const entry = fixture('arxiv-2507-19530')
    expect(extractArxivIdentity(entry.input.URL!)).toEqual({
      DOI: entry.expected.DOI,
      version: entry.expected.version
    })

    const { items } = await parsePlainText(`${entry.input.title}. ${entry.input.URL}`)
    expect(items[0]).toMatchObject({
      type: 'article',
      DOI: entry.expected.DOI,
      version: entry.expected.version,
      genre: 'Preprint'
    })
  })

  it('keeps DeLong initials and et al. in the author block', async () => {
    const entry = fixture('delong-pmid-3203132')
    const { items } = await parsePlainText(entry.input.raw!)
    expect(items[0]?.title).not.toBe(entry.expected.titleNot)
    expect(items[0]?.title).toMatch(/^Comparing the areas/i)
    expect(items[0]?.author?.[0]?.family).toBe(entry.expected.firstAuthorFamily)
    expect(items[0]?.PMID).toBe(entry.expected.PMID)
  })

  it('classifies Springer chapter URLs as chapters', async () => {
    const entry = fixture('dwork-lncs-chapter')
    const { items } = await parsePlainText(`${entry.input.title}. ${entry.input.URL}`)
    expect(items[0]?.type).toBe('chapter')
  })

  it('does not classify a journal review as software from its title alone', async () => {
    const entry = fixture('oup-jamia-article-abstract')
    const { items } = await parsePlainText(
      `Smith J. ${entry.input.title}. Journal of the American Medical Informatics Association. 2024;31(7):1600-1610.`
    )
    expect(items[0]?.type).toBe('article-journal')
  })

  it('does not apply journal-only APA volume warnings to preprints, chapters, or reports', () => {
    const rows: CslItem[] = [
      {
        id: 'preprint',
        type: 'article-journal',
        title: 'Preprint',
        author: [{ family: 'Smith', given: 'J' }],
        'container-title': 'Research Square',
        genre: 'Preprint'
      },
      {
        id: 'chapter',
        type: 'chapter',
        title: 'Chapter',
        author: [{ family: 'Dwork', given: 'C' }],
        'container-title': 'Theory of Cryptography',
        publisher: 'Springer'
      },
      {
        id: 'report',
        type: 'report',
        title: 'Technical report',
        author: [{ literal: 'Google DeepMind', family: '' }],
        publisher: 'Google DeepMind'
      }
    ]
    const issues = validateCitations(rows, 'apa-7th')
    expect(issues.filter((issue) => issue.message.includes('missing volume'))).toEqual([])
  })
})
