import { describe, expect, it } from 'vitest'
import {
  isValidAuditRunId,
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
    model: 'nassila-sanad-e4b'
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
})
