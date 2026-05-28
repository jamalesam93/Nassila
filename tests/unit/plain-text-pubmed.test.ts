import { describe, expect, it } from 'vitest'
import { parsePlainText } from '../../src/engine/parser/plain-text'

const PUBMED_LINE =
  'Drug-induced acute kidney injury: a cohort study on incidence, identification of pathophysiological mechanisms, and prognostic factors. Front Med (Lausanne). 2024. https://pubmed.ncbi.nlm.nih.gov/39534223/'

const PUBMED_WITH_AUTHORS =
  'Garcia G, Pacchini VR, Zamoner W, Balbi AL, Ponce D. Drug-induced acute kidney injury: a cohort study on incidence, identification of pathophysiological mechanisms, and prognostic factors. Front Med (Lausanne). 2024. https://pubmed.ncbi.nlm.nih.gov/39534223/'

describe('plain-text PubMed URLs', () => {
  it('classifies PubMed catalogue URLs as article-journal, not webpage', async () => {
    const { items } = await parsePlainText(PUBMED_LINE)
    expect(items).toHaveLength(1)
    expect(items[0]?.type).toBe('article-journal')
    expect(items[0]?.PMID).toBe('39534223')
  })

  it('does not treat a title-only first segment as authors', async () => {
    const { items } = await parsePlainText(PUBMED_LINE)
    expect(items[0]?.author ?? []).toHaveLength(0)
    expect(items[0]?.title).toMatch(/Drug-induced acute kidney injury/i)
    expect(items[0]?.['container-title']).toMatch(/Front Med/i)
  })

  it('still parses explicit author blocks before the title', async () => {
    const { items } = await parsePlainText(PUBMED_WITH_AUTHORS)
    expect(items[0]?.type).toBe('article-journal')
    expect(items[0]?.author?.length).toBe(5)
    expect(items[0]?.title).toMatch(/Drug-induced acute kidney injury/i)
  })
})
