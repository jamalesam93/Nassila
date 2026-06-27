import { describe, expect, it } from 'vitest'
import { findJournalByName } from '../../src/engine/target/journal-database'

describe('journal target search helpers', () => {
  it('bundled DB can return many substring matches that should not block online search', () => {
    expect(findJournalByName('pharmacy').length).toBeGreaterThanOrEqual(5)
    expect(findJournalByName('public health challenges').length).toBe(0)
  })
})
