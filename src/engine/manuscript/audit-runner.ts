import { createHash } from 'node:crypto'
import { classifyGreyTags } from '../audit/grey'
import { buildChecklistFromText } from '../audit/checklist'
import { checkStructure } from '../audit/structure'
import { scorePassageAgainstSource } from '../relevance/deterministic'
import type { CslItem } from '../types'
import type {
  ManuscriptAuditItemStage,
  ManuscriptAuditProgressEvent,
  ManuscriptAuditStartRequest
} from '../../shared/manuscript-audit-contract'
import type { LoadedSourceArtifact, SourceArtifact } from '../../shared/source-artifact'
import { bibEntriesFromCitationLibrary } from './bibliography-bridge'
import {
  buildGroundingLlmMessages,
  evidenceFromGroundingParse,
  GROUNDING_EXCERPT_MAX_CHARS,
  GROUNDING_PASSAGE_MAX_CHARS,
  GROUNDING_PROMPT_CONTRACT_VERSION,
  parseGroundingJson,
  passageVerdictFromGroundingClaims,
  passageVerdictWithoutParsedGrounding,
  rollupPassageFromSites,
  selectSourceChunksForGrounding,
  truncateForGrounding,
  withQuoteValidationState,
  worstDeterministicBucket
} from './grounding-llm'
import { parseInTextCitations } from './intext'
import { referenceIntegrityRiskFromRegistry } from './integrity-risk'
import {
  buildBibEntriesFromReferencesText,
  mapInTextToBibliography,
  selectMappedBibliographyEntries,
  summarizeCitationMappings,
  type BibEntry,
  type CitationMapping
} from './mapping'
import { fullTextFromOaPdfBytes } from './oa-pdf-grounding'
import { buildPassageWindow } from './passage-window'
import { segmentManuscriptText } from './segments'
import type {
  AuditReport,
  CitationFinding,
  CiteGroundingSite,
  ClaimGroundingRow,
  EvidenceSnippet,
  InTextSpan,
  UserAction
} from './types'
import {
  bibliographySupportsRegistryTitle,
  type MetadataAlignment,
  type RegistryResolution
} from './verify'

const MAX_LLM_RAW_STORE = 2_400
const GROUNDING_LLM_PARSE_ATTEMPTS = 2

export const DEFAULT_AUDIT_CONCURRENCY = {
  registry: 3,
  source: 2,
  llm: 1
} as const

export class ManuscriptAuditInputError extends Error {
  constructor(public readonly code: 'no_references' | 'bibliography_empty' | 'no_in_text_cites') {
    super(code)
    this.name = 'ManuscriptAuditInputError'
  }
}

export interface ManuscriptAuditServices {
  appVersion: string
  resolveRegistry(item: CslItem): Promise<RegistryResolution>
  alignMetadata(userItem: CslItem, canonical: CslItem, source: RegistryResolution['source']): Promise<MetadataAlignment>
  europePmcJats(pmcid: string, signal: AbortSignal): Promise<{ url: string; jatsXml: string }>
  unpaywall(doi: string, email: string | undefined, signal: AbortSignal): Promise<unknown>
  fetchOaUrl(url: string, signal: AbortSignal): Promise<{
    kind: string
    text?: string
    pdfBytes?: ArrayBuffer
    blocked?: boolean
    status?: number
  }>
  encryptionAvailable(): boolean
  llmChat(
    config: { baseUrl: string; model: string; presetId: string },
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    signal: AbortSignal
  ): Promise<string>
  loadSourceArtifact(artifact: SourceArtifact, signal: AbortSignal): Promise<LoadedSourceArtifact>
}

export interface RunManuscriptAuditOptions {
  signal: AbortSignal
  onProgress?: (event: ManuscriptAuditProgressEvent) => void
  concurrency?: Partial<typeof DEFAULT_AUDIT_CONCURRENCY>
  now?: () => Date
}

type CanonicalItem = Pick<CslItem, 'DOI' | 'PMCID' | 'abstract' | 'URL' | 'title'>

type ResolvedL3Source =
  | {
      kind: 'full_text'
      text: string
      coverage: Extract<
        CitationFinding['l3Coverage'],
        'full_text_oa_europe_pmc' | 'full_text_oa_unpaywall' | 'full_text_attached_pdf'
      >
      snippetSource: EvidenceSnippet['source']
      url?: string
      retrievedAt: string
      extractionTier: NonNullable<CiteGroundingSite['sourceExtractionTier']>
      sourceHash?: string
    }
  | {
      kind: 'abstract_only'
      abstract: string
      url?: string
      retrievedAt: string
      extractionTier: Extract<NonNullable<CiteGroundingSite['sourceExtractionTier']>, 'registry_abstract'>
    }
  | { kind: 'unavailable'; reason: string }

interface PreparedAudit {
  bodyText: string
  fullText: string
  entries: BibEntry[]
  mappings: CitationMapping[]
  citationMapping: AuditReport['citationMapping']
  shell: Omit<AuditReport, 'findings' | 'generatedAt'>
}

export async function runManuscriptAudit(
  request: ManuscriptAuditStartRequest,
  services: ManuscriptAuditServices,
  options: RunManuscriptAuditOptions
): Promise<AuditReport> {
  throwIfAborted(options.signal)
  const now = options.now ?? (() => new Date())
  const auditTimestamp = now().toISOString()
  const prepared = await prepareAudit(request, services.appVersion)
  const progress = options.onProgress ?? (() => {})
  const limits = { ...DEFAULT_AUDIT_CONCURRENCY, ...options.concurrency }
  const registryPool = new Semaphore(limits.registry)
  const sourcePool = new Semaphore(limits.source)
  const llmPool = new Semaphore(limits.llm)
  const findings: Array<CitationFinding | undefined> = new Array(prepared.entries.length)
  let processed = 0

  progress({
    runId: request.runId,
    kind: 'started',
    total: prepared.entries.length,
    shell: prepared.shell,
    bibKeyFilter: request.bibKeyFilter
  })

  const itemRuns = prepared.entries.map(async (entry, index) => {
    emitStage(progress, request.runId, index, entry.key, 'queued')
    let finding: CitationFinding
    try {
      finding = await auditEntry({
        request,
        services,
        signal: options.signal,
        prepared,
        entry,
        index,
        registryPool,
        sourcePool,
        llmPool,
        progress,
        auditTimestamp
      })
    } catch (error) {
      if (isAbortError(error) || options.signal.aborted) throw abortError()
      emitStage(progress, request.runId, index, entry.key, 'failed')
      finding = recoverableFailureFinding(entry, prepared.mappings, request, error)
    }

    throwIfAborted(options.signal)
    findings[index] = finding
    processed += 1
    progress({
      runId: request.runId,
      kind: 'finding',
      index,
      finding,
      processed,
      total: prepared.entries.length
    })
    emitStage(progress, request.runId, index, entry.key, 'done')
  })

  await Promise.all(itemRuns)
  throwIfAborted(options.signal)

  return {
    ...prepared.shell,
    findings: findings.filter((finding): finding is CitationFinding => Boolean(finding)),
    checklist: buildChecklist(request, prepared.fullText),
    generatedAt: auditTimestamp
  }
}

async function prepareAudit(request: ManuscriptAuditStartRequest, appVersion: string): Promise<PreparedAudit> {
  const segmented = segmentManuscriptText(request.rawText)
  const useBibliography = request.referenceSource === 'bibliography'

  if (!useBibliography && !segmented.referencesText) {
    throw new ManuscriptAuditInputError('no_references')
  }
  if (useBibliography && request.libraryCitations.length === 0) {
    throw new ManuscriptAuditInputError('bibliography_empty')
  }

  const inText = parseInTextCitations(segmented.bodyText)
  if (useBibliography && inText.citations.length === 0) {
    throw new ManuscriptAuditInputError('no_in_text_cites')
  }

  const bibliography = useBibliography
    ? { entries: bibEntriesFromCitationLibrary(request.libraryCitations) }
    : await buildBibEntriesFromReferencesText(segmented.referencesText!)
  const mappings = mapInTextToBibliography(inText.citations, bibliography.entries)
  // Phase 0-C: only mapped bibliography entries can enter L3.
  const mappedEntries = selectMappedBibliographyEntries(bibliography.entries, mappings)
  const entries = request.bibKeyFilter
    ? mappedEntries.filter((entry) => entry.key === request.bibKeyFilter)
    : mappedEntries
  const citationMapping = summarizeCitationMappings(mappings)
  const selectedTemplate = request.template.templates.find((template) => template.id === request.template.selectedId)

  const shell: Omit<AuditReport, 'findings' | 'generatedAt'> = {
    manuscript: {
      wordCount: segmented.fullText.split(/\s+/).filter(Boolean).length,
      sourceFormat: request.manuscriptSourceFormat
    },
    template: {
      id: request.template.selectedId,
      name: selectedTemplate?.name ?? request.template.selectedId,
      strict: request.template.strict
    },
    grounding: {
      enabled: request.llm.enabled,
      modelId: request.llm.model,
      checkpoint: request.llm.model,
      runner: request.llm.presetId
    },
    citationMapping,
    checklist: [],
    sources: sourcesAttribution(),
    appVersion,
    promptContractVersion: GROUNDING_PROMPT_CONTRACT_VERSION,
    networkStatus: request.networkStatus,
    priorRuns: request.priorRuns
  }

  return {
    bodyText: segmented.bodyText,
    fullText: segmented.fullText,
    entries,
    mappings,
    citationMapping,
    shell
  }
}

async function auditEntry(params: {
  request: ManuscriptAuditStartRequest
  services: ManuscriptAuditServices
  signal: AbortSignal
  prepared: PreparedAudit
  entry: BibEntry
  index: number
  registryPool: Semaphore
  sourcePool: Semaphore
  llmPool: Semaphore
  progress: (event: ManuscriptAuditProgressEvent) => void
  auditTimestamp: string
}): Promise<CitationFinding> {
  const { request, services, signal, prepared, entry, index, progress } = params
  const spans = spansForEntry(entry.key, prepared.mappings)
  const userAction = request.userActionsByBibKey[entry.key] ?? defaultAction()
  const attachedSource = request.sourceArtifactsByBibKey?.[entry.key]

  if (!entry.item) {
    return unparsedFinding(entry, spans, userAction)
  }

  if (request.networkStatus !== 'online' && !attachedSource) {
    return offlineFinding(entry, spans, userAction)
  }

  let registry: RegistryResolution
  let metadata: MetadataAlignment
  if (request.networkStatus === 'online') {
    emitStage(progress, request.runId, index, entry.key, 'registry')
    registry = await params.registryPool.run(
      () => retryTransient(() => services.resolveRegistry(entry.item!), signal),
      signal
    )
    throwIfAborted(signal)

    emitStage(progress, request.runId, index, entry.key, 'metadata')
    metadata = registry.canonical
      ? await params.registryPool.run(
          () => retryTransient(() => services.alignMetadata(entry.item!, registry.canonical!, registry.source), signal),
          signal
        )
      : { l2: { status: 'skipped', reason: 'not_applicable' }, mismatchedFields: [] }
  } else {
    registry = {
      source: 'none',
      canonical: null,
      l1: { status: 'skipped', reason: 'offline' }
    }
    metadata = { l2: { status: 'skipped', reason: 'offline' }, mismatchedFields: [] }
  }

  const doiTitleConflict =
    request.networkStatus === 'online' &&
    Boolean(entry.item.DOI?.trim()) &&
    Boolean(registry.canonical?.title?.trim()) &&
    !bibliographySupportsRegistryTitle(entry.raw, registry.canonical!.title)

  if (doiTitleConflict) {
    metadata = {
      l2: {
        status: 'fail',
        reasons: ['Bibliography line title does not match the registry record for this DOI. Verify the DOI or title.']
      },
      mismatchedFields: ['title']
    }
  }

  emitStage(progress, request.runId, index, entry.key, 'source')
  const canonical = registry.canonical ?? entry.item
  const resolved = attachedSource
    ? await params.sourcePool.run(
        () => resolveAttachedSource(attachedSource, services, signal, params.auditTimestamp),
        signal
      )
    : doiTitleConflict
      ? { kind: 'unavailable' as const, reason: 'Bibliography title does not match registry record for this DOI' }
      : await params.sourcePool.run(
          () => resolveL3Source(canonical, request.unpaywallEmail, services, signal, params.auditTimestamp),
          signal
        )

  emitStage(progress, request.runId, index, entry.key, 'grounding')
  const citeSites: CiteGroundingSite[] = []
  const groundingEvidence: EvidenceSnippet[] = []
  for (const span of spans) {
    throwIfAborted(signal)
    const passage = buildPassageWindow(prepared.bodyText, span.start, span.end).text
    const site = await evaluateCiteSite(passage, span, resolved, request, services, params.llmPool, signal)
    citeSites.push(site)
    groundingEvidence.push(...groundingEvidenceFromSite(site, resolved))
  }

  return {
    bibKey: entry.key,
    inTextSpans: spans,
    resolvedItem: entry.item,
    referenceIntegrityRisk: referenceIntegrityRiskFromRegistry(registry.l1),
    layers: {
      registry: registry.l1,
      metadata: metadata.l2,
      passage: rollupPassageFromSites(citeSites)
    },
    l3Coverage:
      resolved.kind === 'full_text'
        ? resolved.coverage
        : resolved.kind === 'abstract_only'
          ? 'abstract_only_closed'
          : 'unavailable',
    l3Score: worstDeterministicBucket(citeSites),
    citeSites,
    evidence: [
      { source: 'abstract', text: entry.raw },
      ...(registry.canonical?.title
        ? [{
            source: (registry.source === 'openalex' ? 'openalex' : registry.source) as EvidenceSnippet['source'],
            text: registry.canonical.title
          }]
        : []),
      ...resolvedSourceSnippets(resolved),
      ...dedupeEvidence(groundingEvidence)
    ],
    greyTags: classifyGreyTags(entry.item),
    userAction
  }
}

async function resolveAttachedSource(
  artifact: SourceArtifact,
  services: ManuscriptAuditServices,
  signal: AbortSignal,
  retrievedAt: string
): Promise<ResolvedL3Source> {
  throwIfAborted(signal)
  const loaded = await services.loadSourceArtifact(artifact, signal)
  throwIfAborted(signal)
  if (loaded.status === 'changed') {
    return {
      kind: 'unavailable',
      reason: 'Attached PDF changed or moved: its current SHA-256 does not match the audited source.'
    }
  }
  if (loaded.status === 'missing') {
    return {
      kind: 'unavailable',
      reason: 'Attached PDF or its local extraction cache is missing. Reattach the source.'
    }
  }
  if (!loaded.text.trim()) {
    return { kind: 'unavailable', reason: 'Attached PDF extraction produced no source text.' }
  }
  return {
    kind: 'full_text',
    text: loaded.text,
    coverage: 'full_text_attached_pdf',
    snippetSource: 'local_pdf',
    url: loaded.artifact.path,
    retrievedAt,
    extractionTier: loaded.artifact.tier === 'ocr' ? 'pdf_ocr' : 'pdf_embedded_text',
    sourceHash: loaded.artifact.sourceHash
  }
}

async function resolveL3Source(
  canonical: CanonicalItem,
  unpaywallEmailRaw: string,
  services: ManuscriptAuditServices,
  signal: AbortSignal,
  retrievedAt: string
): Promise<ResolvedL3Source> {
  if (canonical.PMCID) {
    try {
      const result = await retryTransient(() => services.europePmcJats(canonical.PMCID!, signal), signal)
      const fullText = stripXmlOrHtmlToText(result.jatsXml)
      return {
        kind: 'full_text',
        text: fullText,
        coverage: 'full_text_oa_europe_pmc',
        snippetSource: 'europe_pmc',
        url: result.url,
        retrievedAt,
        extractionTier: 'jats_xml'
      }
    } catch (error) {
      if (isAbortError(error)) throw error
    }
  }

  if (canonical.DOI) {
    try {
      const email = unpaywallEmailRaw.trim() || undefined
      if (!email) throw new Error('Unpaywall email not set')
      const unpaywall = await retryTransient(
        () => services.unpaywall(canonical.DOI!, email, signal),
        signal
      ) as {
        is_oa?: boolean
        best_oa_location?: {
          url?: string | null
          url_for_pdf?: string | null
          url_for_landing_page?: string | null
        } | null
      }
      const location = unpaywall.best_oa_location
      const urls = [location?.url_for_pdf, location?.url, location?.url_for_landing_page]
        .filter((url): url is string => typeof url === 'string' && url.trim().length > 0)

      if (unpaywall.is_oa) {
        for (const url of urls) {
          const fetched = await retryTransient(async () => {
            const result = await services.fetchOaUrl(url, signal)
            if (result.status === 429 || result.status === 503) {
              throw new TransientAuditError(result.status)
            }
            return result
          }, signal)
          if (fetched.blocked) continue
          if (fetched.kind === 'pdf' && fetched.pdfBytes?.byteLength) {
            try {
              const extracted = await fullTextFromOaPdfBytes(fetched.pdfBytes, url)
              if (extracted) return { ...extracted, retrievedAt }
            } catch (error) {
              if (isAbortError(error)) throw error
            }
            continue
          }
          if (fetched.text?.trim()) {
            return {
              kind: 'full_text',
              text: stripXmlOrHtmlToText(fetched.text),
              coverage: 'full_text_oa_unpaywall',
              snippetSource: 'unpaywall',
              url,
              retrievedAt,
              extractionTier: 'html_text'
            }
          }
        }
      }
    } catch (error) {
      if (isAbortError(error)) throw error
    }
  }

  if (canonical.abstract?.trim()) {
    return {
      kind: 'abstract_only',
      abstract: canonical.abstract,
      url: canonical.URL,
      retrievedAt,
      extractionTier: 'registry_abstract'
    }
  }
  return { kind: 'unavailable', reason: 'No OA full text and no abstract available' }
}

async function evaluateCiteSite(
  passage: string,
  span: InTextSpan,
  resolved: ResolvedL3Source,
  request: ManuscriptAuditStartRequest,
  services: ManuscriptAuditServices,
  llmPool: Semaphore,
  signal: AbortSignal
): Promise<CiteGroundingSite> {
  if (resolved.kind === 'unavailable') {
    return {
      inTextSpan: span,
      passageWindow: passage,
      deterministicScore: 0,
      deterministicBucket: 'low',
      matchedTermsSample: [],
      passageVerdict: { status: 'insufficient_evidence', reason: resolved.reason }
    }
  }

  const sourceText = resolved.kind === 'full_text' ? resolved.text : resolved.abstract
  const scored = scorePassageAgainstSource(passage, sourceText)
  const deterministicBucket =
    resolved.kind === 'abstract_only' && scored.bucket === 'high' ? 'medium' : scored.bucket
  const snippetSource: EvidenceSnippet['source'] =
    resolved.kind === 'full_text' ? resolved.snippetSource : 'abstract'
  const url = resolved.url
  const label = resolved.kind === 'full_text' ? resolved.coverage.replace(/_/g, ' ') : 'abstract'
  const excerpt = selectSourceChunksForGrounding(passage, sourceText, GROUNDING_EXCERPT_MAX_CHARS)
  const excerptFields = sourceExcerptFields(
    excerpt,
    snippetSource,
    label,
    url,
    resolved.retrievedAt,
    resolved.extractionTier,
    resolved.sourceHash ?? hashSourceText(sourceText)
  )
  const llmOutcome = await llmPool.run(
    () => runGroundingLlm(passage, excerpt, { url, label }, request, services, signal),
    signal
  )

  const base = {
    inTextSpan: span,
    passageWindow: passage,
    deterministicScore: scored.score,
    deterministicBucket,
    matchedTermsSample: scored.matchedTerms.slice(0, 12),
    ...excerptFields
  }

  if (llmOutcome.kind === 'parsed') {
    return {
      ...base,
      passageVerdict: llmOutcome.verdict,
      claimGrounding: llmOutcome.claims,
      llmParseWarning: llmOutcome.parseWarning,
      llmRawResponse: storeLlmSlice(llmOutcome.raw)
    }
  }
  if (llmOutcome.kind === 'encryption_blocked') {
    return {
      ...base,
      passageVerdict: { status: 'warn', reasons: ['LLM disabled: safeStorage encryption unavailable on this system'] }
    }
  }
  if (llmOutcome.kind === 'llm_error') {
    return { ...base, passageVerdict: { status: 'warn', reasons: [llmOutcome.message] } }
  }

  // Phase 0-C: disabled or unparseable LLM output can never produce pass.
  return {
    ...base,
    passageVerdict: passageVerdictWithoutParsedGrounding(
      llmOutcome.kind === 'parse_fail'
        ? { kind: 'parse_fail', hint: llmOutcome.hint }
        : { kind: 'disabled' }
    ),
    llmParseWarning: llmOutcome.kind === 'parse_fail' ? llmOutcome.hint : undefined,
    llmRawResponse: llmOutcome.kind === 'parse_fail' ? storeLlmSlice(llmOutcome.raw) : undefined
  }
}

type GroundingLlmResult =
  | { kind: 'disabled' }
  | { kind: 'encryption_blocked' }
  | { kind: 'parse_fail'; raw: string; hint: string }
  | { kind: 'llm_error'; message: string }
  | {
      kind: 'parsed'
      verdict: CiteGroundingSite['passageVerdict']
      claims: ClaimGroundingRow[]
      raw: string
      parseWarning?: string
    }

async function runGroundingLlm(
  passage: string,
  sourceExcerpt: string,
  meta: { url?: string; label: string },
  request: ManuscriptAuditStartRequest,
  services: ManuscriptAuditServices,
  signal: AbortSignal
): Promise<GroundingLlmResult> {
  if (!request.llm.enabled) return { kind: 'disabled' }
  if (!services.encryptionAvailable()) return { kind: 'encryption_blocked' }

  const cappedPassage = truncateForGrounding(passage, GROUNDING_PASSAGE_MAX_CHARS)
  const cappedExcerpt = truncateForGrounding(sourceExcerpt, GROUNDING_EXCERPT_MAX_CHARS)
  let lastRaw = ''
  let lastParseError = 'Invalid JSON from model'

  try {
    for (let attempt = 0; attempt < GROUNDING_LLM_PARSE_ATTEMPTS; attempt += 1) {
      throwIfAborted(signal)
      const content = await retryTransient(
        () =>
          services.llmChat(
            {
              baseUrl: request.llm.baseUrl,
              model: request.llm.model,
              presetId: request.llm.presetId
            },
            buildGroundingLlmMessages(cappedPassage, cappedExcerpt, meta),
            signal
          ),
        signal
      )
      lastRaw = content
      const parsed = parseGroundingJson(content)
      if (!parsed.ok) {
        lastParseError = parsed.error
        continue
      }

      const scored = scorePassageAgainstSource(passage, sourceExcerpt)
      const claims = withQuoteValidationState(parsed.data.claims, cappedExcerpt)
      let verdict = passageVerdictFromGroundingClaims(claims, scored.bucket, cappedExcerpt)
      const warnings: string[] = []
      if (parsed.repaired) warnings.push('Model JSON was auto-repaired before parsing.')
      if (attempt > 0) warnings.push('Recovered on a second LLM attempt.')
      const detail = (parsed.data.overallRationale ?? []).join('; ') || 'Verify manually.'

      if (parsed.data.overallVerdict === 'unrelated') {
        if (verdict.status === 'pass') {
          verdict = { status: 'warn', reasons: [`Model flagged unrelated overall: ${detail}`] }
        } else if (verdict.status === 'warn' && detail) {
          warnings.push(`Model flagged passage as unrelated overall: ${detail}`)
        }
      } else if (parsed.data.overallVerdict === 'weak' && verdict.status === 'pass') {
        verdict = { status: 'warn', reasons: [`Model flagged weak overall: ${detail}`] }
      }

      return {
        kind: 'parsed',
        verdict,
        claims,
        raw: content,
        parseWarning: warnings.length > 0 ? warnings.join(' ') : undefined
      }
    }
    return { kind: 'parse_fail', raw: lastRaw, hint: lastParseError }
  } catch (error) {
    if (isAbortError(error)) throw error
    return {
      kind: 'llm_error',
      message: `LLM check failed: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

export async function retryTransient<T>(
  operation: () => Promise<T>,
  signal: AbortSignal,
  attempts = 3,
  baseDelayMs = 150
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    throwIfAborted(signal)
    try {
      return await operation()
    } catch (error) {
      if (isAbortError(error) || signal.aborted) throw abortError()
      lastError = error
      if (!isTransientError(error) || attempt === attempts - 1) throw error
      await abortableDelay(baseDelayMs * 2 ** attempt, signal)
    }
  }
  throw lastError
}

class Semaphore {
  private active = 0
  private readonly waiting: Array<() => void> = []

  constructor(private readonly limit: number) {
    if (!Number.isInteger(limit) || limit < 1) throw new Error('Concurrency limit must be at least 1')
  }

  async run<T>(operation: () => Promise<T>, signal: AbortSignal): Promise<T> {
    await this.acquire(signal)
    try {
      throwIfAborted(signal)
      return await operation()
    } finally {
      this.active -= 1
      this.waiting.shift()?.()
    }
  }

  private async acquire(signal: AbortSignal): Promise<void> {
    throwIfAborted(signal)
    if (this.active < this.limit) {
      this.active += 1
      return
    }
    await new Promise<void>((resolve, reject) => {
      const wake = () => {
        signal.removeEventListener('abort', onAbort)
        this.active += 1
        resolve()
      }
      const onAbort = () => {
        const index = this.waiting.indexOf(wake)
        if (index >= 0) this.waiting.splice(index, 1)
        reject(abortError())
      }
      signal.addEventListener('abort', onAbort, { once: true })
      this.waiting.push(wake)
    })
  }
}

class TransientAuditError extends Error {
  constructor(public readonly status: number) {
    super(`Transient audit request failed: ${status}`)
  }
}

function isTransientError(error: unknown): boolean {
  if (error instanceof TransientAuditError) return true
  const message = error instanceof Error ? error.message : String(error)
  return /(?:^|\D)(429|503)(?:\D|$)/.test(message)
}

function abortableDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(abortError())
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw abortError()
}

function abortError(): Error {
  const error = new Error('Cancelled')
  error.name = 'AbortError'
  return error
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || error.message === 'Cancelled')
}

function emitStage(
  progress: (event: ManuscriptAuditProgressEvent) => void,
  runId: string,
  index: number,
  bibKey: string,
  stage: ManuscriptAuditItemStage
): void {
  progress({ runId, kind: 'item-stage', index, bibKey, stage })
}

function spansForEntry(key: string, mappings: CitationMapping[]): InTextSpan[] {
  return mappings
    .filter((mapping) => mapping.matchedBibKeys.includes(key))
    .map((mapping) => ({
      start: mapping.citation.start,
      end: mapping.citation.end,
      raw: mapping.citation.raw,
      locator: mapping.citation.locator
    }))
}

function defaultAction(): UserAction {
  return { kind: 'none' }
}

function unparsedFinding(entry: BibEntry, spans: InTextSpan[], userAction: UserAction): CitationFinding {
  const registry = {
    status: 'insufficient_evidence' as const,
    reason: 'Reference entry could not be parsed into structured metadata'
  }
  return {
    bibKey: entry.key,
    inTextSpans: spans,
    referenceIntegrityRisk: referenceIntegrityRiskFromRegistry(registry),
    layers: {
      registry,
      metadata: { status: 'skipped', reason: 'not_applicable' },
      passage: { status: 'skipped', reason: 'not_applicable' }
    },
    l3Coverage: 'unavailable',
    evidence: [{ source: 'abstract', text: entry.raw }],
    greyTags: [],
    userAction
  }
}

function offlineFinding(entry: BibEntry & { item: CslItem }, spans: InTextSpan[], userAction: UserAction): CitationFinding {
  return {
    bibKey: entry.key,
    inTextSpans: spans,
    resolvedItem: entry.item,
    referenceIntegrityRisk: referenceIntegrityRiskFromRegistry({ status: 'skipped', reason: 'offline' }),
    layers: {
      registry: { status: 'skipped', reason: 'offline' },
      metadata: { status: 'skipped', reason: 'offline' },
      passage: { status: 'skipped', reason: 'offline' }
    },
    l3Coverage: 'unavailable',
    evidence: [{ source: 'abstract', text: entry.raw }],
    greyTags: classifyGreyTags(entry.item),
    userAction
  }
}

function recoverableFailureFinding(
  entry: BibEntry,
  mappings: CitationMapping[],
  request: ManuscriptAuditStartRequest,
  error: unknown
): CitationFinding {
  const message = error instanceof Error ? error.message : String(error)
  const reason = `Audit stage failed; partial report preserved: ${message}`.slice(0, 500)
  return {
    bibKey: entry.key,
    inTextSpans: spansForEntry(entry.key, mappings),
    resolvedItem: entry.item,
    referenceIntegrityRisk: 'manual_review',
    layers: {
      registry: { status: 'insufficient_evidence', reason },
      metadata: { status: 'skipped', reason: 'not_applicable' },
      passage: { status: 'insufficient_evidence', reason }
    },
    l3Coverage: 'unavailable',
    evidence: [{ source: 'abstract', text: entry.raw }],
    greyTags: entry.item ? classifyGreyTags(entry.item) : [],
    userAction: request.userActionsByBibKey[entry.key] ?? defaultAction()
  }
}

function buildChecklist(request: ManuscriptAuditStartRequest, fullText: string): AuditReport['checklist'] {
  const template = request.template.templates.find((candidate) => candidate.id === request.template.selectedId)
  if (!template) return buildChecklistFromText(fullText)
  const structure = checkStructure(fullText, template)
  const structurePassed =
    structure.missing.length === 0 && (request.template.strict ? structure.outOfOrder.length === 0 : true)
  const detail =
    structure.missing.length > 0
      ? `Missing: ${structure.missing.join(', ')}`
      : structure.outOfOrder.length > 0
        ? `Order: ${structure.outOfOrder.join('; ')}`
        : undefined
  return buildChecklistFromText(fullText, { structurePassed, structureDetail: detail })
}

function sourcesAttribution(): AuditReport['sources'] {
  return [
    { name: 'Crossref', attribution: 'Metadata via Crossref REST API', url: 'https://api.crossref.org' },
    { name: 'PubMed', attribution: 'Metadata via NCBI E-utilities', url: 'https://eutils.ncbi.nlm.nih.gov' },
    { name: 'OpenAlex', attribution: 'Metadata via OpenAlex API', url: 'https://api.openalex.org' },
    { name: 'Unpaywall', attribution: 'Open access status via Unpaywall', url: 'https://unpaywall.org/products/api' },
    { name: 'Europe PMC', attribution: 'Open access full text via Europe PMC', url: 'https://europepmc.org/RestfulWebService' }
  ]
}

function sourceExcerptFields(
  excerpt: string,
  source: EvidenceSnippet['source'],
  label: string,
  url: string | undefined,
  retrievedAt: string,
  extractionTier: NonNullable<CiteGroundingSite['sourceExtractionTier']>,
  sourceHash: string
): Pick<
  CiteGroundingSite,
  | 'sourceExcerpt'
  | 'sourceExcerptSource'
  | 'sourceExcerptUrl'
  | 'sourceExcerptLabel'
  | 'sourceRetrievedAt'
  | 'sourceExtractionTier'
  | 'sourceHash'
> {
  return {
    sourceExcerpt: excerpt,
    sourceExcerptSource: source,
    sourceExcerptUrl: url,
    sourceExcerptLabel: label,
    sourceRetrievedAt: retrievedAt,
    sourceExtractionTier: extractionTier,
    sourceHash
  }
}

function hashSourceText(text: string): string {
  return `sha256:${createHash('sha256').update(text).digest('hex')}`
}

function stripXmlOrHtmlToText(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function storeLlmSlice(raw: string): string {
  return raw.length > MAX_LLM_RAW_STORE ? `${raw.slice(0, MAX_LLM_RAW_STORE)}…` : raw
}

function resolvedSourceSnippets(resolved: ResolvedL3Source): EvidenceSnippet[] {
  if (resolved.kind === 'full_text') {
    const preview = resolved.text.slice(0, 2_000)
    return [{
      source: resolved.snippetSource,
      url: resolved.url,
      text: preview + (resolved.text.length > 2_000 ? '…' : '')
    }]
  }
  if (resolved.kind === 'abstract_only') {
    return [
      {
        source: 'abstract',
        url: resolved.url,
        text: resolved.abstract.slice(0, 2_000) + (resolved.abstract.length > 2_000 ? '…' : '')
      },
      {
        source: 'abstract',
        text: 'Note: full text was not available via OA routes; passage check is limited to abstract/metadata.'
      }
    ]
  }
  return []
}

function groundingEvidenceFromSite(site: CiteGroundingSite, resolved: ResolvedL3Source): EvidenceSnippet[] {
  const source: EvidenceSnippet['source'] =
    resolved.kind === 'full_text' ? resolved.snippetSource : 'abstract'
  const url = resolved.kind === 'unavailable' ? undefined : resolved.url
  const raw = site.llmRawResponse ?? ''
  if (site.claimGrounding?.length) {
    return evidenceFromGroundingParse({ source, url }, raw.slice(0, 600), site.claimGrounding)
  }
  if ((site.llmParseWarning || raw) && raw.length + (site.llmParseWarning?.length ?? 0) > 0) {
    return [{
      source,
      url,
      text: `LLM (${site.llmParseWarning ?? 'unparsed'}): ${raw.slice(0, 500)}`
    }]
  }
  return []
}

function dedupeEvidence(items: EvidenceSnippet[]): EvidenceSnippet[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = `${item.source}|${item.url ?? ''}|${item.text.slice(0, 220)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
