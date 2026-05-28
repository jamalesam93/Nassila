import { describe, expect, it } from 'vitest'
import type { PredatoryList } from '../../src/shared/predatory'
import {
  buildPredatoryListFromMirrorCsv,
  assertValidDownloadedList
} from '../../src/engine/predatory/sources/mirror'
import { shouldThrottlePredatoryNetworkCheck } from '../../src/engine/predatory/throttle'

describe('predatory list update / mirror', () => {
  it('builds list from CSV bodies', () => {
    const j = 'url,name,abbr\nhttp://a,Journal One,O1\nhttp://b,Journal Two,'
    const p = 'url,name,abbr,\nhttp://c,Publisher One,,'
    const built = buildPredatoryListFromMirrorCsv(j, p, '2026-02-01T00:00:00Z')
    expect(built.journals.map((x) => x.name)).toEqual(['Journal One', 'Journal Two'])
    expect(built.publishers.map((x) => x.name)).toEqual(['Publisher One'])
    expect(built.journals[0]!.aliases).toEqual(['O1'])
  })

  it('validate rejects small journal lists', () => {
    const tiny: PredatoryList = {
      version: 'x',
      sourceUrl: 'x',
      updatedAt: 'x',
      journals: Array.from({ length: 50 }, (_, i) => ({ name: `J${i}` })),
      publishers: []
    }
    expect(() => assertValidDownloadedList(tiny)).toThrow(/too few/)
  })

  it('throttles network check within 24h', () => {
    const now = Date.parse('2026-03-10T12:00:00.000Z')
    expect(shouldThrottlePredatoryNetworkCheck('2026-03-10T11:00:00.000Z', now)).toBe(true)
    expect(shouldThrottlePredatoryNetworkCheck('2026-03-09T11:00:00.000Z', now)).toBe(false)
    expect(shouldThrottlePredatoryNetworkCheck(null, now)).toBe(false)
  })
})
