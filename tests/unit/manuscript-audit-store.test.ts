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
        checklist: [],
        sources: [],
        appVersion: 'test',
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
})
