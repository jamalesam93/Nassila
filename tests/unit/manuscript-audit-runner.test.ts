import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_AUDIT_CONCURRENCY,
  retryTransient,
  runManuscriptAudit,
  type ManuscriptAuditServices
} from '../../src/engine/manuscript/audit-runner'
import type {
  ManuscriptAuditProgressEvent,
  ManuscriptAuditStartRequest
} from '../../src/shared/manuscript-audit-contract'

function request(runId: string): ManuscriptAuditStartRequest {
  return {
    runId,
    rawText: [
      'Introduction',
      'Alpha evidence is discussed (Smith, 2020). Beta evidence follows (Jones, 2021).'
    ].join('\n\n'),
    manuscriptSourceFormat: 'docx',
    referenceSource: 'bibliography',
    libraryCitations: [
      {
        id: 'alpha',
        type: 'article-journal',
        title: 'Alpha evidence',
        author: [{ family: 'Smith', given: 'A' }],
        issued: { 'date-parts': [[2020]] },
        abstract: 'Alpha evidence is discussed in this source.',
        _original: 'Smith A. (2020). Alpha evidence.'
      },
      {
        id: 'beta',
        type: 'article-journal',
        title: 'Beta evidence',
        author: [{ family: 'Jones', given: 'B' }],
        issued: { 'date-parts': [[2021]] },
        abstract: 'Beta evidence follows in this source.',
        _original: 'Jones B. (2021). Beta evidence.'
      }
    ],
    userActionsByBibKey: {},
    networkStatus: 'online',
    template: { selectedId: 'none', strict: false, templates: [] },
    llm: {
      enabled: false,
      presetId: 'lmstudio',
      baseUrl: 'http://localhost:1234',
      model: 'test'
    },
    unpaywallEmail: ''
  }
}

function services(): ManuscriptAuditServices {
  return {
    appVersion: '1.2.3',
    resolveRegistry: vi.fn(async (item) => {
      await new Promise((resolve) => setTimeout(resolve, item.title?.startsWith('Alpha') ? 15 : 1))
      return { source: 'openalex', canonical: item, l1: { status: 'pass' } }
    }),
    alignMetadata: vi.fn(async () => ({ l2: { status: 'pass' }, mismatchedFields: [] })),
    europePmcJats: vi.fn(async () => {
      throw new Error('not used')
    }),
    unpaywall: vi.fn(async () => {
      throw new Error('not used')
    }),
    fetchOaUrl: vi.fn(async () => ({ kind: 'unknown', blocked: true })),
    encryptionAvailable: () => true,
    llmChat: vi.fn(async () => {
      throw new Error('LLM must remain disabled')
    }),
    loadSourceArtifact: vi.fn(async (artifact) => ({
      status: 'ready' as const,
      artifact,
      text: 'Attached full text.'
    }))
  }
}

describe('manuscript audit runner', () => {
  it('keeps the VRAM-safe scheduler defaults and bounds transient retries', async () => {
    expect(DEFAULT_AUDIT_CONCURRENCY).toEqual({ registry: 3, source: 2, llm: 1 })
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('HTTP 429'))
      .mockRejectedValueOnce(new Error('HTTP 503'))
      .mockResolvedValue('ok')

    await expect(
      retryTransient(operation, new AbortController().signal, 3, 0)
    ).resolves.toBe('ok')
    expect(operation).toHaveBeenCalledTimes(3)
  })

  it('matches the sequential baseline and keeps bibliography order', async () => {
    const fixedNow = () => new Date('2026-07-18T00:00:00.000Z')
    const sequential = await runManuscriptAudit(request('baseline-0001'), services(), {
      signal: new AbortController().signal,
      concurrency: { registry: 1, source: 1, llm: 1 },
      now: fixedNow
    })
    const findingEvents: ManuscriptAuditProgressEvent[] = []
    const concurrent = await runManuscriptAudit(request('parallel-0001'), services(), {
      signal: new AbortController().signal,
      onProgress: (event) => findingEvents.push(event),
      now: fixedNow
    })

    expect(concurrent).toEqual(sequential)
    expect(concurrent.findings.map((finding) => finding.bibKey)).toEqual(['1', '2'])
    expect(concurrent.findings.every((finding) => finding.layers.passage.status !== 'pass')).toBe(true)
    expect(concurrent.manuscript.sourceFormat).toBe('docx')
    expect(concurrent.grounding).toEqual({
      enabled: false,
      modelId: 'test',
      checkpoint: 'test',
      runner: 'lmstudio'
    })
    expect(
      findingEvents
        .filter((event) => event.kind === 'finding')
        .map((event) => event.kind === 'finding' ? event.index : -1)
    ).toEqual([1, 0])
  })

  it('stops emitting findings after cancellation', async () => {
    const controller = new AbortController()
    const events: ManuscriptAuditProgressEvent[] = []
    const run = runManuscriptAudit(request('cancelled-001'), services(), {
      signal: controller.signal,
      onProgress: (event) => events.push(event)
    })

    await new Promise((resolve) => setTimeout(resolve, 2))
    const findingsAtCancel = events.filter((event) => event.kind === 'finding').length
    controller.abort()

    await expect(run).rejects.toMatchObject({ name: 'AbortError' })
    expect(events.filter((event) => event.kind === 'finding')).toHaveLength(findingsAtCancel)
  })

  it('re-audits every cite site for one bibliography key only', async () => {
    const filtered = request('filtered-0001')
    filtered.rawText = [
      'Introduction',
      'Alpha evidence is discussed (Smith, 2020).',
      'Later, Alpha evidence is repeated (Smith, 2020). Beta evidence follows (Jones, 2021).'
    ].join('\n\n')
    filtered.bibKeyFilter = '1'
    const auditServices = services()

    const report = await runManuscriptAudit(filtered, auditServices, {
      signal: new AbortController().signal
    })

    expect(report.findings.map((finding) => finding.bibKey)).toEqual(['1'])
    expect(report.findings[0]?.citeSites).toHaveLength(2)
    expect(auditServices.resolveRegistry).toHaveBeenCalledTimes(1)
    expect(auditServices.resolveRegistry).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Alpha evidence' })
    )
  })

  it('grounds a filtered reference offline from its attached PDF cache', async () => {
    const filtered = request('offline-source-1')
    filtered.networkStatus = 'offline'
    filtered.bibKeyFilter = '1'
    filtered.sourceArtifactsByBibKey = {
      '1': {
        path: 'C:\\papers\\alpha.pdf',
        sha256: 'a'.repeat(64),
        sourceHash: `sha256:${'a'.repeat(64)}`,
        size: 1024,
        extractedTextCacheKey: `source-pdf:${'a'.repeat(64)}`,
        tier: 'embedded_text',
        languages: ['eng'],
        warnings: [],
        pageCount: 2,
        pageBoundaries: [
          { page: 1, start: 0, end: 30 },
          { page: 2, start: 32, end: 60 }
        ],
        attachedAt: '2026-07-18T00:00:00.000Z'
      }
    }
    const auditServices = services()
    vi.mocked(auditServices.loadSourceArtifact).mockResolvedValue({
      status: 'ready',
      artifact: filtered.sourceArtifactsByBibKey['1']!,
      text: 'Alpha evidence is discussed in this attached full text.'
    })

    const report = await runManuscriptAudit(filtered, auditServices, {
      signal: new AbortController().signal
    })

    expect(auditServices.resolveRegistry).not.toHaveBeenCalled()
    expect(report.findings[0]?.l3Coverage).toBe('full_text_attached_pdf')
    expect(report.findings[0]?.citeSites?.[0]?.sourceHash).toBe(`sha256:${'a'.repeat(64)}`)
    expect(report.findings[0]?.citeSites?.[0]?.sourceExcerptSource).toBe('local_pdf')
  })
})
