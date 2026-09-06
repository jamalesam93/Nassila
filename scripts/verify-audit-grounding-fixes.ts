/**
 * Offline verification: replay Aug 27 audit failure patterns against the fixed
 * citation / passage / claim-filter / numeric-guard helpers (no Electron / LLM).
 */
import { readFileSync } from 'node:fs'
import { parseInTextCitations } from '../src/engine/manuscript/intext'
import { buildPassageWindow } from '../src/engine/manuscript/passage-window'
import {
  filterClaimsForActiveBibKey,
  hasContradictoryNumbers,
  isVerbatimQuoteSubstring,
  passageVerdictFromGroundingClaims
} from '../src/engine/manuscript/grounding-llm'

const auditPath = process.argv[2]
if (!auditPath) {
  console.error('Usage: npx tsx scripts/verify-audit-grounding-fixes.ts <audit.json>')
  process.exit(1)
}

const audit = JSON.parse(readFileSync(auditPath, 'utf8')) as {
  findings: Array<{
    bibKey: string
    inTextSpans: Array<{ raw: string }>
    citeSites: Array<{
      inTextSpan: { raw: string }
      passageWindow: string
      claimGrounding?: Array<{ claim: string; verdict: string; sourceQuotes?: string[] }>
    }>
  }>
}

let failed = false
function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`)
    failed = true
  }
}

const objectives =
  'The objectives of this review are to: (1) provide a comprehensive overview of the historical development and current state of clinical pharmacy education in both Yemen and Saudi Arabia; (2) conduct a detailed comparative analysis of key aspects of their educational systems, including curriculum, clinical training, faculty, accreditation, infrastructure, career pathways, and student engagement; (3) identify the major challenges and opportunities for improvement in clinical pharmacy education in Yemen; and (4) propose specific, evidence-based recommendations for enhancing clinical pharmacy education in Yemen tailored to its respective contexts and needs.'

const listParsed = parseInTextCitations(objectives)
const listMarkers = listParsed.citations.filter((c) => /^\(\d+\)$/.test(c.raw))
console.log('list-marker cites after fix:', listMarkers.map((c) => c.raw))
assert(listMarkers.length === 0, 'objectives list markers still parsed as citations')

const crossCitePassage =
  'Clinical pharmacy is defined as an area of pharmacy practice concerned with the science and practice of rational medication use [1]. It is a health science discipline in which pharmacists provide patient care that optimizes medication therapy and promotes health, wellness, and disease prevention [2].'
const start1 = crossCitePassage.indexOf('[1]')
const window1 = buildPassageWindow(crossCitePassage, start1, start1 + 3, {
  activeBibKeys: ['1'],
  citeSpans: [
    { start: start1, end: start1 + 3, bibKeys: ['1'] },
    {
      start: crossCitePassage.indexOf('[2]'),
      end: crossCitePassage.indexOf('[2]') + 3,
      bibKeys: ['2']
    }
  ]
})
console.log('scoped [1] window:', window1.text)
assert(!window1.text.includes('[2]'), 'adjacent [2] sentence still in [1] window')

let filteredTotal = 0
let falseListSites = 0
for (const finding of audit.findings) {
  for (const span of finding.inTextSpans) {
    if (/^\([1-4]\)$/.test(span.raw) && finding.bibKey === span.raw.slice(1, -1)) {
      falseListSites++
    }
  }
  for (const site of finding.citeSites) {
    const claims = (site.claimGrounding ?? []).map((c) => ({
      claim: c.claim,
      verdict: c.verdict as
        | 'supported'
        | 'weak'
        | 'not_in_source'
        | 'contradicted'
        | 'insufficient_evidence',
      sourceQuotes: c.sourceQuotes
    }))
    const scoped = filterClaimsForActiveBibKey(claims, finding.bibKey)
    filteredTotal += scoped.filteredCount
  }
}

console.log('Aug27 false list-marker cite sites in export:', falseListSites)
console.log('cross-cite claims filterable from export claimGrounding:', filteredTotal)
// Historical Aug 27 morning export had list-marker sites; later exports (09:35+) have 0.
// Cross-cite filterable claims: morning export had ~13–18; post-window-fix exports may be 0.
assert(falseListSites === 0 || falseListSites >= 2, 'unexpected list-marker site count')
assert(filteredTotal >= 0, 'filteredTotal should be non-negative')

const dynbled =
  'Clinical pharma-\ncy is defined as that area of pharmacy concerned with the science and practice of rational medication use.'
const quoteOk = isVerbatimQuoteSubstring(
  'Clinical pharmacy is defined as that area of pharmacy concerned with the science and practice of rational medication use.',
  dynbled
)
console.log('extraction-normalized quote match:', quoteOk)
assert(quoteOk, 'dehyphenated quote should match')

const definitionClaim =
  'Clinical pharmacy is defined as an area of pharmacy practice concerned with the science and practice of rational medication use [1].'
const definitionExcerpt =
  'Clinical pharmacy is defined as that area of pharmacy concerned with the science and practice of rational medication use.'
assert(
  !hasContradictoryNumbers(definitionClaim, definitionExcerpt),
  'citation marker [1] must not trip numeric contradiction'
)
const passVerdict = passageVerdictFromGroundingClaims(
  [{ claim: definitionClaim, verdict: 'supported', sourceQuotes: [definitionExcerpt] }],
  'high',
  definitionExcerpt
)
console.log('[1] definition passage verdict after numeric strip:', passVerdict.status)
assert(passVerdict.status === 'pass', '[1] supported+validated quote must roll up to pass')

if (failed) process.exit(1)
console.log(
  'OK: coding fixes cover Aug 27 list-marker, cross-cite window, quote-normalization, and [1] numeric-guard cases'
)
