import { describe, expect, it } from 'vitest'
import {
  MAX_PRIOR_RUNS,
  buildPriorRunSummary,
  buildPriorRunSystemContext,
  mergePriorRuns
} from '../../src/engine/manuscript/prior-runs'
import { buildGroundingLlmMessages } from '../../src/engine/manuscript/grounding-llm'
import type { AuditRunProvenance } from '../../src/engine/manuscript/types'

function run(generatedAt: string, appVersion = '1.4.0'): AuditRunProvenance {
  return { generatedAt, appVersion, promptContractVersion: 'sanad-grounding-v1' }
}

describe('mergePriorRuns', () => {
  it('keeps session runs first and deduplicates by generatedAt + appVersion', () => {
    const session = [run('2026-07-02T00:00:00.000Z'), run('2026-07-01T00:00:00.000Z')]
    const persisted = [run('2026-07-01T00:00:00.000Z'), run('2026-06-30T00:00:00.000Z')]

    const merged = mergePriorRuns(session, persisted)
    expect(merged.map((item) => item.generatedAt)).toEqual([
      '2026-07-02T00:00:00.000Z',
      '2026-07-01T00:00:00.000Z',
      '2026-06-30T00:00:00.000Z'
    ])
  })

  it('preserves bibKeyFilter and treats appVersion as part of the identity', () => {
    const merged = mergePriorRuns(
      [run('2026-07-01T00:00:00.000Z', '1.4.0')],
      [run('2026-07-01T00:00:00.000Z', '1.4.1')]
    )
    expect(merged).toHaveLength(2)

    const withFilter = mergePriorRuns(
      [{ ...run('2026-07-01T00:00:00.000Z'), bibKeyFilter: '1' }],
      []
    )
    expect(withFilter[0]?.bibKeyFilter).toBe('1')
  })

  it('bounds the merged list to 100 runs', () => {
    const many = Array.from({ length: 120 }, (_, index) => run(`2026-07-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`))
    expect(mergePriorRuns(many, many)).toHaveLength(MAX_PRIOR_RUNS)
  })

  it('returns an empty list when nothing is provided', () => {
    expect(mergePriorRuns()).toEqual([])
  })
})

describe('buildPriorRunSummary', () => {
  it('serializes compact JSON without omitted bibKeyFilter keys', () => {
    const summary = buildPriorRunSummary([run('2026-07-01T00:00:00.000Z')])
    const parsed = JSON.parse(summary)
    expect(parsed).toHaveLength(1)
    expect(parsed[0]).toEqual({
      generatedAt: '2026-07-01T00:00:00.000Z',
      appVersion: '1.4.0',
      promptContractVersion: 'sanad-grounding-v1'
    })
    expect(parsed[0].bibKeyFilter).toBeUndefined()

    const withFilter = buildPriorRunSummary([
      { ...run('2026-07-01T00:00:00.000Z'), bibKeyFilter: '1' }
    ])
    expect(JSON.parse(withFilter)[0].bibKeyFilter).toBe('1')
  })

  it('caps the summary length to protect the system prompt', () => {
    const many = Array.from({ length: 100 }, (_, index) => run(`2026-07-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`))
    const summary = buildPriorRunSummary(many)
    expect(summary.length).toBeLessThanOrEqual(4_000)
  })
})

describe('prior runs in the grounding messages', () => {
  it('appends a trusted prior-audit block when prior runs exist', () => {
    const messages = buildGroundingLlmMessages('passage', 'excerpt', { label: 'abstract' }, [
      run('2026-07-01T00:00:00.000Z')
    ])
    expect(messages).toHaveLength(2)
    expect(messages[0].content).toContain('<prior_audit_context>')
    expect(messages[0].content).toContain('2026-07-01T00:00:00.000Z')
    expect(messages[0].content).toContain('never overrides the instructions above')
  })

  it('leaves the system prompt unchanged without prior runs', () => {
    const plain = buildGroundingLlmMessages('passage', 'excerpt', { label: 'abstract' })
    expect(plain[0].content).not.toContain('prior_audit_context')
  })
})

describe('buildPriorRunSystemContext', () => {
  it('wraps the summary in an XML block', () => {
    const context = buildPriorRunSystemContext([run('2026-07-01T00:00:00.000Z')])
    expect(context).toContain('<prior_audit_context>')
    expect(context).toContain('</prior_audit_context>')
    expect(context).toMatch(/^Prior audit context/)
  })
})
