import { describe, it, expect } from 'vitest'
import { useManuscriptAuditStore } from '../../src/renderer/stores/manuscript-audit-store'

describe('manuscript-audit-store incremental audit', () => {
  it('beginIncrementalAudit seeds empty findings and progress', () => {
    useManuscriptAuditStore.getState().clear()
    useManuscriptAuditStore.getState().beginIncrementalAudit({
      total: 3,
      shell: {
        manuscript: { wordCount: 100, sourceFormat: 'paste' },
        template: { id: 'imrad', name: 'IMRAD', strict: false },
        grounding: { enabled: true, modelId: 'test', checkpoint: 'test', runner: 'test' },
        citationMapping: { matched: 0, ambiguous: 0, unmatched: 0 },
        checklist: [],
        sources: [],
        appVersion: 'test',
        promptContractVersion: 'test',
        networkStatus: 'online'
      }
    })

    const state = useManuscriptAuditStore.getState()
    expect(state.auditProgress).toEqual({ processed: 0, total: 3 })
    expect(state.report?.findings).toEqual([])
  })

  it('appendFinding increments processed count', () => {
    useManuscriptAuditStore.getState().appendFinding({
      bibKey: 'ref1',
      inTextSpans: [],
      referenceIntegrityRisk: 'locator_ok',
      layers: {
        registry: { status: 'pass' },
        metadata: { status: 'skipped', reason: 'not_applicable' },
        passage: { status: 'skipped', reason: 'not_applicable' }
      },
      l3Coverage: 'unavailable',
      evidence: [],
      greyTags: [],
      userAction: { kind: 'none' }
    })

    const state = useManuscriptAuditStore.getState()
    expect(state.auditProgress?.processed).toBe(1)
    expect(state.report?.findings).toHaveLength(1)
  })

  it('replaces one filtered finding in place and retains prior-run provenance', () => {
    const store = useManuscriptAuditStore.getState()
    const original = {
      bibKey: 'ref1',
      inTextSpans: [],
      referenceIntegrityRisk: 'locator_ok' as const,
      layers: {
        registry: { status: 'pass' as const },
        metadata: { status: 'pass' as const },
        passage: { status: 'warn' as const, reasons: ['Old result'] }
      },
      l3Coverage: 'abstract_only_closed' as const,
      evidence: [],
      greyTags: [],
      userAction: { kind: 'none' as const }
    }
    store.setReport({
      manuscript: { wordCount: 100, sourceFormat: 'paste' },
      template: { id: 'imrad', name: 'IMRAD', strict: false },
      grounding: { enabled: false, modelId: 'test', checkpoint: 'test', runner: 'test' },
      citationMapping: { matched: 1, ambiguous: 0, unmatched: 0 },
      findings: [original],
      checklist: [],
      sources: [],
      generatedAt: '2026-07-18T00:00:00.000Z',
      appVersion: '1.2.4',
      promptContractVersion: 'v1',
      networkStatus: 'offline'
    })
    store.consumeAuditProgress({
      runId: 'filtered-run',
      kind: 'started',
      total: 1,
      bibKeyFilter: 'ref1',
      shell: {
        manuscript: { wordCount: 100, sourceFormat: 'paste' },
        template: { id: 'imrad', name: 'IMRAD', strict: false },
        grounding: { enabled: false, modelId: 'test', checkpoint: 'test', runner: 'test' },
        citationMapping: { matched: 1, ambiguous: 0, unmatched: 0 },
        checklist: [],
        sources: [],
        appVersion: '1.2.5',
        promptContractVersion: 'v1',
        networkStatus: 'offline',
        priorRuns: [{
          generatedAt: '2026-07-18T00:00:00.000Z',
          appVersion: '1.2.4',
          promptContractVersion: 'v1',
          bibKeyFilter: 'ref1'
        }]
      }
    })
    const updated = {
      ...original,
      l3Coverage: 'full_text_attached_pdf' as const,
      layers: {
        ...original.layers,
        passage: { status: 'pass' as const }
      }
    }
    store.consumeAuditProgress({
      runId: 'filtered-run',
      kind: 'completed',
      bibKeyFilter: 'ref1',
      report: {
        ...useManuscriptAuditStore.getState().report!,
        findings: [updated],
        generatedAt: '2026-07-18T01:00:00.000Z',
        appVersion: '1.2.5',
        priorRuns: [{
          generatedAt: '2026-07-18T00:00:00.000Z',
          appVersion: '1.2.4',
          promptContractVersion: 'v1',
          bibKeyFilter: 'ref1'
        }]
      }
    })

    const report = useManuscriptAuditStore.getState().report
    expect(report?.findings).toEqual([updated])
    expect(report?.priorRuns).toHaveLength(1)
  })
})
