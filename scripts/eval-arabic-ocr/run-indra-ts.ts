/**
 * Score the TypeScript Indra port on the same PNGs the Python package read.
 *
 *   npx vite-node scripts/eval-arabic-ocr/run-indra-ts.ts -- pages.json out.json modelDir
 *
 * INDRA_LIMIT=N reads only the first N pages (a smoke check).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'

import { recognizeIndraPng } from '../../src/main/maktab/indra-ocr'

interface PageRecord {
  id: string
  kind?: string
  file?: string
  page?: number
  png: string
}

const pagesPath = process.argv[2]
const outPath = process.argv[3]
const modelDir = process.argv[4]
const limit = Number(process.env.INDRA_LIMIT ?? '0')

if (!pagesPath || !outPath || !modelDir) {
  console.error('usage: run-indra-ts.ts <pages.json> <out.json> <model-dir>')
  process.exit(2)
}

const pages = JSON.parse(readFileSync(pagesPath, 'utf8')) as PageRecord[]
const slice = limit > 0 ? pages.slice(0, limit) : pages
const results: Array<Record<string, unknown>> = []

for (const item of slice) {
  const started = performance.now()
  const record: Record<string, unknown> = {
    id: item.id,
    kind: item.kind,
    file: item.file,
    page: item.page
  }
  try {
    const png = readFileSync(item.png)
    const page = await recognizeIndraPng(png, modelDir)
    record.text = page.text
    record.confidence = page.confidence
  } catch (err) {
    record.error = err instanceof Error ? err.stack ?? err.message : String(err)
  }
  record.ms = Math.round(performance.now() - started)
  results.push(record)
  console.log(item.id, record.ms, String(record.text ?? '').length, record.error ? 'ERR' : '')
  if (results.length % 10 === 0) writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8')
}

writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8')
console.log(`wrote ${outPath}`)
