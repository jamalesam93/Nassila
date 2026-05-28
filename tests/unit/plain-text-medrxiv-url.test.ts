import { describe, expect, it } from 'vitest'
import {
  canonicalize1101PreprintDoi,
  extractDoiFromPreprintUrl,
  parsePlainText
} from '../../src/engine/parser/plain-text'

describe('medRxiv URL preserves full path and DOI', () => {
  it('extractDoiFromPreprintUrl reads 10.1101 from content path', () => {
    expect(
      extractDoiFromPreprintUrl(
        'https://www.medrxiv.org/content/10.1101/2025.03.26.25324664v1'
      )
    ).toBe('10.1101/2025.03.26.25324664v1')
    expect(
      extractDoiFromPreprintUrl(
        'https://www.biorxiv.org/content/10.1101/2024.01.01.123456v2'
      )
    ).toBe('10.1101/2024.01.01.123456v2')
  })

  it('canonicalize1101PreprintDoi strips trailing version suffix for Crossref', () => {
    expect(canonicalize1101PreprintDoi('10.1101/2025.03.26.25324664v1')).toBe(
      '10.1101/2025.03.26.25324664'
    )
  })

  it('parsePlainText keeps full medRxiv URL and sets DOI + container', async () => {
    const line =
      'Artificial Intelligence for Chronic Kidney Disease Early Detection and ..., accessed July 1, 2025, https://www.medrxiv.org/content/10.1101/2025.03.26.25324664v1'
    const { items } = await parsePlainText(line)
    const item = items[0]
    expect(item?.URL).toBe(
      'https://www.medrxiv.org/content/10.1101/2025.03.26.25324664v1'
    )
    expect(item?.DOI).toBe('10.1101/2025.03.26.25324664')
    expect(item?.['container-title']).toBe('medRxiv')
    expect(item?.type).toBe('article-journal')
  })

  it('prefers medRxiv URL when another http link appears first', async () => {
    const line =
      'Paper, see https://example.com/related https://www.medrxiv.org/content/10.1101/2024.01.01.999999v1'
    const { items } = await parsePlainText(line)
    expect(items[0]?.URL).toContain('medrxiv.org')
    expect(items[0]?.DOI).toBe('10.1101/2024.01.01.999999')
  })
})
