import type { CslItem, NetworkStatus } from '../types'

export type AuthenticityLayer = 'registry' | 'metadata' | 'passage'

export type LayerVerdict =
  | { status: 'pass' }
  | { status: 'warn'; reasons: string[] }
  | { status: 'fail'; reasons: string[] }
  | { status: 'insufficient_evidence'; reason: string }
  | { status: 'skipped'; reason: 'offline' | 'closed_access' | 'not_applicable' | 'llm_disabled' }

export type L3Coverage =
  | 'full_text_oa_europe_pmc'
  | 'full_text_oa_unpaywall'
  | 'full_text_attached_pdf'
  | 'abstract_only_closed'
  | 'unavailable'

export type GreyTag = 'preprint' | 'thesis' | 'report' | 'webpage' | 'post' | 'other'

export type ReferenceIntegrityRisk =
  | 'high_unverified'
  | 'manual_review'
  | 'locator_ok'
  | 'skipped'

export type UserAction =
  | { kind: 'none' }
  | { kind: 'acknowledged'; note?: string }
  | { kind: 'ignored_for_session' }
  | { kind: 'accepted_override'; note: string }

export type EvidenceSource =
  | 'crossref'
  | 'datacite'
  | 'pubmed'
  | 'openalex'
  | 'europe_pmc'
  | 'unpaywall'
  | 'local_pdf'
  | 'abstract'

export interface EvidenceSnippet {
  source: EvidenceSource
  url?: string
  text: string
}

export interface InTextSpan {
  start: number
  end: number
  raw: string
  locator?: string
}

export interface AmbiguityInfo {
  candidates: string[]
  reason: string
}

/** Per-claim support relative to retrieved source excerpt (optional LLM). */
export type ClaimSupportVerdict = 'supported' | 'weak' | 'contradicted' | 'not_in_source' | 'insufficient_evidence'

export type QuoteValidationStatus = 'found' | 'not_found' | 'not_applicable'

export interface QuoteValidationState {
  status: QuoteValidationStatus
  checkedQuotes: number
  matchedQuotes: number
}

export interface ClaimGroundingRow {
  claim: string
  verdict: ClaimSupportVerdict
  hasNumericClaim?: boolean
  sourceQuotes?: string[]
  /** Verbatim quote presence only; this does not establish that the claim is true. */
  quoteValidation?: QuoteValidationState
  rationale?: string[]
}

/**
 * Single in-text citation location: passage window vs source text (deterministic overlap + optional LLM claims).
 */
export interface CiteGroundingSite {
  inTextSpan: InTextSpan
  passageWindow: string
  deterministicScore: number
  deterministicBucket: 'low' | 'medium' | 'high'
  matchedTermsSample: string[]
  passageVerdict: LayerVerdict
  /** Structured LLM output when grounding ran and parsed successfully */
  claimGrounding?: ClaimGroundingRow[]
  /** When JSON parse fails but the model responded */
  llmParseWarning?: string
  /** Truncated raw LLM output when grounding was attempted */
  llmRawResponse?: string
  /** Chunk-selected excerpt from the cited source sent to grounding */
  sourceExcerpt?: string
  sourceExcerptSource?: EvidenceSnippet['source']
  sourceExcerptUrl?: string
  sourceExcerptLabel?: string
  sourceRetrievedAt?: string
  sourceExtractionTier?: 'jats_xml' | 'html_text' | 'pdf_embedded_text' | 'pdf_ocr' | 'registry_abstract'
  sourceHash?: string
  sourcePageHint?: string
  sourceSectionHint?: string
}

export interface CitationFinding {
  bibKey: string
  inTextSpans: InTextSpan[]
  resolvedItem?: CslItem
  /** Derived from registry (L1) layer for UX emphasis; not statistical proof of fabrication. */
  referenceIntegrityRisk: ReferenceIntegrityRisk
  layers: Record<AuthenticityLayer, LayerVerdict>
  l3Coverage: L3Coverage
  /** Worst deterministic bucket among citation sites */
  l3Score?: 'low' | 'medium' | 'high'
  /**
   * One row per distinct in-text cite of this bibliography key.
   * Omitted only for early-exit findings (parse/offline errors).
   */
  citeSites?: CiteGroundingSite[]
  evidence: EvidenceSnippet[]
  greyTags: GreyTag[]
  ambiguity?: AmbiguityInfo
  userAction: UserAction
}

export interface ChecklistItem {
  id: string
  label: string
  kind: 'automated' | 'manual'
  severity: 'info' | 'warning' | 'error'
  passed: boolean
  detail?: string
}

export interface AuditTemplateRef {
  id: string
  name: string
  strict: boolean
}

export interface AuditReportSources {
  name: string
  attribution: string
  url: string
}

export interface AuditManuscriptInfo {
  title?: string
  wordCount: number
  sourceFormat: 'docx' | 'pdf' | 'paste'
}

export interface AuditGroundingInfo {
  enabled: boolean
  modelId: string
  checkpoint: string
  runner: string
}

export interface AuditRunProvenance {
  generatedAt: string
  appVersion: string
  promptContractVersion: string
  bibKeyFilter?: string
}

export interface AuditReport {
  manuscript: AuditManuscriptInfo
  template: AuditTemplateRef
  grounding: AuditGroundingInfo
  citationMapping: {
    matched: number
    ambiguous: number
    unmatched: number
  }
  findings: CitationFinding[]
  checklist: ChecklistItem[]
  sources: AuditReportSources[]
  generatedAt: string
  appVersion: string
  promptContractVersion: string
  networkStatus: NetworkStatus
  /** Prior report runs retained when a single source is re-audited in place. */
  priorRuns?: AuditRunProvenance[]
}

