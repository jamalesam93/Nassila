import { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { segmentManuscriptText } from '../../engine/manuscript/segments'
import { parseInTextCitations } from '../../engine/manuscript/intext'
import { buildBibEntriesFromReferencesText, mapInTextToBibliography } from '../../engine/manuscript/mapping'
import { bibEntriesFromCitationLibrary } from '../../engine/manuscript/bibliography-bridge'
import { alignMetadata, bibliographySupportsRegistryTitle, resolveRegistry } from '../../engine/manuscript/verify'
import { referenceIntegrityRiskFromRegistry } from '../../engine/manuscript/integrity-risk'
import {
  buildGroundingLlmMessages,
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
import { fullTextFromOaPdfBytes } from '../../engine/manuscript/oa-pdf-grounding'
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
import i18n from '../i18n/config'
import { ensureLlmKeyReady } from '../utils/llm-config-utils'
import {
  groundingCheckFailed,
  groundingEvidenceSnippet,
  groundingInvalidJsonHint,
  groundingModelUnrelatedReason,
  groundingModelWeakReason,
  groundingOverallUnrelatedNotice,
  groundingRepairedNotice,
  groundingRetryNotice,
  groundingWeakPassageReason,
  joinGroundingParseWarnings
} from '../utils/grounding-i18n'
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
  const { t } = useTranslation()
  const controllerRef = useRef<AbortController | null>(null)
  const setStep = useManuscriptAuditStore((s) => s.setStep)
  const setError = useManuscriptAuditStore((s) => s.setError)
  const setReport = useManuscriptAuditStore((s) => s.setReport)
  const beginIncrementalAudit = useManuscriptAuditStore((s) => s.beginIncrementalAudit)
  const appendFinding = useManuscriptAuditStore((s) => s.appendFinding)
  const clearAuditProgress = useManuscriptAuditStore((s) => s.clearAuditProgress)
  const userActionsByBibKey = useManuscriptAuditStore((s) => s.userActionsByBibKey)
  const llmEnabled = useManuscriptAuditStore((s) => s.llmEnabled)
  const llmBaseUrl = useManuscriptAuditStore((s) => s.llmBaseUrl)
  const llmModel = useManuscriptAuditStore((s) => s.llmModel)
  const llmPresetId = useManuscriptAuditStore((s) => s.llmPresetId)
  const unpaywallEmail = useManuscriptAuditStore((s) => s.unpaywallEmail)
  const auditReferenceSource = useManuscriptAuditStore((s) => s.auditReferenceSource)
  const selectedTemplateId = useManuscriptAuditStore((s) => s.selectedTemplateId)
  const templateStrict = useManuscriptAuditStore((s) => s.templateStrict)
  const templates = useManuscriptAuditStore((s) => s.templates)
  const networkStatus = useCitationStore((s) => s.networkStatus)

  const cancel = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    clearAuditProgress()
    setStep('idle')
  }, [clearAuditProgress, setStep])

  const runAudit = useCallback(
    async (rawText: string) => {
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller
      setError(null)
      setReport(null)
      clearAuditProgress()
      setStep('parsing')

      const appVersion = (await window.api?.getAppAbout().catch(() => null))?.version ?? 'unknown'

      const seg = segmentManuscriptText(rawText)
      const useBibliography = auditReferenceSource === 'bibliography'
      const libraryCitations = useCitationStore.getState().citations

      if (!useBibliography && !seg.referencesText) {
        setStep('error')
        setError(t('loop.error.noReferencesSection'))
        return
      }

      if (useBibliography && libraryCitations.length === 0) {
        setStep('error')
        setError(t('loop.error.bibliographyEmpty'))
        return
      }

      const inText = parseInTextCitations(seg.bodyText)
      if (useBibliography && inText.citations.length === 0) {
        setStep('error')
        setError(t('loop.error.noInTextCites'))
        return
      }

      const bib = useBibliography
        ? { entries: bibEntriesFromCitationLibrary(libraryCitations), errors: [] as string[] }
        : await buildBibEntriesFromReferencesText(seg.referencesText!)

      const mappings = mapInTextToBibliography(inText.citations, bib.entries)
      const usedBibKeys = new Set(mappings.flatMap((m) => m.matchedBibKeys))

      const relevantBibEntries =
        usedBibKeys.size > 0 ? bib.entries.filter((e) => usedBibKeys.has(e.key)) : bib.entries.slice(0, MAX_BIB_ENTRIES_FALLBACK)

      const tpl = templates.find((t) => t.id === selectedTemplateId)
      beginIncrementalAudit({
        total: relevantBibEntries.length,
        shell: {
          manuscript: {
            wordCount: seg.fullText.split(/\s+/).filter(Boolean).length,
            sourceFormat: 'paste'
          },
          template: { id: selectedTemplateId, name: tpl?.name ?? selectedTemplateId, strict: templateStrict },
          checklist: [],
          sources: sourcesAttribution(),
          appVersion,
          networkStatus
        }
      })

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
          const finding: CitationFinding = {
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
          }
          findings.push(finding)
          appendFinding(finding)
          continue
        }

        if (networkStatus !== 'online') {
          const finding: CitationFinding = {
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
          }
          findings.push(finding)
          appendFinding(finding)
          continue
        }

        setStep('l1')
        const registry = await resolveRegistry(userItem)
        setStep('l2')
        let meta = registry.canonical ? await alignMetadata(userItem, registry.canonical, registry.source) : { l2: { status: 'skipped', reason: 'not_applicable' as const }, mismatchedFields: [] }

        const doiTitleConflict =
          Boolean(userItem.DOI?.trim()) &&
          Boolean(registry.canonical?.title?.trim()) &&
          !bibliographySupportsRegistryTitle(entry.raw, registry.canonical!.title)

        if (doiTitleConflict) {
          meta = {
            l2: {
              status: 'fail',
              reasons: ['Bibliography line title does not match the registry record for this DOI. Verify the DOI or title.']
            },
            mismatchedFields: ['title']
          }
        }

        setStep('oa_fetch')
        const canonical = registry.canonical ?? userItem
        const resolved = doiTitleConflict
          ? { kind: 'unavailable' as const, reason: 'Bibliography title does not match registry record for this DOI' }
          : await resolveL3Source(canonical, unpaywallEmail)

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

        const finding: CitationFinding = {
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
        }
        findings.push(finding)
        appendFinding(finding)
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
        appVersion: appVersion,
        networkStatus
      }

      setReport(report)
      setStep('done')
      controllerRef.current = null
    },
    [appendFinding, auditReferenceSource, beginIncrementalAudit, clearAuditProgress, llmBaseUrl, llmEnabled, llmModel, llmPresetId, networkStatus, selectedTemplateId, setError, setReport, setStep, t, templateStrict, templates, unpaywallEmail, userActionsByBibKey]
  )

  return { runAudit, cancel }
}

function buildPassageWindow(bodyText: string, start: number, end: number): string {
  const s = Math.max(0, start - PASSAGE_PAD)
  const e = Math.min(bodyText.length, end + PASSAGE_PAD)
  return bodyText.slice(s, e)
}

function sourceExcerptFields(
  excerpt: string,
  source: EvidenceSnippet['source'],
  label: string,
  url?: string
): Pick<CiteGroundingSite, 'sourceExcerpt' | 'sourceExcerptSource' | 'sourceExcerptUrl' | 'sourceExcerptLabel'> {
  return {
    sourceExcerpt: excerpt,
    sourceExcerptSource: source,
    sourceExcerptUrl: url,
    sourceExcerptLabel: label
  }
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
      const loc = up.best_oa_location
      const candidateUrls = [
        loc?.url_for_pdf,
        loc?.url,
        loc?.url_for_landing_page
      ].filter((u): u is string => typeof u === 'string' && u.trim().length > 0)

      if (up.is_oa && candidateUrls.length > 0) {
        for (const candidateUrl of candidateUrls) {
          const fetched = await window.api.fetchOaUrl(candidateUrl)
          if ((fetched as { blocked?: boolean }).blocked) continue
          if (fetched.kind === 'pdf') {
            const pdfBytes = fetched.pdfBytes
            if (!pdfBytes?.byteLength) continue
            try {
              const fromPdf = await fullTextFromOaPdfBytes(pdfBytes, candidateUrl)
              if (fromPdf) return fromPdf
            } catch {
              /* try next OA candidate */
            }
            continue
          }
          const rawText = fetched.text ?? ''
          if (!rawText.trim()) continue
          const fullText = stripXmlOrHtmlToText(rawText)
          return { kind: 'full_text', text: fullText, coverage: 'full_text_oa_unpaywall', snippetSource: 'unpaywall', url: candidateUrl }
        }
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
    const excerptMeta = sourceExcerptFields(excerpt, snippetSource, 'abstract', metaUrl)
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
        llmRawResponse: storeLlmSlice(llmOutcome.raw),
        ...excerptMeta
      }
    }
    if (llmOutcome.kind === 'encryption_blocked') {
      return {
        inTextSpan: span,
        passageWindow: passage,
        deterministicScore: scored.score,
        deterministicBucket: scored.bucket === 'high' ? 'medium' : scored.bucket,
        matchedTermsSample: scored.matchedTerms.slice(0, 12),
        passageVerdict: { status: 'warn', reasons: ['LLM disabled: safeStorage encryption unavailable on this system'] },
        ...excerptMeta
      }
    }
    if (llmOutcome.kind === 'llm_error') {
      return {
        inTextSpan: span,
        passageWindow: passage,
        deterministicScore: scored.score,
        deterministicBucket: scored.bucket === 'high' ? 'medium' : scored.bucket,
        matchedTermsSample: scored.matchedTerms.slice(0, 12),
        passageVerdict: { status: 'warn', reasons: [llmOutcome.message] },
        ...excerptMeta
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
      llmRawResponse: llmOutcome.kind === 'parse_fail' ? storeLlmSlice(llmOutcome.raw) : undefined,
      ...excerptMeta
    }
  }

  const excerpt = selectSourceChunksForGrounding(passage, sourceText, GROUNDING_EXCERPT_MAX_CHARS)
  const label = resolved.kind === 'full_text' ? resolved.coverage.replace(/_/g, ' ') : 'source'
  const excerptMeta = sourceExcerptFields(excerpt, snippetSource, label, metaUrl)
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
      llmRawResponse: storeLlmSlice(llmOutcome.raw),
      ...excerptMeta
    }
  }
  if (llmOutcome.kind === 'encryption_blocked') {
    return {
      inTextSpan: span,
      passageWindow: passage,
      deterministicScore: scored.score,
      deterministicBucket: scored.bucket,
      matchedTermsSample: scored.matchedTerms.slice(0, 12),
      passageVerdict: { status: 'warn', reasons: ['LLM disabled: safeStorage encryption unavailable on this system'] },
      ...excerptMeta
    }
  }
  if (llmOutcome.kind === 'llm_error') {
    return {
      inTextSpan: span,
      passageWindow: passage,
      deterministicScore: scored.score,
      deterministicBucket: scored.bucket,
      matchedTermsSample: scored.matchedTerms.slice(0, 12),
      passageVerdict: { status: 'warn', reasons: [llmOutcome.message] },
      ...excerptMeta
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
      llmRawResponse: storeLlmSlice(llmOutcome.raw),
      ...excerptMeta
    }
  }

  return {
    inTextSpan: span,
    passageWindow: passage,
    deterministicScore: scored.score,
    deterministicBucket: scored.bucket,
    matchedTermsSample: scored.matchedTerms.slice(0, 12),
    passageVerdict: scored.bucket === 'low' ? { status: 'warn', reasons: [groundingWeakPassageReason()] } : { status: 'pass' },
    ...excerptMeta
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
    return {
      kind: 'llm_error',
      message: groundingCheckFailed(e instanceof Error ? e.message : String(e))
    }
  }

  const cappedPassage = truncateForGrounding(passage, GROUNDING_PASSAGE_MAX_CHARS)
  const cappedExcerpt = truncateForGrounding(sourceExcerpt, GROUNDING_EXCERPT_MAX_CHARS)

  let lastRaw = ''
  let lastParseError = groundingInvalidJsonHint()

  try {
    for (let attempt = 0; attempt < GROUNDING_LLM_RETRY_ATTEMPTS; attempt++) {
      const content = await window.api.llmChat(
        { baseUrl: llm.llmBaseUrl, model: llm.llmModel },
        buildGroundingLlmMessages(cappedPassage, cappedExcerpt, { label: meta.label, url: meta.url })
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
      if (parsed.repaired) warnings.push(groundingRepairedNotice())
      if (attempt > 0) warnings.push(groundingRetryNotice())

      if (parsed.data.overallVerdict === 'unrelated') {
        if (verdict.status === 'pass') {
          const detail = (parsed.data.overallRationale ?? []).join('; ') || i18n.t('loop.grounding.verifyManually')
          verdict = {
            status: 'warn',
            reasons: [groundingModelUnrelatedReason(detail)]
          }
        } else if (verdict.status === 'warn') {
          const detail = (parsed.data.overallRationale ?? []).join('; ')
          if (detail) warnings.push(groundingOverallUnrelatedNotice(detail))
        }
      } else if (parsed.data.overallVerdict === 'weak' && verdict.status === 'pass') {
        const detail = (parsed.data.overallRationale ?? []).join('; ') || i18n.t('loop.grounding.verifyManually')
        verdict = {
          status: 'warn',
          reasons: [groundingModelWeakReason(detail)]
        }
      }

      const parseWarning = joinGroundingParseWarnings(warnings)
      return { kind: 'parsed', verdict, claims: parsed.data.claims, raw: content, parseWarning }
    }

    return { kind: 'parse_fail', raw: lastRaw, hint: lastParseError }
  } catch (e) {
    return {
      kind: 'llm_error',
      message: groundingCheckFailed((e as Error).message)
    }
  }
}

function resolvedSourceSnippets(resolved: ResolvedL3Source): EvidenceSnippet[] {
  if (resolved.kind === 'full_text') {
    const preview = resolved.text.slice(0, 2000)
    return [{ source: resolved.snippetSource, url: resolved.url, text: preview + (resolved.text.length > 2000 ? '…' : '') }]
  }
  if (resolved.kind === 'abstract_only') {
    return [
      { source: 'abstract', text: resolved.abstract.slice(0, 2000) + (resolved.abstract.length > 2000 ? '…' : '') },
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
        text: groundingEvidenceSnippet(site.llmParseWarning, rawSnippet.slice(0, 500))
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
