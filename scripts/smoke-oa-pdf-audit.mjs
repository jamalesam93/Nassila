#!/usr/bin/env node
/**
 * Manual OA-PDF Masdar-lite smoke runner (1.2.0).
 * Usage:
 *   node scripts/smoke-oa-pdf-audit.mjs           # offline fixture path
 *   node scripts/smoke-oa-pdf-audit.mjs --live    # + arXiv PDF fetch
 */
import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const live = process.argv.includes('--live')

const env = { ...process.env }
if (live) env.SMOKE_OA_LIVE = '1'

console.log('Nassila 1.2.0 — OA-PDF Masdar-lite smoke')
console.log(`Mode: ${live ? 'offline + live arXiv PDF' : 'offline fixtures only'}`)
console.log('')

const result = spawnSync(
  'npx',
  ['vitest', 'run', 'tests/smoke/oa-pdf-masdar-lite.smoke.test.ts'],
  { cwd: root, env, stdio: 'inherit', shell: true }
)

const passed = result.status === 0
const stamp = new Date().toISOString()
const signoff = [
  '# OA-PDF Masdar-lite smoke sign-off',
  '',
  `- **Date:** ${stamp}`,
  `- **App target:** 1.2.0 Masdar-lite`,
  `- **Mode:** ${live ? 'offline + live' : 'offline'}`,
  `- **Result:** ${passed ? 'PASS' : 'FAIL'}`,
  '',
  '## Checks',
  '',
  '- [x] OA PDF bytes → `fullTextFromOaPdfBytes` → `full_text_oa_unpaywall`',
  '- [x] Maktab `extractFromPdf` (pdf.js tier A) on fixture PDF',
  '- [x] Grounding excerpt selection + deterministic passage alignment',
  '- [x] Mock supported claim with verbatim quote → L3 pass',
  live ? '- [x] Live arXiv PDF fetch + extract (network)' : '- [ ] Live arXiv PDF (run with `--live`)',
  '',
  '## Not covered (manual before ship)',
  '',
  '- Full manuscript audit in Electron with Unpaywall email + Sanad LLM',
  '- Scanned PDF OCR tier B (Tesseract) on hardware',
  '',
  'Re-run: `node scripts/smoke-oa-pdf-audit.mjs` or `npm test -- tests/smoke/oa-pdf-masdar-lite.smoke.test.ts`',
  ''
].join('\n')

const outPath = join(root, 'tests', 'smoke', 'OA_PDF_SMOKE_SIGNOFF.md')
writeFileSync(outPath, signoff, 'utf8')
console.log('')
console.log(passed ? 'SMOKE PASS' : 'SMOKE FAIL')
console.log(`Sign-off written: ${outPath}`)

process.exit(result.status ?? 1)
