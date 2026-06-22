import { useCallback, useRef } from 'react'
import { segmentManuscriptText } from '../../engine/manuscript/segments'
import { parseInTextCitations } from '../../engine/manuscript/intext'
import { buildBibEntriesFromReferencesText, mapInTextToBibliography } from '../../engine/manuscript/mapping'
import { alignMetadata, resolveRegistry } from '../../engine/manuscript/verify'
import { referenceIntegrityRiskFromRegistry } from '../../engine/manuscript/integrity-risk'
import {
  buildGroundingUserPrompt,
  evidenceFromGroundingParse,
  GROUNDING_EXCERPT_MAX_CHARS,
  GROUNDING_PASSAGE_MAX_CHARS,
  parseGroundingJson,
  passageVerdictFromGroundingClaims,
  rollupPassageFromSites,
  selectSourceChunksForGrounding,
  syntheticSpanForBodyPreview,
  truncateForGrounding,
  worstDeterministicBucket
} from '../../engine/manuscript/grounding-llm'
import { classifyGreyTags } from '../../engine/audit/grey'
import { checkStructure } from '../../engine/audit/structure'
import { buildChecklistFromText } from '../../engine/audit/checklist'
import type {
  AuditReport,
  CitationFinding,
  CiteGroundingSite,
  ClaimGroundingRow,
  EvidenceSnippet,
  InTextSpan,
  UserAction
} from '../../engine/manuscript/types'
import { useManuscriptAuditStore } from '../stores/manuscript-audit-store'
import { useCitationStore } from '../stores/citation-store'
import { ensureLlmKeyReady } from '../utils/llm-config-utils'
import { scorePassageAgainstSource } from '../../engine/relevance/deterministic'

const MAX_BIB_ENTRIES_FALLBACK = 80
const PASSAGE_PAD = 260
const MAX_LLM_RAW_STORE = 2400
const GROUNDING_LLM_RETRY_ATTEMPTS = 2

function sourcesAttribution(): AuditReport['sources'] {
  return [
    { name: 'Crossref', attribution: 'Metadata via Crossref REST API', url: 'https://api.crossref.org' },
    { name: 'PubMed', attribution: 'Metadata via NCBI E-utilities', url: 'https://eutils.ncbi.nlm.nih.gov' },
    { name: 'OpenAlex', attribution: 'Metadata via OpenAlex API', url: 'https://api.openalex.org' },
    { name: 'Unpaywall', attribution: 'Open access status via Unpaywall', url: 'https://unpaywall.org/products/api' },
    { name: 'Europe PMC', attribution: 'Open access full text via Europe PMC', url: 'https://europepmc.org/RestfulWebService' }
  ]
}

function defaultAction(): UserAction {
  return { kind: 'none' }
}

type CanonicalItem = { DOI?: string; PMCID?: string; abstract?: string; URL?: string; title?: string }

type ResolvedL3Source =
  | {
      kind: 'full_text'
      text: string
      coverage: Extract<CitationFinding['l3Coverage'], 'full_text_oa_europe_pmc' | 'full_text_oa_unpaywall'>
      snippetSource: EvidenceSnippet['source']
      url?: string
    }
  | { kind: 'abstract_only'; abstract: string }
  | { kind: 'pdf_pending'; url: string }
  | { kind: 'unavailable'; reason: string }

export function useManuscriptAudit() {
  const controllerRef = useRef<AbortController | null>(null)
  const setStep = useManuscriptAuditStore((s) => s.setStep)
  const setError = useManuscriptAuditStore((s) => s.setError)
  const setReport = useManuscriptAuditStore((s) => s.setReport)
  const userActionsByBibKey = useManuscriptAuditStore((s) => s.userActionsByBibKey)
  const llmEnabled = useManuscriptAuditStore((s) => s.llmEnabled)
  const llmBaseUrl = useManuscriptAuditStore((s) => s.llmBaseUrl)
  const llmModel = useManuscriptAuditStore((s) => s.llmModel)
  const llmPresetId = useManuscriptAuditStore((s) => s.llmPresetId)
  const unpaywallEmail = useManuscriptAuditStore((s) => s.unpaywallEmail)
  const selectedTemplateId = useManuscriptAuditStore((s) => s.selectedTemplateId)
  const templateStrict = useManuscriptAuditStore((s) => s.templateStrict)
  const templates = useManuscriptAuditStore((s) => s.templates)
  const networkStatus = useCitationStore((s) => s.networkStatus)

  const cancel = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    setStep('idle')
  }, [setStep])

  const runAudit = useCallback(
    async (rawText: string) => {
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller
      setError(null)
      setStep('parsing')

      const seg = segmentManuscriptText(rawText)
      if (!seg.referencesText) {
        setStep('error')
        setError('Could not locate a References/Bibliography section in this text.')
        return
      }

      const inText = parseInTextCitations(seg.bodyText)
      const bib = await buildBibEntriesFromReferencesText(seg.referencesText)

      const mappings = mapInTextToBibliography(inText.citations, bib.entries)
      const usedBibKeys = new Set(mappings.flatMap((m) => m.matchedBibKeys))

      const relevantBibEntries =
        usedBibKeys.size > 0 ? bib.entries.filter((e) => usedBibKeys.has(e.key)) : bib.entries.slice(0, MAX_BIB_ENTRIES_FALLBACK)

      setStep('l1')
      const findings: CitationFinding[] = []

      for (const entry of relevantBibEntries) {
        if (controller.signal.aborted) throw new Error('Cancelled')
        const userItem = entry.item
        const spans: InTextSpan[] =
          usedBibKeys.size > 0
            ? mappings.filter((m) => m.matchedBibKeys.includes(entry.key)).map((m) => ({ start: m.citation.start, end: m.citation.end, raw: m.citation.raw }))
            : []

        if (!userItem) {
          findings.push({
            bibKey: entry.key,
            inTextSpans: spans,
            referenceIntegrityRisk: referenceIntegrityRiskFromRegistry({
              status: 'insufficient_evidence',
              reason: 'Reference entry could not be parsed into structured metadata'
            }),
            layers: {
              registry: { status: 'insufficient_evidence', reason: 'Reference entry could not be parsed into structured metadata' },
              metadata: { status: 'skipped', reason: 'not_applicable' },
              passage: { status: 'skipped', reason: 'not_applicable' }
            },
            l3Coverage: 'unavailable',
            evidence: [{ source: 'abstract', text: entry.raw }],
            greyTags: [],
            userAction: userActionsByBibKey[entry.key] ?? defaultAction()
          })
          continue
        }

        if (networkStatus !== 'online') {
          findings.push({
            bibKey: entry.key,
            inTextSpans: spans,
            resolvedItem: userItem,
            referenceIntegrityRisk: referenceIntegrityRiskFromRegistry({
              status: 'skipped',
              reason: 'offline'
            }),
            layers: {
              registry: { status: 'skipped', reason: 'offline' },
              metadata: { status: 'skipped', reason: 'offline' },
              passage: { status: 'skipped', reason: 'offline' }
            },
            l3Coverage: 'unavailable',
            evidence: [{ source: 'abstract', text: entry.raw }],
            greyTags: classifyGreyTags(userItem),
            userAction: userActionsByBibKey[entry.key] ?? defaultAction()
          })
          continue
        }

        const registry = await resolveRegistry(userItem)
        setStep('l2')
        const meta = registry.canonical ? await alignMetadata(userItem, registry.canonical, registry.source) : { l2: { status: 'skipped', reason: 'not_applicable' as const }, mismatchedFields: [] }

        setStep('oa_fetch')
        const canonical = registry.canonical ?? userItem
        const resolved = await resolveL3Source(canonical, unpaywallEmail)

        const citationSpans = spans.length > 0 ? spans : [syntheticSpanForBodyPreview()]
        setStep('l3')
        const citeSites: CiteGroundingSite[] = []
        const groundingEvidence: EvidenceSnippet[] = []

        for (const span of citationSpans) {
          if (controller.signal.aborted) throw new Error('Cancelled')
          const passageWindow = buildPassageWindow(seg.bodyText, span.start, span.end)
          const site = await evaluateCiteSite(passageWindow, span, resolved, {
            llmEnabled,
            llmBaseUrl,
            llmModel,
            llmPresetId
          })
          citeSites.push(site)
          groundingEvidence.push(...groundingEvidenceFromSite(site, resolved))
        }

        const rollupPassage = rollupPassageFromSites(citeSites)
        const l3Coverage =
          resolved.kind === 'full_text'
            ? resolved.coverage
            : resolved.kind === 'abstract_only'
              ? 'abstract_only_closed'
              : resolved.kind === 'pdf_pending'
                ? 'full_text_oa_unpaywall'
                : 'unavailable'

        const sourceOnce = resolvedSourceSnippets(resolved)

        findings.push({
          bibKey: entry.key,
          inTextSpans: spans,
          resolvedItem: userItem,
          referenceIntegrityRisk: referenceIntegrityRiskFromRegistry(registry.l1),
          layers: {
            registry: registry.l1,
            metadata: meta.l2,
            passage: rollupPassage
          },
          l3Coverage,
          l3Score: worstDeterministicBucket(citeSites),
          citeSites,
          evidence: [
            { source: 'abstract', text: entry.raw },
            ...(registry.canonical?.title
              ? [{ source: (registry.source === 'openalex' ? 'openalex' : registry.source) as EvidenceSnippet['source'], text: registry.canonical.title }]
              : []),
            ...sourceOnce,
            ...dedupeEvidence(groundingEvidence)
          ],
          greyTags: classifyGreyTags(userItem),
          userAction: userActionsByBibKey[entry.key] ?? defaultAction()
        })
      }

      const report: AuditReport = {
        manuscript: {
          wordCount: seg.fullText.split(/\s+/).filter(Boolean).length,
          sourceFormat: 'paste'
        },
        template: (() => {
          const tpl = templates.find((t) => t.id === selectedTemplateId)
          return { id: selectedTemplateId, name: tpl?.name ?? selectedTemplateId, strict: templateStrict }
        })(),
        findings,
        checklist: (() => {
          const tpl = templates.find((t) => t.id === selectedTemplateId)
          if (!tpl) return buildChecklistFromText(seg.fullText)
          const res = checkStructure(seg.fullText, tpl)
          const structurePassed = res.missing.length === 0 && (templateStrict ? res.outOfOrder.length === 0 : true)
          const detail =
            res.missing.length > 0
              ? `Missing: ${res.missing.join(', ')}`
              : res.outOfOrder.length > 0
                ? `Order: ${res.outOfOrder.join('; ')}`
                : undefined
          return buildChecklistFromText(seg.fullText, { structurePassed, structureDetail: detail })
        })(),
        sources: sourcesAttribution(),
        generatedAt: new Date().toISOString(),
        appVersion: '1.0.0',
        networkStatus
      }

      setReport(report)
      setStep('done')
      controllerRef.current = null
    },
    [llmBaseUrl, llmEnabled, llmModel, llmPresetId, networkStatus, selectedTemplateId, setError, setReport, setStep, templateStrict, templates, unpaywallEmail, userActionsByBibKey]
  )

  return { runAudit, cancel }
}

function buildPassageWindow(bodyText: string, start: number, end: number): string {
  const s = Math.max(0, start - PASSAGE_PAD)
  const e = Math.min(bodyText.length, end + PASSAGE_PAD)
  return bodyText.slice(s, e)
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

async function resolveL3Source(canonical: CanonicalItem, unpaywallEmailRaw: string): Promise<ResolvedL3Source> {
  if (!window.api) {
    return { kind: 'unavailable', reason: 'OA checks unavailable (missing preload API)' }
  }

  if (canonical.PMCID) {
    try {
      const res = await window.api.europePmcJatsByPmcid(canonical.PMCID)
      const fullText = stripXmlOrHtmlToText(res.jatsXml)
      return { kind: 'full_text', text: fullText, coverage: 'full_text_oa_europe_pmc', snippetSource: 'europe_pmc', url: res.url }
    } catch {
      /* fall through */
    }
  }

  if (canonical.DOI) {
    try {
      const email = unpaywallEmailRaw?.trim() || undefined
      if (!email) throw new Error('Unpaywall email not set')
      const up = (await window.api.unpaywall(canonical.DOI, email)) as {
        is_oa?: boolean
        best_oa_location?: { url?: string | null; url_for_pdf?: string | null; url_for_landing_page?: string | null } | null
      }
      const bestUrl = up.best_oa_location?.url ?? up.best_oa_location?.url_for_pdf ?? up.best_oa_location?.url_for_landing_page
      if (up.is_oa && bestUrl) {
        const fetched = await window.api.fetchOaUrl(bestUrl)
        if ((fetched as { blocked?: boolean }).blocked) {
          throw new Error(`OA URL blocked by publisher (${(fetched as { status?: number }).status ?? 'unknown'})`)
        }
        if (fetched.kind === 'pdf') {
          return { kind: 'pdf_pending', url: bestUrl }
        }
        const rawText = fetched.text ?? ''
        const fullText = stripXmlOrHtmlToText(rawText)
        return { kind: 'full_text', text: fullText, coverage: 'full_text_oa_unpaywall', snippetSource: 'unpaywall', url: bestUrl }
      }
    } catch {
      /* fall through */
    }
  }

  if (canonical.abstract?.trim()) {
    return { kind: 'abstract_only', abstract: canonical.abstract }
  }

  return { kind: 'unavailable', reason: 'No OA full text and no abstract available' }
}

async function evaluateCiteSite(
  passage: string,
  span: InTextSpan,
  resolved: ResolvedL3Source,
  llm: { llmEnabled: boolean; llmBaseUrl: string; llmModel: string; llmPresetId: string }
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

  if (resolved.kind === 'pdf_pending') {
    return {
      inTextSpan: span,
      passageWindow: passage,
      deterministicScore: 0,
      deterministicBucket: 'low',
      matchedTermsSample: [],
      passageVerdict: { status: 'insufficient_evidence', reason: 'OA PDF retrieved but PDF-to-text grounding is not enabled yet' }
    }
  }

  const sourceText = resolved.kind === 'full_text' ? resolved.text : resolved.abstract
  const scored = scorePassageAgainstSource(passage, sourceText)
  const snippetSource: EvidenceSnippet['source'] = resolved.kind === 'full_text' ? resolved.snippetSource : 'abstract'
  const metaUrl = resolved.kind === 'full_text' ? resolved.url : undefined

  if (resolved.kind === 'abstract_only') {
    const excerpt = selectSourceChunksForGrounding(passage, sourceText, GROUNDING_EXCERPT_MAX_CHARS)
    const llmOutcome = await runGroundingLlm(passage, excerpt, { source: snippetSource, url: metaUrl, label: 'abstract' }, llm)
    if (llmOutcome.kind === 'parsed') {
      return {
        inTextSpan: span,
        passageWindow: passage,
        deterministicScore: scored.score,
        deterministicBucket: scored.bucket === 'high' ? 'medium' : scored.bucket,
        matchedTermsSample: scored.matchedTerms.slice(0, 12),
        passageVerdict: llmOutcome.verdict,
        claimGrounding: llmOutcome.claims,
        llmParseWarning: llmOutcome.parseWarning,
        llmRawResponse: storeLlmSlice(llmOutcome.raw)
      }
    }
    if (llmOutcome.kind === 'encryption_blocked') {
      return {
        inTextSpan: span,
        passageWindow: passage,
        deterministicScore: scored.score,
        deterministicBucket: scored.bucket === 'high' ? 'medium' : scored.bucket,
        matchedTermsSample: scored.matchedTerms.slice(0, 12),
        passageVerdict: { status: 'warn', reasons: ['LLM disabled: safeStorage encryption unavailable on this system'] }
      }
    }
    if (llmOutcome.kind === 'llm_error') {
      return {
        inTextSpan: span,
        passageWindow: passage,
        deterministicScore: scored.score,
        deterministicBucket: scored.bucket === 'high' ? 'medium' : scored.bucket,
        matchedTermsSample: scored.matchedTerms.slice(0, 12),
        passageVerdict: { status: 'warn', reasons: [llmOutcome.message] }
      }
    }

    const baseVerdict: CiteGroundingSite['passageVerdict'] =
      llmOutcome.kind === 'parse_fail'
        ? scored.bucket === 'low'
          ? { status: 'warn', reasons: ['LLM output not parseable; weak overlap with abstract', llmOutcome.hint].filter(Boolean) as string[] }
          : { status: 'skipped', reason: 'closed_access' }
        : { status: 'skipped', reason: 'closed_access' }

    return {
      inTextSpan: span,
      passageWindow: passage,
      deterministicScore: scored.score,
      deterministicBucket: scored.bucket === 'high' ? 'medium' : scored.bucket,
      matchedTermsSample: scored.matchedTerms.slice(0, 12),
      passageVerdict: baseVerdict,
      llmParseWarning: llmOutcome.kind === 'parse_fail' ? llmOutcome.hint : undefined,
      llmRawResponse: llmOutcome.kind === 'parse_fail' ? storeLlmSlice(llmOutcome.raw) : undefined
    }
  }

  const excerpt = selectSourceChunksForGrounding(passage, sourceText, GROUNDING_EXCERPT_MAX_CHARS)
  const label = resolved.kind === 'full_text' ? resolved.coverage.replace(/_/g, ' ') : 'source'
  const llmOutcome = await runGroundingLlm(passage, excerpt, { source: snippetSource, url: metaUrl, label }, llm)

  if (llmOutcome.kind === 'parsed') {
    return {
      inTextSpan: span,
      passageWindow: passage,
      deterministicScore: scored.score,
      deterministicBucket: scored.bucket,
      matchedTermsSample: scored.matchedTerms.slice(0, 12),
      passageVerdict: llmOutcome.verdict,
      claimGrounding: llmOutcome.claims,
      llmParseWarning: llmOutcome.parseWarning,
      llmRawResponse: storeLlmSlice(llmOutcome.raw)
    }
  }
  if (llmOutcome.kind === 'encryption_blocked') {
    return {
      inTextSpan: span,
      passageWindow: passage,
      deterministicScore: scored.score,
      deterministicBucket: scored.bucket,
      matchedTermsSample: scored.matchedTerms.slice(0, 12),
      passageVerdict: { status: 'warn', reasons: ['LLM disabled: safeStorage encryption unavailable on this system'] }
    }
  }
  if (llmOutcome.kind === 'llm_error') {
    return {
      inTextSpan: span,
      passageWindow: passage,
      deterministicScore: scored.score,
      deterministicBucket: scored.bucket,
      matchedTermsSample: scored.matchedTerms.slice(0, 12),
      passageVerdict: { status: 'warn', reasons: [llmOutcome.message] }
    }
  }
  if (llmOutcome.kind === 'parse_fail') {
    return {
      inTextSpan: span,
      passageWindow: passage,
      deterministicScore: scored.score,
      deterministicBucket: scored.bucket,
      matchedTermsSample: scored.matchedTerms.slice(0, 12),
      passageVerdict:
        scored.bucket === 'low'
          ? { status: 'warn', reasons: ['LLM output not parseable; weak passage alignment against OA full text', llmOutcome.hint].filter(Boolean) as string[] }
          : { status: 'pass' },
      llmParseWarning: llmOutcome.hint,
      llmRawResponse: storeLlmSlice(llmOutcome.raw)
    }
  }

  return {
    inTextSpan: span,
    passageWindow: passage,
    deterministicScore: scored.score,
    deterministicBucket: scored.bucket,
    matchedTermsSample: scored.matchedTerms.slice(0, 12),
    passageVerdict: scored.bucket === 'low' ? { status: 'warn', reasons: ['Weak passage alignment against OA full text'] } : { status: 'pass' }
  }
}

type LlmGroundingMeta = { source: EvidenceSnippet['source']; url?: string; label: string }

type GroundingLlmResult =
  | { kind: 'disabled' }
  | { kind: 'encryption_blocked' }
  | { kind: 'parse_fail'; raw: string; hint: string }
  | { kind: 'llm_error'; message: string }
  | { kind: 'parsed'; verdict: CiteGroundingSite['passageVerdict']; claims: ClaimGroundingRow[]; raw: string; parseWarning?: string }

async function runGroundingLlm(
  passage: string,
  sourceExcerpt: string,
  meta: LlmGroundingMeta,
  llm: { llmEnabled: boolean; llmBaseUrl: string; llmModel: string; llmPresetId: string }
): Promise<GroundingLlmResult> {
  if (!llm.llmEnabled || !window.api) return { kind: 'disabled' }

  const encryption = await window.api.isEncryptionAvailable().catch(() => false)
  if (!encryption) return { kind: 'encryption_blocked' }

  try {
    await ensureLlmKeyReady(llm.llmPresetId, llm.llmBaseUrl)
  } catch (e) {
    return { kind: 'llm_error', message: e instanceof Error ? e.message : String(e) }
  }

  const cappedPassage = truncateForGrounding(passage, GROUNDING_PASSAGE_MAX_CHARS)
  const cappedExcerpt = truncateForGrounding(sourceExcerpt, GROUNDING_EXCERPT_MAX_CHARS)

  let lastRaw = ''
  let lastParseError = 'Invalid JSON from model'

  try {
    for (let attempt = 0; attempt < GROUNDING_LLM_RETRY_ATTEMPTS; attempt++) {
      const content = await window.api.llmChat(
        { baseUrl: llm.llmBaseUrl, model: llm.llmModel },
        [
          {
            role: 'user',
            content: buildGroundingUserPrompt(cappedPassage, cappedExcerpt, { label: meta.label, url: meta.url })
          }
        ]
      )
      lastRaw = content
      const parsed = parseGroundingJson(content)
      if (!parsed.ok) {
        lastParseError = parsed.error
        continue
      }

      const scored = scorePassageAgainstSource(passage, sourceExcerpt)
      let verdict = passageVerdictFromGroundingClaims(parsed.data.claims, scored.bucket, cappedExcerpt)

      const warnings: string[] = []
      if (parsed.repaired) warnings.push('LLM JSON was auto-repaired before parsing.')
      if (attempt > 0) warnings.push('Recovered on a second LLM attempt.')

      if (parsed.data.overallVerdict === 'unrelated') {
        if (verdict.status === 'pass') {
          verdict = {
            status: 'warn',
            reasons: [`Model flagged unrelated overall: ${(parsed.data.overallRationale ?? []).join('; ') || '(no rationale)'}`]
          }
        } else if (verdict.status === 'warn') {
          warnings.push(`Model overall unrelated — ${(parsed.data.overallRationale ?? []).join('; ')}`)
        }
      } else if (parsed.data.overallVerdict === 'weak' && verdict.status === 'pass') {
        verdict = {
          status: 'warn',
          reasons: [`Model overall weak: ${(parsed.data.overallRationale ?? []).join('; ') || 'verify manually'}`]
        }
      }

      const parseWarning = warnings.length > 0 ? warnings.join(' ') : undefined
      return { kind: 'parsed', verdict, claims: parsed.data.claims, raw: content, parseWarning }
    }

    return { kind: 'parse_fail', raw: lastRaw, hint: lastParseError }
  } catch (e) {
    return { kind: 'llm_error', message: `LLM check failed: ${(e as Error).message}` }
  }
}

function resolvedSourceSnippets(resolved: ResolvedL3Source): EvidenceSnippet[] {
  if (resolved.kind === 'full_text') {
    const preview = resolved.text.slice(0, 400)
    return [{ source: resolved.snippetSource, url: resolved.url, text: preview + (resolved.text.length > 400 ? '…' : '') }]
  }
  if (resolved.kind === 'abstract_only') {
    return [
      { source: 'abstract', text: resolved.abstract.slice(0, 500) },
      { source: 'abstract', text: 'Note: full text was not available via OA routes; passage check is limited to abstract/metadata.' }
    ]
  }
  return []
}

function groundingEvidenceFromSite(site: CiteGroundingSite, resolved: ResolvedL3Source): EvidenceSnippet[] {
  const metaSource: EvidenceSnippet['source'] = resolved.kind === 'full_text' ? resolved.snippetSource : 'abstract'
  const url = resolved.kind === 'full_text' ? resolved.url : undefined
  const rawSnippet = site.llmRawResponse ?? ''

  if (site.claimGrounding?.length) {
    return evidenceFromGroundingParse({ source: metaSource, url }, rawSnippet.slice(0, 600), site.claimGrounding)
  }
  if ((site.llmParseWarning || site.llmRawResponse) && rawSnippet.length + (site.llmParseWarning?.length ?? 0) > 0) {
    return [
      {
        source: metaSource,
        url,
        text: `LLM (${site.llmParseWarning ?? 'unparsed'}): ${rawSnippet.slice(0, 500)}`
      }
    ]
  }
  return []
}

function dedupeEvidence(items: EvidenceSnippet[]): EvidenceSnippet[] {
  const seen = new Set<string>()
  const out: EvidenceSnippet[] = []
  for (const e of items) {
    const key = `${e.source}|${e.url ?? ''}|${e.text.slice(0, 220)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(e)
  }
  return out
}
