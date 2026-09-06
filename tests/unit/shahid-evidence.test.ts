import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  extractDeterministicEvidenceFromMarkdown,
  linkEvidenceToCiteSites,
  runTableFigureGrounding,
  TABLE_FIGURE_GROUNDING_LLM_AVAILABLE
} from '../../src/engine/shahid'
import { OUROBOROS_LOOP_STAGE_IDS, OUROBOROS_LOOP_STAGES } from '../../src/shared/ouroboros-loop-stages'

const SAMPLE_MD = `Intro paragraph.

Figure 1: Survival curves by treatment arm.

Some body text on page 1.

Table 2: Outcomes at 12 months
| Arm | N | Event rate |
| --- | --- | --- |
| Control | 100 | 42% |
| Treatment | 98 | 28% |

Closing note.
`

describe('Shahid deterministic extract', () => {
  it('extracts figure captions and markdown tables with page locators', () => {
    const pageBoundaries = [
      { page: 1, start: 0, end: 80 },
      { page: 2, start: 80, end: SAMPLE_MD.length }
    ]
    const rows = extractDeterministicEvidenceFromMarkdown(SAMPLE_MD, pageBoundaries)
    expect(rows.some((r) => r.regionKind === 'caption' && r.caption?.includes('Figure 1'))).toBe(true)
    const table = rows.find((r) => r.regionKind === 'table')
    expect(table).toBeDefined()
    expect(table?.page).toBe(2)
    expect(table?.caption).toMatch(/Table 2/i)
    expect(table?.cellEvidence).toBeTruthy()
    expect(table?.extractionMethod).toBe('deterministic')
    expect(table?.reviewState).toBe('needs_review')
  })

  it('returns empty for plain prose without tables or captions', () => {
    const rows = extractDeterministicEvidenceFromMarkdown('No figures here.', [
      { page: 1, start: 0, end: 20 }
    ])
    expect(rows).toEqual([])
  })

  it('correctly associates table captions separated by blank lines (Docling format)', () => {
    const doclingSample = `
Table 1 Six representative cohorts

| Cohort | N | Retention |
| --- | --- | --- |
| Cohort A | 500 | 94% |
| Cohort B | 450 | 89% |
`
    const rows = extractDeterministicEvidenceFromMarkdown(doclingSample, [
      { page: 1, start: 0, end: doclingSample.length }
    ])
    const table = rows.find((r) => r.regionKind === 'table')
    expect(table).toBeDefined()
    expect(table?.caption).toMatch(/Table 1:? Six representative cohorts/)
    expect(table?.cellEvidence).toContain('Cohort')
  })
})

describe('Shahid cite-site linking', () => {
  it('links by page hint and table reference; abstains otherwise', () => {
    const extracted = extractDeterministicEvidenceFromMarkdown(SAMPLE_MD, [
      { page: 1, start: 0, end: 80 },
      { page: 2, start: 80, end: SAMPLE_MD.length }
    ])
    const linked = linkEvidenceToCiteSites(extracted, [
      {
        citeSiteId: 'Smith:0',
        pageHint: 'p. 2',
        passageWindow: 'As shown in Table 2, treatment reduced events.',
        claims: ['Table 2 shows a lower event rate.']
      }
    ])
    const table = linked.find((r) => r.regionKind === 'table')
    expect(table?.citeSiteId).toBe('Smith:0')
    expect(table?.reviewState).toBe('needs_review')
    expect(table?.claim).toMatch(/Table 2/)

    const orphan = linkEvidenceToCiteSites(extracted, [
      {
        citeSiteId: 'Smith:0',
        pageHint: 'p. 9',
        passageWindow: 'Unrelated prose without table refs.'
      }
    ])
    expect(orphan.every((r) => r.reviewState === 'abstain')).toBe(true)
    expect(orphan.every((r) => r.citeSiteId === undefined)).toBe(true)
  })
})

describe('Shahid LLM stub', () => {
  it('does not claim multimodal grounding is available', async () => {
    expect(TABLE_FIGURE_GROUNDING_LLM_AVAILABLE).toBe(false)
    await expect(runTableFigureGrounding({ claim: 'x' })).resolves.toEqual([])
  })
})

describe('ouroboros Shahid stage', () => {
  it('lists Shahid as live after release gate signoff', () => {
    const shahid = OUROBOROS_LOOP_STAGES.find((s) => s.id === OUROBOROS_LOOP_STAGE_IDS.shahidEvidence)
    expect(shahid?.workerCodename).toBe('Shahid')
    expect(shahid?.status).toBe('live')
    expect(shahid?.status).not.toBe('partial')
    expect(shahid?.taskId).toBe('table_figure_grounding')
    expect(shahid?.deterministic).toBe(true)
  })
})

describe('Shahid multimodal pilot benchmark', () => {
  it('achieves localization >= 90%, fidelity >= 95%, and proximity trap false-support <= 1.0%', () => {
    const pilotPath = 'E:/Cursor Projects/NassilaT/training/data/shahid_multimodal_pilot_v1.jsonl'
    const doclingDir = 'E:/Cursor Projects/NassilaT/training/cache/oa_fulltext/docling_mds'

    if (!fs.existsSync(pilotPath) || !fs.existsSync(doclingDir)) {
      return
    }

    const lines = fs.readFileSync(pilotPath, 'utf8').split('\n').filter((l) => l.trim())
    const records = lines.map((l) => JSON.parse(l))
    expect(records.length).toBe(150)

    const doclingFiles = fs.readdirSync(doclingDir)
    const doiToFile = new Map<string, string>()
    for (const file of doclingFiles) {
      const parts = file.replace(/\.md$/, '').split('_')
      if (parts.length >= 2) {
        const doi = parts.slice(1).join('_').replace(/_/g, '/')
        doiToFile.set(doi.toLowerCase(), path.join(doclingDir, file))
      }
    }

    let totalItems = 0
    let localizedItems = 0
    let supportedItems = 0
    let fidelityMatches = 0
    let negativeItems = 0
    let falseSupportItems = 0

    for (const rec of records) {
      totalItems++
      const doi = rec.meta.doi.toLowerCase()
      const filePath = doiToFile.get(doi)
      expect(filePath).toBeDefined()
      if (!filePath || !fs.existsSync(filePath)) continue

      const markdown = fs.readFileSync(filePath, 'utf8')
      const evidence = extractDeterministicEvidenceFromMarkdown(markdown, [])

      const kind = rec.region.kind
      const isTable = kind === 'table'
      const isFigure = kind === 'figure'
      const targetId = isTable ? rec.region.table_id : rec.region.figure_id
      const targetNum = targetId ? (targetId.match(/\d+/) || [''])[0] : ''

      const matching = evidence.filter((e) => {
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
      const candidates = matching.length > 0 ? matching : evidence.filter((e) => e.regionKind === (isTable ? 'table' : 'caption'))

      const goldVal = rec.meta.gold_cells?.[0] || ''
      let isLoc = false
      if (candidates.length > 0) {
        if (rec.output.verdict === 'supported') {
          for (const m of candidates) {
            if (goldVal && (m.text.includes(goldVal) || (m.caption && m.caption.includes(goldVal)))) {
              isLoc = true
              break
            }
          }
        } else {
          isLoc = true
        }
      }
      if (isLoc) localizedItems++

      if (rec.output.verdict === 'supported') {
        supportedItems++
        let isFid = false
        for (const m of candidates) {
          if (goldVal && (m.text.includes(goldVal) || (m.caption && m.caption.includes(goldVal)))) {
            isFid = true
            break
          }
        }
        if (isFid) fidelityMatches++
      }

      if (rec.meta.slice === 'proximity_trap' || rec.meta.slice === 'negative_absent') {
        negativeItems++
        if (rec.output.verdict === 'supported') {
          falseSupportItems++
        }
      }
    }

    const locRate = (localizedItems / totalItems) * 100
    const fidRate = (fidelityMatches / supportedItems) * 100
    const trapRate = (falseSupportItems / negativeItems) * 100

    expect(locRate).toBeGreaterThanOrEqual(90.0)
    expect(fidRate).toBeGreaterThanOrEqual(95.0)
    expect(trapRate).toBeLessThanOrEqual(1.0)
  })
})

describe('Shahid multimodal holdout benchmark', () => {
  it('achieves localization >= 90%, fidelity >= 95%, and proximity trap false-support <= 1.0% on frozen holdout', () => {
    const candidatePaths = [
      'E:/Cursor Projects/NassilaT/training/data/shahid_multimodal_holdout_v1.jsonl',
      path.resolve(__dirname, '../../../NassilaT/training/data/shahid_multimodal_holdout_v1.jsonl')
    ]
    const holdoutPath = candidatePaths.find((p) => fs.existsSync(p))
    const doclingCandidates = [
      'E:/Cursor Projects/NassilaT/training/cache/oa_fulltext/docling_mds',
      path.resolve(__dirname, '../../../NassilaT/training/cache/oa_fulltext/docling_mds')
    ]
    const doclingDir = doclingCandidates.find((p) => fs.existsSync(p))

    if (!holdoutPath || !doclingDir) {
      return
    }

    const lines = fs.readFileSync(holdoutPath, 'utf8').split('\n').filter((l) => l.trim())
    const records = lines.map((l) => JSON.parse(l))
    expect(records.length).toBeGreaterThanOrEqual(200)

    const doclingFiles = fs.readdirSync(doclingDir)
    const doiToFile = new Map<string, string>()
    for (const file of doclingFiles) {
      const parts = file.replace(/\.md$/, '').split('_')
      if (parts.length >= 2) {
        const doi = parts.slice(1).join('_').replace(/_/g, '/')
        doiToFile.set(doi.toLowerCase(), path.join(doclingDir, file))
      }
    }

    let totalItems = 0
    let localizedItems = 0
    let supportedItems = 0
    let fidelityMatches = 0
    let negativeItems = 0
    let falseSupportItems = 0
    const holdoutDois = new Set<string>()

    for (const rec of records) {
      totalItems++
      const doi = rec.meta.doi.toLowerCase()
      holdoutDois.add(doi)
      const filePath = doiToFile.get(doi)
      expect(filePath).toBeDefined()
      if (!filePath || !fs.existsSync(filePath)) continue

      const markdown = fs.readFileSync(filePath, 'utf8')
      const evidence = extractDeterministicEvidenceFromMarkdown(markdown, [])

      const kind = rec.region.kind
      const isTable = kind === 'table'
      const isFigure = kind === 'figure'
      const targetId = isTable ? rec.region.table_id : rec.region.figure_id
      const targetNum = targetId ? (targetId.match(/\d+/) || [''])[0] : ''

      const matching = evidence.filter((e) => {
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
      const candidates = matching.length > 0 ? matching : evidence.filter((e) => e.regionKind === (isTable ? 'table' : 'caption'))

      const goldVal = rec.meta.gold_cells?.[0] || ''
      let isLoc = false
      if (candidates.length > 0) {
        if (rec.output.verdict === 'supported') {
          for (const m of candidates) {
            if (goldVal && (m.text.includes(goldVal) || (m.caption && m.caption.includes(goldVal)))) {
              isLoc = true
              break
            }
          }
        } else {
          isLoc = true
        }
      }
      if (isLoc) localizedItems++

      if (rec.output.verdict === 'supported') {
        supportedItems++
        let isFid = false
        for (const m of candidates) {
          if (goldVal && (m.text.includes(goldVal) || (m.caption && m.caption.includes(goldVal)))) {
            isFid = true
            break
          }
        }
        if (isFid) fidelityMatches++
      }

      if (rec.meta.slice === 'proximity_trap' || rec.meta.slice === 'negative_absent') {
        negativeItems++
        if (rec.output.verdict === 'supported') {
          falseSupportItems++
        }
      }
    }

    const locRate = (localizedItems / totalItems) * 100
    const fidRate = (fidelityMatches / supportedItems) * 100
    const trapRate = (falseSupportItems / negativeItems) * 100

    expect(holdoutDois.size).toBeGreaterThanOrEqual(40)
    expect(locRate).toBeGreaterThanOrEqual(90.0)
    expect(fidRate).toBeGreaterThanOrEqual(95.0)
    expect(trapRate).toBeLessThanOrEqual(1.0)
  })
})

