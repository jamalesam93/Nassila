import fs from 'node:fs'
import path from 'node:path'
import { extractDeterministicEvidenceFromMarkdown } from '../src/engine/shahid/extract-deterministic'
import { linkEvidenceToCiteSites } from '../src/engine/shahid/link-evidence'
import type { ShahidCiteSiteRef, ShahidEvidence } from '../src/engine/shahid/types'

interface DatasetRecord {
  id: string
  task: string
  version: number
  passage: string
  claim: string
  cite_site: {
    claim_id: string
    bib_key: string
    cite_marker: string
  }
  region: {
    kind: 'table' | 'figure'
    region_id: string
    bbox: number[]
    table_id?: string
    figure_id?: string
  }
  page: number
  caption_or_cells: {
    caption: string
    cells?: Array<{ row: number; col: number; header: string; text: string }>
  }
  source_hash: string
  meta: {
    slice: string
    doi: string
    label: string
    gold_verdict: string
    gold_cells: string[]
    review_state: string
    public_safe: boolean
    product_holdout: string
  }
  output: {
    verdict: string
    evidence: {
      claim_id: string
      cite_site: {
        bib_key: string
        cite_marker: string
      }
      region: {
        kind: string
        region_id: string
        page: number
      }
      caption: string
      cells: Array<{ row: number; col: number; header: string; text: string }>
      quotes: string[]
      extraction_method: string
      confidence: number
      review_state: string
    }
    rationale: string[]
  }
}

interface SliceMetrics {
  total: number
  localized: number
  supportedTotal: number
  fidelityMatches: number
  negativeTotal: number
  falseSupportCount: number
}

export function runShahidEvaluation(datasetPath: string, doclingDir: string) {
  if (!fs.existsSync(datasetPath)) {
    throw new Error(`Dataset not found at ${datasetPath}`)
  }
  if (!fs.existsSync(doclingDir)) {
    throw new Error(`Docling dir not found at ${doclingDir}`)
  }

  const lines = fs.readFileSync(datasetPath, 'utf8').split('\n').filter((l) => l.trim())
  const records: DatasetRecord[] = lines.map((l) => JSON.parse(l))

  const doclingFiles = fs.readdirSync(doclingDir)
  const doiToFile = new Map<string, string>()
  for (const file of doclingFiles) {
    const parts = file.replace(/\.md$/, '').split('_')
    if (parts.length >= 2) {
      const doi = parts.slice(1).join('_').replace(/_/g, '/')
      doiToFile.set(doi.toLowerCase(), path.join(doclingDir, file))
    }
  }

  const sliceMetricsMap = new Map<string, SliceMetrics>()
  const getSliceMetrics = (slice: string): SliceMetrics => {
    let m = sliceMetricsMap.get(slice)
    if (!m) {
      m = { total: 0, localized: 0, supportedTotal: 0, fidelityMatches: 0, negativeTotal: 0, falseSupportCount: 0 }
      sliceMetricsMap.set(slice, m)
    }
    return m
  }

  let totalClaims = 0
  let localizedTotal = 0
  let supportedTotal = 0
  let fidelityMatchesTotal = 0
  let negativeTotal = 0
  let falseSupportTotal = 0
  const uniqueDois = new Set<string>()

  for (const rec of records) {
    totalClaims++
    const slice = rec.meta.slice
    const sm = getSliceMetrics(slice)
    sm.total++

    const doi = rec.meta.doi.toLowerCase()
    uniqueDois.add(doi)

    const mdFile = doiToFile.get(doi)
    if (!mdFile || !fs.existsSync(mdFile)) {
      throw new Error(`Docling markdown not found for DOI: ${doi}`)
    }

    const markdown = fs.readFileSync(mdFile, 'utf8')
    const evidenceList: ShahidEvidence[] = extractDeterministicEvidenceFromMarkdown(markdown, [
      { page: rec.page, start: 0, end: markdown.length }
    ])

    const kind = rec.region.kind
    const isTable = kind === 'table'
    const isFigure = kind === 'figure'
    const targetId = isTable ? rec.region.table_id : rec.region.figure_id
    const targetNum = targetId ? (targetId.match(/\d+/) || [''])[0] : ''

    // Match candidate evidence by region kind and identifier
    const matching = evidenceList.filter((e) => {
      if (isTable && e.regionKind === 'table') {
        if (targetNum && e.caption && e.caption.toLowerCase().includes(`table ${targetNum}`)) return true
        return !targetNum
      }
      if (isFigure && e.regionKind === 'caption') {
        if (targetNum && e.caption && e.caption.toLowerCase().includes('fig') && e.caption.toLowerCase().includes(targetNum)) return true
        return !targetNum
      }
      return false
    })

    const candidates = matching.length > 0 ? matching : evidenceList.filter((e) => e.regionKind === (isTable ? 'table' : 'caption'))

    // Evaluate cite-site linking
    const citeSiteRef: ShahidCiteSiteRef = {
      citeSiteId: rec.cite_site.claim_id,
      pageHint: `p. ${rec.page}`,
      passageWindow: rec.passage,
      claims: [rec.claim]
    }
    const linked = linkEvidenceToCiteSites(candidates, [citeSiteRef])

    const goldVal = rec.meta.gold_cells?.[0] || ''
    const isSupportedGold = rec.output.verdict === 'supported'

    // 1. Localization check:
    // For supported: does candidate evidence locate the target table/figure and contain the target cell/caption token?
    // For negative/trap: does candidate evidence correctly locate the referenced table without falsifying content?
    let isLocalized = false
    if (candidates.length > 0) {
      if (isSupportedGold) {
        for (const c of candidates) {
          if (goldVal && (c.text.includes(goldVal) || (c.caption && c.caption.includes(goldVal)))) {
            isLocalized = true
            break
          }
        }
      } else {
        // Table or figure exists in document
        isLocalized = true
      }
    }

    if (isLocalized) {
      localizedTotal++
      sm.localized++
    }

    // 2. Fidelity check (verbatim cell/quote matching for supported claims):
    if (isSupportedGold) {
      supportedTotal++
      sm.supportedTotal++
      let isFid = false
      for (const c of candidates) {
        if (goldVal && (c.text.includes(goldVal) || (c.caption && c.caption.includes(goldVal)))) {
          isFid = true
          break
        }
      }
      if (isFid) {
        fidelityMatchesTotal++
        sm.fidelityMatches++
      }
    }

    // 3. Proximity trap and negative absent check:
    // Zero-tolerance guardrail: Must NEVER falsely claim support for a negative or proximity trap claim.
    if (!isSupportedGold) {
      negativeTotal++
      sm.negativeTotal++

      // Test whether linking or deterministic extractor produces false support
      let falselySupported = false

      // Check linked review states: strictly needs_review or abstain, never accepted
      for (const l of linked) {
        if (l.reviewState === 'accepted') {
          falselySupported = true
        }
      }

      // Proximity trap specific: check if extractor misattributed adjacent value to wrong column
      if (slice === 'proximity_trap') {
        // The claim alleges: "As reported in Table X, the {h1} for {row_label} was {v2}."
        // We verify that the table's actual cells do not align h1 with v2 for row_label
        const claimMatch = rec.claim.match(/the (.*?) for (.*?) was (.*?)\./)
        if (claimMatch) {
          const [, claimHeader, claimRow, claimVal] = claimMatch
          for (const c of candidates) {
            // Check if any row has claimRow AND claimHeader matching claimVal
            const lines = c.text.split('\n')
            if (lines.length >= 3) {
              const headerCols = lines[0]?.split('|').map((h) => h.trim().toLowerCase()) ?? []
              const hIdx = headerCols.findIndex((h) => h.includes(claimHeader.toLowerCase()))
              if (hIdx >= 0) {
                for (let rIdx = 2; rIdx < lines.length; rIdx++) {
                  const rCols = lines[rIdx]?.split('|').map((col) => col.trim()) ?? []
                  if (rCols[1]?.toLowerCase().includes(claimRow.toLowerCase())) {
                    if (rCols[hIdx] === claimVal) {
                      falselySupported = true
                    }
                  }
                }
              }
            }
          }
        }
      }

      if (falselySupported) {
        falseSupportTotal++
        sm.falseSupportCount++
      }
    }
  }

  const localizationRate = (localizedTotal / totalClaims) * 100
  const fidelityRate = supportedTotal > 0 ? (fidelityMatchesTotal / supportedTotal) * 100 : 100.0
  const falseSupportRate = negativeTotal > 0 ? (falseSupportTotal / negativeTotal) * 100 : 0.0

  return {
    totalClaims,
    uniqueDoisCount: uniqueDois.size,
    localizedTotal,
    localizationRate,
    supportedTotal,
    fidelityMatchesTotal,
    fidelityRate,
    negativeTotal,
    falseSupportTotal,
    falseSupportRate,
    sliceMetrics: Object.fromEntries(sliceMetricsMap.entries())
  }
}

import { fileURLToPath } from 'node:url'

function main() {
  const datasetArg = process.argv[2] || 'E:/Cursor Projects/NassilaT/training/data/shahid_multimodal_holdout_v1.jsonl'
  const doclingDir = 'E:/Cursor Projects/NassilaT/training/cache/oa_fulltext/docling_mds'

  console.log(`Evaluating Shahid deterministic engine on: ${datasetArg}`)
  const results = runShahidEvaluation(datasetArg, doclingDir)

  console.log('\n========================================')
  console.log('SHAHID BENCHMARK SCORECARD')
  console.log('========================================')
  console.log(`Total Claims:            ${results.totalClaims}`)
  console.log(`Distinct DOIs:           ${results.uniqueDoisCount}`)
  console.log(`Localization Rate:       ${results.localizationRate.toFixed(2)}% (${results.localizedTotal}/${results.totalClaims})  [Target: >= 90.0%]`)
  console.log(`Evidence Fidelity Rate:  ${results.fidelityRate.toFixed(2)}% (${results.fidelityMatchesTotal}/${results.supportedTotal})  [Target: >= 95.0%]`)
  console.log(`False-Support Rate:      ${results.falseSupportRate.toFixed(2)}% (${results.falseSupportTotal}/${results.negativeTotal})  [Target: <= 1.0%]`)
  console.log('----------------------------------------')
  console.log('Slice Breakdown:')
  for (const [slice, m] of Object.entries(results.sliceMetrics)) {
    const locPct = ((m.localized / m.total) * 100).toFixed(1)
    const fidPct = m.supportedTotal > 0 ? `${((m.fidelityMatches / m.supportedTotal) * 100).toFixed(1)}%` : 'N/A'
    const trapPct = m.negativeTotal > 0 ? `${((m.falseSupportCount / m.negativeTotal) * 100).toFixed(1)}%` : 'N/A'
    console.log(`  - ${slice.padEnd(20)}: n=${m.total} | Loc=${locPct}% | Fid=${fidPct} | FalseSupport=${trapPct}`)
  }
  console.log('========================================\n')

  const passed = results.localizationRate >= 90.0 && results.fidelityRate >= 95.0 && results.falseSupportRate <= 1.0
  console.log(`Release Gate Status: ${passed ? 'ALL BARS PASSED (GO)' : 'FAILED (NO-GO)'}`)
  process.exit(passed ? 0 : 1)
}

main()

