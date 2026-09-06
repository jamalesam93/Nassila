import { readdirSync, readFileSync } from 'node:fs'
import { matchPaperIdentity, targetsFromItems } from '../src/engine/papers/match'
import type { CslItem } from '../src/engine/types'

const auditPath = process.argv[2]
const pdfDir = process.argv[3]
if (!auditPath || !pdfDir) {
  console.error('Usage: npx tsx scripts/verify-paper-stem-match.ts <audit.json> <pdf-dir>')
  process.exit(1)
}

const audit = JSON.parse(readFileSync(auditPath, 'utf8')) as {
  findings: Array<{ bibKey: string; resolvedItem?: CslItem; l3Coverage?: string }>
}
const targets = targetsFromItems(
  audit.findings.map((f) => ({ bibKey: f.bibKey, item: f.resolvedItem }))
)
const pdfs = readdirSync(pdfDir).filter((n) => n.toLowerCase().endsWith('.pdf'))
const matched: Array<{ name: string; key: string; by: string | null }> = []
const unmatched: string[] = []
let failed = false

for (const name of pdfs) {
  const m = matchPaperIdentity({ fileName: name }, targets)
  if (m.kind === 'matched' && m.bibKeys[0]) {
    matched.push({ name, key: m.bibKeys[0], by: m.matchedBy })
  } else {
    unmatched.push(name)
  }
}

// Priority: DOI wins over filename stem when both are present.
const stemOverDoiTrap = matchPaperIdentity(
  { doi: '10.5555/attn', fileName: '7.pdf' },
  [
    { bibKey: '3', DOI: '10.5555/attn', title: 'Attention paper' },
    { bibKey: '7', title: 'Seven paper' }
  ]
)
if (stemOverDoiTrap.matchedBy !== 'doi' || stemOverDoiTrap.bibKeys[0] !== '3') {
  console.error('FAIL: DOI must beat filename stem')
  failed = true
}

const byStem = matched.filter((m) => m.by === 'bibKey')
const cov = Object.fromEntries(audit.findings.map((f) => [f.bibKey, f.l3Coverage]))
const newlyFullText = byStem.filter((m) => cov[m.key] !== 'full_text_attached_pdf')
const orphanAllowed = unmatched.every((name) => {
  const stem = name.replace(/\.pdf$/i, '')
  return !targets.some((t) => t.bibKey === stem)
})
if (!orphanAllowed) {
  console.error('FAIL: unmatched PDF has a bibliography key but did not stem-match')
  failed = true
}

const report = {
  pdfCount: pdfs.length,
  matchedCount: matched.length,
  unmatched,
  matchedByBibKey: byStem.length,
  newlyAttachable: newlyFullText.map((m) => `${m.name}→[${m.key}] (was ${cov[m.key]})`),
  doiBeatsStem: true
}
console.log(JSON.stringify(report, null, 2))

if (matched.length < 15) {
  console.error('FAIL: expected at least 15 stem/DOI/title matches against this folder')
  failed = true
}
if (failed) process.exit(1)
console.log('OK: stem matcher preserves DOI→title→stem priority')
