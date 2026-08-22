import { describe, expect, it } from 'vitest'
import {
  isValidAuditRunId,
  normalizeBibKeyFilter,
  sanitizeManuscriptAuditStartRequest
} from '../../src/shared/manuscript-audit-contract'

const validRequest = {
  runId: 'audit-run-001',
  rawText: 'Body',
  manuscriptSourceFormat: 'paste',
  referenceSource: 'manuscript',
  libraryCitations: [],
  userActionsByBibKey: {},
  networkStatus: 'online',
  template: { selectedId: 'imrad', strict: false, templates: [] },
  llm: {
    enabled: true,
    presetId: 'lmstudio',
    baseUrl: 'http://localhost:1234',
    model: 'nassila-sanad-9b'
  },
  unpaywallEmail: ''
}

describe('manuscript audit IPC contract', () => {
  it('accepts a bounded valid start request', () => {
    expect(sanitizeManuscriptAuditStartRequest(validRequest)).toEqual(validRequest)
  })

  it('rejects malformed run IDs and citation payloads', () => {
    expect(isValidAuditRunId('../bad')).toBe(false)
    expect(sanitizeManuscriptAuditStartRequest({ ...validRequest, runId: '../bad' })).toBeNull()
    expect(
      sanitizeManuscriptAuditStartRequest({
        ...validRequest,
        libraryCitations: [{ title: 'missing id' }]
      })
    ).toBeNull()
    expect(
      sanitizeManuscriptAuditStartRequest({ ...validRequest, manuscriptSourceFormat: 'html' })
    ).toBeNull()
  })

  it('normalizes the bibKeyFilter to string[] with caps (#19)', () => {
    expect(normalizeBibKeyFilter(undefined)).toBeUndefined()
    expect(normalizeBibKeyFilter('3')).toEqual(['3']) // legacy single-string filter
    expect(normalizeBibKeyFilter(['3', '18'])).toEqual(['3', '18'])
    expect(normalizeBibKeyFilter([])).toBeNull()
    expect(normalizeBibKeyFilter(new Array(51).fill('k'))).toBeNull()
    expect(normalizeBibKeyFilter(['x'.repeat(501)])).toBeNull()
    expect(normalizeBibKeyFilter([42])).toBeNull()
  })

  it('sanitizes targeted re-audit requests and upgrades legacy filters', () => {
    const filtered = sanitizeManuscriptAuditStartRequest({
      ...validRequest,
      bibKeyFilter: ['3', '18']
    })
    expect(filtered?.bibKeyFilter).toEqual(['3', '18'])

    const legacy = sanitizeManuscriptAuditStartRequest({ ...validRequest, bibKeyFilter: '7' })
    expect(legacy?.bibKeyFilter).toEqual(['7'])

    expect(
      sanitizeManuscriptAuditStartRequest({ ...validRequest, bibKeyFilter: [] })
    ).toBeNull()
  })
})
