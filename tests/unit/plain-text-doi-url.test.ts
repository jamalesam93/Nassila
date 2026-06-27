import { describe, expect, it } from 'vitest'
import { parsePlainText } from '../../src/engine/parser/plain-text'

describe('plain-text doi.org URL extraction', () => {
  it('populates DOI from https://doi.org/ URL', async () => {
    const line =
      'European Society of Clinical Pharmacy definition. Pharm World Sci. 2022. https://doi.org/10.1007/s11096-022-01422-7'
    const { items } = await parsePlainText(line)
    expect(items).toHaveLength(1)
    expect(items[0]?.URL).toContain('doi.org')
    expect(items[0]?.DOI).toBe('10.1007/s11096-022-01422-7')
  })

  it('populates DOI from doi.org URL with uppercase path segment', async () => {
    const line = 'Pharmacotherapy. 2020. https://doi.org/10.1532/PICO.28.6.816'
    const { items } = await parsePlainText(line)
    expect(items[0]?.DOI).toBe('10.1532/PICO.28.6.816')
  })
})
