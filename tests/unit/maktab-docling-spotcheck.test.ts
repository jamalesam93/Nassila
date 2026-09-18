/**
 * Operator spotcheck: Maktab (app) extract vs Docling corpus on the same EN OA PDFs.
 *
 * Not a CI gate — run explicitly:
 *   $env:MAKTAB_DOCLING_SPOTCHECK='1'; npx vitest run tests/unit/maktab-docling-spotcheck.test.ts
 *
 * Writes: NassilaT/training/data/ft_corpus_text_maktab_spotcheck.jsonl
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { extractFromPdf } from '@engine/maktab'

beforeAll(async () => {
  await import('../smoke/setup-pdfjs-node')
})

const enabled = process.env.MAKTAB_DOCLING_SPOTCHECK === '1'

const NASSILAT = join(__dirname, '..', '..', '..', 'NassilaT', 'training')
const PDF_DIR = join(NASSILAT, 'cache', 'oa_fulltext', 'pdfs')
const PILOT = join(NASSILAT, 'data', 'eval_holdout_grounding_product_docling_pilot30.jsonl')
const OUT = join(NASSILAT, 'data', 'ft_corpus_text_maktab_spotcheck.jsonl')

function normalizeDoi(raw: string | undefined | null): string | null {
  if (!raw) return null
  let s = raw.trim().toLowerCase()
  for (const prefix of ['https://doi.org/', 'http://doi.org/', 'doi:']) {
    if (s.startsWith(prefix)) s = s.slice(prefix.length)
  }
  return s || null
}

function doiFromPdfStem(stem: string): string | null {
  const m = stem.match(/^\d{3}_(.*)$/)
  return m ? m[1].replace(/_/g, '/') : null
}

function loadPilotDois(): string[] {
  const rows = readFileSync(PILOT, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { meta?: { doi?: string } })
  const set = new Set<string>()
  for (const r of rows) {
    const d = normalizeDoi(r.meta?.doi)
    if (d) set.add(d)
  }
  return [...set].sort()
}

function buildPdfIndex(): Map<string, string> {
  const map = new Map<string, string>()
  for (const name of readdirSync(PDF_DIR)) {
    if (!name.toLowerCase().endsWith('.pdf')) continue
    const doi = normalizeDoi(doiFromPdfStem(name.replace(/\.pdf$/i, '')))
    if (doi) map.set(doi, join(PDF_DIR, name))
  }
  return map
}

describe.skipIf(!enabled)('maktab vs docling EN spotcheck extract', () => {
  it(
    'extracts pilot30 PDFs via Maktab pdfjs embedded_only and writes JSONL',
    async () => {
      expect(existsSync(PILOT), `missing ${PILOT}`).toBe(true)
      expect(existsSync(PDF_DIR), `missing ${PDF_DIR}`).toBe(true)

      const dois = loadPilotDois()
      const pdfIndex = buildPdfIndex()
      const rows: Array<Record<string, unknown>> = []

      for (const doi of dois) {
        const pdfPath = pdfIndex.get(doi)
        if (!pdfPath) {
          rows.push({
            doi,
            body_text: '',
            meta: { extractor: 'maktab', engine: 'pdfjs', error: 'pdf_missing' }
          })
          continue
        }
        const buf = readFileSync(pdfPath)
        const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
        const t0 = Date.now()
        try {
          const result = await extractFromPdf(ab, {
            mode: 'embedded_only',
            engine: 'pdfjs'
          })
          rows.push({
            doi,
            body_text: result.text.slice(0, 120_000),
            page_count: result.pageCount,
            chars: result.text.length,
            warnings: result.warnings,
            tier: result.tier,
            meta: {
              extractor: 'maktab',
              engine: 'pdfjs',
              mode: 'embedded_only',
              ms: Date.now() - t0,
              pdf: pdfPath
            }
          })
        } catch (err) {
          rows.push({
            doi,
            body_text: '',
            meta: {
              extractor: 'maktab',
              engine: 'pdfjs',
              error: err instanceof Error ? err.message : String(err),
              ms: Date.now() - t0,
              pdf: pdfPath
            }
          })
        }
      }

      writeFileSync(OUT, rows.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8')
      const ok = rows.filter((r) => typeof r.body_text === 'string' && (r.body_text as string).length >= 800)
      console.log(
        `maktab-docling-spotcheck wrote ${rows.length} rows → ${OUT} (${ok.length} with ≥800 chars)`
      )
      expect(rows.length).toBe(dois.length)
      expect(ok.length).toBeGreaterThan(0)
    },
    600_000
  )
})
