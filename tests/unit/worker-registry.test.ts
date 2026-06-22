import { describe, expect, it } from 'vitest'
import { WORKER_IDS, WORKER_REGISTRY, getWorkerMeta, isWorkerId } from '../../src/renderer/workers/worker-registry'

describe('worker-registry', () => {
  it('has seven unique worker ids', () => {
    expect(WORKER_IDS).toHaveLength(7)
    expect(new Set(WORKER_IDS).size).toBe(7)
  })

  it('registry matches worker ids', () => {
    const registryIds = WORKER_REGISTRY.map((w) => w.id)
    expect(registryIds).toEqual([...WORKER_IDS])
  })

  it('each worker has i18n name keys', () => {
    for (const worker of WORKER_REGISTRY) {
      expect(worker.nameKey).toMatch(/^workers\.[a-z]+\.name$/)
      expect(worker.taglineKey).toMatch(/^workers\.[a-z]+\.tagline$/)
      expect(getWorkerMeta(worker.id).id).toBe(worker.id)
    }
  })

  it('isWorkerId narrows valid ids', () => {
    expect(isWorkerId('raqim')).toBe(true)
    expect(isWorkerId('unknown')).toBe(false)
  })
})
