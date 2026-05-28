import { describe, expect, it } from 'vitest'
import {
  getJournalGuidelines,
  searchJournals,
  searchStyles
} from '../../src/engine/target'

describe('target helpers', () => {
  it('searches bundled styles by id or name', async () => {
    const results = await searchStyles('apa')
    expect(results.some((style) => style.id === 'apa-7th')).toBe(true)
  })

  it('searches local journal mappings', async () => {
    const results = await searchJournals('Nature')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]?.journalName).toContain('Nature')
  })

  it('returns local guideline metadata when a journal is known', async () => {
    const guidelines = await getJournalGuidelines('Nature')
    expect(guidelines).not.toBeNull()
    expect(guidelines?.referenceStyle).toBe('nature')
    expect(guidelines?.additionalNotes?.some((note) => note.includes('Publisher:'))).toBe(true)
  })

  it('maps New England Journal of Medicine to Vancouver as its typical style', async () => {
    const guidelines = await getJournalGuidelines('New England Journal of Medicine')
    expect(guidelines?.referenceStyle).toBe('vancouver')
  })

  it('finds NEJM by abbreviation', async () => {
    const results = await searchJournals('N. Engl. J. Med.')
    expect(results.some((r) => r.journalName === 'New England Journal of Medicine')).toBe(true)
    expect(results.find((r) => r.journalName === 'New England Journal of Medicine')?.styleId).toBe('vancouver')
  })
})
