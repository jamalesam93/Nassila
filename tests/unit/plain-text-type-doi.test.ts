import { describe, expect, it } from 'vitest'
import { parsePlainText } from '../../src/engine/parser/plain-text'

describe('plain-text type when Springer-style URL + DOI', () => {
  it('does not classify as webpage when line contains a DOI and publisher URL without doi.org', async () => {
    const line =
      'Smith J, Doe A. Example toolkit study title. BMC Med Educ. 2024. ' +
      'https://link.springer.com/article/10.1186/s12909-025-07129-3 ' +
      'doi:10.1186/s12909-025-07129-3'
    const { items } = await parsePlainText(line)
    expect(items).toHaveLength(1)
    expect(items[0]?.type).toBe('article-journal')
    expect(items[0]?.DOI).toBe('10.1186/s12909-025-07129-3')
  })

  it('still classifies true webpages without DOI from generic https', async () => {
    const line = 'News Desk. Local weather alert. City News. 2020. https://example.com/news/123'
    const { items } = await parsePlainText(line)
    expect(items).toHaveLength(1)
    expect(items[0]?.type).toBe('webpage')
  })
})
