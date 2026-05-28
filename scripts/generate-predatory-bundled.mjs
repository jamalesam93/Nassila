/**
 * One-shot: download community CSVs and write src/engine/predatory/data.json
 * Run: node scripts/generate-predatory-bundled.mjs
 */
import https from 'https'
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const JOURNALS_URL =
  'https://raw.githubusercontent.com/stop-predatory-journals/stop-predatory-journals.github.io/master/_data/journals.csv'
const PUBLISHERS_URL =
  'https://raw.githubusercontent.com/stop-predatory-journals/stop-predatory-journals.github.io/master/_data/publishers.csv'

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (r) => {
        let d = ''
        r.on('data', (c) => {
          d += c
        })
        r.on('end', () => {
          resolve({ headers: r.headers, body: d, status: r.statusCode ?? 0 })
        })
      })
      .on('error', reject)
  })
}

/** Minimal CSV row split (handles quoted fields). */
function parseCsvRows(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  lines.shift()
  return lines.map((line) => {
    const parts = []
    let cur = ''
    let q = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        q = !q
        continue
      }
      if (c === ',' && !q) {
        parts.push(cur)
        cur = ''
        continue
      }
      cur += c
    }
    parts.push(cur)
    return parts
  })
}

async function main() {
  const j = await get(JOURNALS_URL)
  const p = await get(PUBLISHERS_URL)
  if (j.status !== 200 || p.status !== 200) {
    throw new Error(`Download failed j=${j.status} p=${p.status}`)
  }

  const jrows = parseCsvRows(j.body)
  const prows = parseCsvRows(p.body)

  const testJ = {
    name: 'Omics Journal of Testpred',
    aliases: [],
    issn: ['1234-5678'],
    publisher: 'Rogue Publisher Testname',
    reason: 'Test entry'
  }
  const testP = {
    name: 'Rogue Publisher Testname',
    aliases: ['Rogue Pub Test'],
    reason: 'Test entry'
  }

  const journals = [testJ]
  const publishers = [testP]

  for (const r of jrows) {
    const name = r[1]?.trim()
    if (!name) continue
    const abbr = r[2]?.trim()
    journals.push({
      name,
      aliases: abbr ? [abbr] : [],
      reason: 'Stop Predatory Journals (community list)'
    })
  }

  for (const r of prows) {
    const name = r[1]?.trim()
    if (!name) continue
    const abbr = r[2]?.trim()
    publishers.push({
      name,
      aliases: abbr ? [abbr] : [],
      reason: 'Stop Predatory Journals (community list)'
    })
  }

  const out = {
    version: '2022-06-01-bundled',
    sourceUrl: 'https://github.com/stop-predatory-journals/stop-predatory-journals.github.io',
    updatedAt: new Date().toISOString(),
    publishers,
    journals
  }

  const dir = join(ROOT, 'src/engine/predatory')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'data.json'), JSON.stringify(out))
  console.log('Wrote data.json journals=', journals.length, 'publishers=', publishers.length)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
