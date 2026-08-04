import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import {
  AUDIT_TRAIL_SCHEMA_VERSION,
  AuditTrailRecorder,
  buildProvenanceManifest,
  buildTrailFinding,
  bundleSharhProvenance,
  eventIdFor,
  identityForItem,
  llmConfigIdentity,
  redactLlmPayload,
  withAuditTrail
} from '../../src/engine/manuscript/audit-trail'
import type { ManuscriptAuditServices } from '../../src/engine/manuscript/audit-runner'
import type { CitationFinding } from '../../src/engine/manuscript/types'
import { sanitizeAuditTrailExportRequest } from '../../src/shared/manuscript-audit-contract'
import type { CslItem } from '../../src/engine/types'

function finding(bibKey: string): CitationFinding {
  return {
    bibKey,
    inTextSpans: [],
    referenceIntegrityRisk: 'manual_review',
    layers: {
      registry: { status: 'pass' },
      metadata: { status: 'warn', reasons: ['m1_missing_doi'] },
      passage: { status: 'skipped', reason: 'llm_disabled' }
    },
    l3Coverage: 'abstract_only_closed',
    evidence: [],
    greyTags: [],
    userAction: { kind: 'none' }
  }
}

function item(overrides: Partial<CslItem> = {}): CslItem {
  return { id: 'alpha', type: 'article-journal', title: 'Alpha evidence', ...overrides }
}

function services(): ManuscriptAuditServices {
  return {
    appVersion: '1.2.3',
    resolveRegistry: vi.fn(async () => ({ source: 'openalex', canonical: item(), l1: { status: 'pass' } })),
    alignMetadata: vi.fn(async () => ({ l2: { status: 'pass' }, mismatchedFields: [] })),
    europePmcJats: vi.fn(async () => ({ url: 'https://europepmc.org/PMC1', jatsXml: '<article/>' })),
    unpaywall: vi.fn(async () => ({ is_oa: true })),
    fetchOaUrl: vi.fn(async () => ({ kind: 'html', blocked: false, status: 200 })),
    encryptionAvailable: () => true,
    llmChat: vi.fn(async () => '{"overallVerdict":"support"}'),
    loadSourceArtifact: vi.fn(async (artifact) => ({ status: 'ready', artifact, text: 'Full text.' }))
  }
}

function sha256Hex(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

describe('audit trail recorder', () => {
  it('serializes bounded NDJSON records with the current schema version', () => {
    const recorder = new AuditTrailRecorder('session-1')
    expect(recorder.record({ recordType: 'decision', schemaVersion: AUDIT_TRAIL_SCHEMA_VERSION, runId: 'run-0001', sessionId: 'session-1', timestamp: 't', kind: 'audit_completed' })).toBe(true)
    expect(recorder.record({ recordType: 'decision', schemaVersion: AUDIT_TRAIL_SCHEMA_VERSION, runId: 'run-0001', sessionId: 'session-1', timestamp: 't', kind: 'audit_completed' })).toBe(true)

    const lines = recorder.toNdjson().trimEnd().split('\n')
    expect(lines).toHaveLength(2)
    for (const line of lines) {
      expect(JSON.parse(line).schemaVersion).toBe(AUDIT_TRAIL_SCHEMA_VERSION)
      expect(JSON.parse(line).sessionId).toBe('session-1')
    }
  })

  it('stops accepting records at the 10k cap', () => {
    const recorder = new AuditTrailRecorder('session-1')
    const record = { recordType: 'decision' as const, schemaVersion: AUDIT_TRAIL_SCHEMA_VERSION, runId: 'run-0001', sessionId: 'session-1', timestamp: 't', kind: 'audit_completed' as const }
    for (let i = 0; i < 10_000; i += 1) recorder.record(record)

    expect(recorder.length).toBe(10_000)
    expect(recorder.record(record)).toBe(false)
    expect(recorder.toNdjson().trimEnd().split('\n')).toHaveLength(10_000)
  })

  it('derives deterministic event ids and stable item identities', () => {
    expect(eventIdFor('registry', '10.1000/abc')).toBe(eventIdFor('registry', '10.1000/abc'))
    expect(eventIdFor('registry', '10.1000/abc')).not.toBe(eventIdFor('unpaywall', '10.1000/abc'))
    expect(eventIdFor('registry', '10.1000/abc')).not.toBe(eventIdFor('registry', '10.1000/abd'))
    expect(eventIdFor('llm', 'model|preset|http://localhost:1234')).toMatch(/^evt-llm-[0-9a-f]{16}$/)

    expect(identityForItem(item({ DOI: '10.1000/abc', PMCID: 'PMC1', title: 'Title' }))).toBe('10.1000/abc')
    expect(identityForItem(item({ PMCID: 'PMC1', title: 'Title' }))).toBe('PMC1')
    expect(identityForItem(item({ title: '  Title  ' }))).toBe('Title')
    expect(identityForItem(item({ title: '' }))).toBe('alpha')
    expect(identityForItem(undefined)).toBe('')
  })

  it('returns the llm config identity and redacts payloads to 2400 chars with a sha256', () => {
    expect(llmConfigIdentity({ model: 'm', presetId: 'p', baseUrl: 'http://localhost:1234' })).toBe('m|p|http://localhost:1234')

    const short = redactLlmPayload([{ role: 'user', content: 'hello' }])
    expect(short.payload).toBe('user:hello')
    expect(short.sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(short.sha256).toBe(sha256Hex(JSON.stringify([{ role: 'user', content: 'hello' }])))

    const long = redactLlmPayload([{ role: 'user', content: 'x'.repeat(3000) }])
    expect(long.payload).toHaveLength(2401)
    expect(long.payload.endsWith('…')).toBe(true)
    expect(long.payload).not.toContain('x'.repeat(2401))
    expect(long.sha256).toBe(sha256Hex(JSON.stringify([{ role: 'user', content: 'x'.repeat(3000) }])))
  })
})

describe('buildTrailFinding', () => {
  it('references registry, metadata, europe_pmc and unpaywall events when online', () => {
    const trail = buildTrailFinding({
      runId: 'run-0001',
      sessionId: 'session-1',
      timestamp: 't',
      finding: finding('1'),
      item: item({ DOI: '10.1000/abc', PMCID: 'PMC1' }),
      llmEnabled: false,
      llm: { presetId: 'p', baseUrl: 'http://localhost:1234', model: 'm' },
      online: true
    })

    expect(trail.bibKey).toBe('1')
    expect(trail.eventIds).toContain(eventIdFor('registry', '10.1000/abc'))
    expect(trail.eventIds).toContain(eventIdFor('metadata', '10.1000/abc'))
    expect(trail.eventIds).toContain(eventIdFor('europe_pmc', 'PMC1'))
    expect(trail.eventIds).toContain(eventIdFor('unpaywall', '10.1000/abc'))
    expect(trail.eventIds).not.toContain(eventIdFor('llm', 'm|p|http://localhost:1234'))
    expect(trail.referenceIntegrityRisk).toBe('manual_review')
    expect(trail.l1Status).toBe('pass')
    expect(trail.l2Status).toBe('warn')
    expect(trail.passageStatus).toBe('skipped')
    expect(trail.l3Coverage).toBe('abstract_only_closed')
  })

  it('skips network events offline and adds llm/source_artifact events when present', () => {
    const trail = buildTrailFinding({
      runId: 'run-0001',
      sessionId: 'session-1',
      timestamp: 't',
      finding: finding('1'),
      item: item({ DOI: '10.1000/abc' }),
      llmEnabled: true,
      llm: { presetId: 'p', baseUrl: 'http://localhost:1234', model: 'm' },
      online: false,
      attachedSourcePath: 'C:\\papers\\alpha.pdf'
    })

    expect(trail.eventIds).not.toContain(eventIdFor('registry', '10.1000/abc'))
    expect(trail.eventIds).not.toContain(eventIdFor('metadata', '10.1000/abc'))
    expect(trail.eventIds).toContain(eventIdFor('source_artifact', 'C:\\papers\\alpha.pdf'))
    expect(trail.eventIds).toContain(eventIdFor('llm', 'm|p|http://localhost:1234'))
  })

  it('deduplicates repeated event references', () => {
    const trail = buildTrailFinding({
      runId: 'run-0001',
      sessionId: 'session-1',
      timestamp: 't',
      finding: finding('1'),
      item: item({ PMCID: 'PMC1' }),
      llmEnabled: false,
      llm: { presetId: 'p', baseUrl: 'http://localhost:1234', model: 'm' },
      online: false,
      attachedSourcePath: 'C:\\papers\\alpha.pdf'
    })

    expect(trail.eventIds).toEqual([eventIdFor('source_artifact', 'C:\\papers\\alpha.pdf')])
  })
})

describe('withAuditTrail', () => {
  it('emits ok events for every service call and passes results through', async () => {
    const base = services()
    const recorder = new AuditTrailRecorder('session-1')
    const wrapped = withAuditTrail(base, recorder, 'run-0001')

    const signal = new AbortController().signal
    const cslItem = item({ DOI: '10.1000/abc' })
    const registry = await wrapped.resolveRegistry(cslItem)
    const metadata = await wrapped.alignMetadata(cslItem, cslItem, 'openalex')
    const jats = await wrapped.europePmcJats('PMC1', signal)
    const unpaywall = await wrapped.unpaywall('10.1000/abc', 'a@b.c', signal)
    const oa = await wrapped.fetchOaUrl('https://example.org/x', signal)
    const source = await wrapped.loadSourceArtifact(
      { path: 'C:\\papers\\alpha.pdf', sha256: 'a'.repeat(64), sourceHash: `sha256:${'a'.repeat(64)}`, size: 10, tier: 'embedded_text', languages: ['eng'], warnings: [], attachedAt: 't' },
      signal
    )

    expect(registry.l1.status).toBe('pass')
    expect(metadata.l2.status).toBe('pass')
    expect(jats.url).toContain('europepmc.org')
    expect(unpaywall).toEqual({ is_oa: true })
    expect(oa.status).toBe(200)
    expect(source.status).toBe('ready')
    expect(base.resolveRegistry).toHaveBeenCalledTimes(1)

    const events = recorder.toNdjson().trimEnd().split('\n').map((line) => JSON.parse(line))
    expect(events.map((event) => `${event.sourceType}:${event.status}`)).toEqual([
      'registry:ok',
      'metadata:ok',
      'europe_pmc:ok',
      'unpaywall:ok',
      'oa_fetch:ok',
      'source_artifact:ok'
    ])
    expect(events[0]?.identity).toBe('10.1000/abc')
    expect(events[0]?.eventId).toBe(eventIdFor('registry', '10.1000/abc'))
    expect(events[0]?.payload).toBe('source=openalex; l1=pass')
  })

  it('records errors and rethrows, and records blocked oa fetches as blocked', async () => {
    const base = services()
    vi.mocked(base.resolveRegistry).mockRejectedValueOnce(new Error('HTTP 429'))
    vi.mocked(base.fetchOaUrl).mockResolvedValueOnce({ kind: 'html', blocked: true })
    const recorder = new AuditTrailRecorder('session-1')
    const wrapped = withAuditTrail(base, recorder, 'run-0001')

    await expect(wrapped.resolveRegistry(item())).rejects.toThrow('HTTP 429')
    await expect(wrapped.fetchOaUrl('https://example.org/x', new AbortController().signal)).resolves.toMatchObject({ blocked: true })

    const events = recorder.toNdjson().trimEnd().split('\n').map((line) => JSON.parse(line))
    expect(events).toHaveLength(2)
    expect(events[0]).toMatchObject({ sourceType: 'registry', status: 'error', message: 'HTTP 429' })
    expect(events[1]).toMatchObject({ sourceType: 'oa_fetch', status: 'blocked' })
    expect(events[1].payload).toBe('kind=html')
  })

  it('stores llm payloads redacted with a sha256 of the full payload', async () => {
    const base = services()
    const recorder = new AuditTrailRecorder('session-1')
    const wrapped = withAuditTrail(base, recorder, 'run-0001')
    const messages = [{ role: 'user' as const, content: 'claim' }]

    await wrapped.llmChat({ presetId: 'p', baseUrl: 'http://localhost:1234', model: 'm' }, messages, new AbortController().signal)

    const event = JSON.parse(recorder.toNdjson().trimEnd().split('\n')[0]!)
    expect(event).toMatchObject({ sourceType: 'llm', status: 'ok', identity: 'm|p|http://localhost:1234' })
    expect(event.payload).toBe('user:claim')
    expect(event.payloadSha256).toBe(sha256Hex(JSON.stringify(messages)))
  })
})

describe('provenance bundle', () => {
  it('builds a sorted sha256 manifest', () => {
    const manifest = buildProvenanceManifest({ b: 'two', a: 'one' })
    expect(manifest).toBe(`${sha256Hex('one')}  a\n${sha256Hex('two')}  b\n`)
  })

  it('bundles timeline, report and a manifest covering both', () => {
    const bundle = bundleSharhProvenance('{"recordType":"event"}\n', '{"generatedAt":"t"}')
    expect(Object.keys(bundle).sort()).toEqual(['audit-report.json', 'audit-timeline.ndjson', 'manifest.sha256'])
    expect(bundle['manifest.sha256']).toBe(
      buildProvenanceManifest({
        'audit-timeline.ndjson': bundle['audit-timeline.ndjson']!,
        'audit-report.json': bundle['audit-report.json']!
      })
    )
    for (const name of ['audit-timeline.ndjson', 'audit-report.json']) {
      expect(bundle['manifest.sha256']).toContain(`${sha256Hex(bundle[name]!)}  ${name}`)
    }
  })
})

describe('sanitizeAuditTrailExportRequest', () => {
  it('accepts a well-formed export request', () => {
    expect(sanitizeAuditTrailExportRequest({ runId: 'run-0001', report: { generatedAt: 't' } })).toEqual({
      runId: 'run-0001',
      report: { generatedAt: 't' }
    })
  })

  it('rejects malformed run ids and missing report timestamps', () => {
    expect(sanitizeAuditTrailExportRequest(null)).toBeNull()
    expect(sanitizeAuditTrailExportRequest({ runId: 'short', report: { generatedAt: 't' } })).toBeNull()
    expect(sanitizeAuditTrailExportRequest({ runId: 'run-0001' })).toBeNull()
    expect(sanitizeAuditTrailExportRequest({ runId: 'run-0001', report: {} })).toBeNull()
    expect(sanitizeAuditTrailExportRequest({ runId: 'run-0001', report: 'not-an-object' })).toBeNull()
  })
})
