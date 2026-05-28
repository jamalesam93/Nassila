import { describe, expect, it } from 'vitest'
import { parsePlainText, isJournalArticleUrl } from '../../src/engine/parser/plain-text'

const SAMPLES: { line: string; reason: string }[] = [
  {
    line: 'Drug-induced acute kidney injury: a cohort study on incidence ..., accessed July 1, 2025, https://pubmed.ncbi.nlm.nih.gov/39534223/',
    reason: 'pubmed catalogue'
  },
  {
    line: 'Drug-Induced Acute Kidney Injury - PMC, accessed July 1, 2025, https://pmc.ncbi.nlm.nih.gov/articles/PMC9435983/',
    reason: 'pmc article'
  },
  {
    line: 'Advancing Predictive Healthcare: A Systematic Review of Transformer Models in Electronic Health Records - MDPI, accessed July 1, 2025, https://www.mdpi.com/2073-431X/14/4/148',
    reason: 'mdpi journal'
  },
  {
    line: 'Detection of pediatric drug-induced kidney injury signals ... - Frontiers, accessed July 1, 2025, https://www.frontiersin.org/journals/pharmacology/articles/10.3389/fphar.2022.957980/full',
    reason: 'frontiers'
  },
  {
    line: 'Artificial Intelligence for Chronic Kidney Disease Early Detection and ..., accessed July 1, 2025, https://www.medrxiv.org/content/10.1101/2025.03.26.25324664v1',
    reason: 'medrxiv'
  },
  {
    line: 'Machine learning for prediction of acute kidney injury in patients diagnosed with sepsis in critical care | PLOS One, accessed July 1, 2025, https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0301014',
    reason: 'plos'
  },
  {
    line: 'A systematic review of artificial intelligence algorithms for predicting acute kidney injury, accessed July 1, 2025, https://www.researchgate.net/publication/375381178_A_systematic_review_of_artificial_intelligence_algorithms_for_predicting_acute_kidney_injury',
    reason: 'researchgate publication'
  },
  {
    line: 'Drug-induced nephrotoxicity Drug-induced ... - SciELO Brasil, accessed July 1, 2025, https://www.scielo.br/j/ramb/a/TC7wp7jkjgSjPMZ9ZNnqdMF/',
    reason: 'scielo'
  },
  {
    line: 'Using artificial intelligence to predict mortality in AKI patients ... Oxford Academic, accessed July 1, 2025, https://academic.oup.com/ckj/article/17/6/sfae150/7676197',
    reason: 'oup'
  }
]

describe('plain-text journal host detection', () => {
  for (const { line, reason } of SAMPLES) {
    it(`classifies ${reason} as article-journal`, async () => {
      const { items } = await parsePlainText(line)
      expect(items[0]?.type).toBe('article-journal')
    })
  }

  it('leaves genuine webpages (Mayo Clinic, hospital info) as webpage', async () => {
    const lines = [
      'Acute kidney injury - Symptoms and causes - Mayo Clinic, accessed July 1, 2025, https://www.mayoclinic.org/diseases-conditions/kidney-failure/symptoms-causes/syc-20369048',
      'Drug Induced Kidney Disease: Symptoms, Risk, Diagnosis, Treatment, accessed July 1, 2025, https://www.pacehospital.com/drug-induced-kidney-disease'
    ]
    for (const line of lines) {
      const { items } = await parsePlainText(line)
      expect(items[0]?.type).toBe('webpage')
    }
  })

  it('exports isJournalArticleUrl helper', () => {
    expect(isJournalArticleUrl('https://www.mdpi.com/2073-431X/14/4/148')).toBe(true)
    expect(isJournalArticleUrl('https://www.mayoclinic.org/foo')).toBe(false)
  })
})
