import { describe, expect, it } from 'vitest'
import { networkStatusAfterProbe } from '../../src/shared/network-status'

describe('networkStatusAfterProbe', () => {
  it('returns online immediately after a successful probe', () => {
    expect(networkStatusAfterProbe(true, 2)).toEqual({ status: 'online', consecutiveFailures: 0 })
  })

  it('stays online until failure threshold is reached', () => {
    expect(networkStatusAfterProbe(false, 0).status).toBe('online')
    expect(networkStatusAfterProbe(false, 1).status).toBe('online')
    expect(networkStatusAfterProbe(false, 2)).toEqual({ status: 'offline', consecutiveFailures: 3 })
  })
})
