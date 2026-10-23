/**
 * Arabic OCR evaluation harness (in-repo).
 *
 * Commands:
 *   node scripts/eval-arabic-ocr.mjs build       --corpus <dir> [--out <dir>]
 *   node scripts/eval-arabic-ocr.mjs run-paddle  --pages <pages.json> --out <paddle.json>
 *   node scripts/eval-arabic-ocr.mjs run-indra   --pages <pages.json> --out <indra.json>
 *   node scripts/eval-arabic-ocr.mjs score       --pages <pages.json> --paddle <paddle.json> --indra <indra.json> --out <report.md>
 *   node scripts/eval-arabic-ocr.mjs all         --corpus <dir> [--out <dir>]
 *
 * The corpus, page rasters and JSON outputs stay out of git (.eval-arabic-ocr/).
 * Indra is optional: run `npm run ocr:indra-fetch` first (fetched, not bundled).
 */
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

const require = createRequire(import.meta.url)
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const command = args[0]

function option(name, fallback) {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}

const OUT_DEFAULT = join(root, '.eval-arabic-ocr')
const DPI = Number(option('--dpi', '200'))
const GOLD_PER_BOOK = Number(option('--gold-per-book', '8'))
const SCAN_PER_BOOK = Number(option('--scan-per-book', '6'))
const MAX_BOOKS = Number(option('--max-books', '0'))

const info = (msg) => console.log(`[eval] ${msg}`)
const fail = (msg) => {
  console.error(`[eval] ERROR: ${msg}`)
  process.exit(1)
}

// ---------------------------------------------------------------------------
// shared: normalization + metrics
// ---------------------------------------------------------------------------
const DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g
/** Legacy-encoded Arabic layers map glyphs onto these rarely used letters. */
const RARE_ARABIC = /[\u063B-\u063F\u0671-\u0673\u06D3\u067A-\u067F\u06A0-\u06AF]/g

function normChars(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(DIACRITICS, '')
    .replace(/\u0640/g, '')
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    .replace(/\u0649/g, '\u064A')
    .replace(/\u0629/g, '\u0647')
    .replace(/[^\p{L}\p{N}]/gu, '')
}

function normWords(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(DIACRITICS, '')
    .replace(/\u0640/g, '')
    .split(/\s+/)
    .filter(Boolean)
}

function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = new Uint32Array(b.length + 1)
  let cur = new Uint32Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i
    const ca = a.charCodeAt(i - 1)
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca === b.charCodeAt(j - 1) ? 0 : 1))
    }
    ;[prev, cur] = [cur, prev]
  }
  return prev[b.length]
}
const cer = (ref, hyp) => (ref.length ? levenshtein(ref, hyp) / ref.length : NaN)

function grams(value, n = 6) {
  const s = normChars(value)
  const set = new Set()
  for (let i = 0; i + n <= s.length; i++) set.add(s.slice(i, i + n))
  return set
}
function recallPrecisionF1(refText, hypText, n = 6) {
  const ref = grams(refText, n)
  const hyp = grams(hypText, n)
  if (!ref.size || !hyp.size) return { recall: 0, precision: 0, f1: 0 }
  let hit = 0
  for (const g of ref) if (hyp.has(g)) hit++
  const recall = hit / ref.size
  const precision = hit / hyp.size
  return { recall, precision, f1: recall + precision ? (2 * recall * precision) / (recall + precision) : 0 }
}
const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : NaN)
const median = (xs) => {
  if (!xs.length) return NaN
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const percentile = (xs, q) => {
  if (!xs.length) return NaN
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)]
}
const fmt = (x) => (Number.isFinite(x) ? x.toFixed(3) : '—')

/**
 * Mirror of src/engine/maktab/ocr/post-process.ts:logicalOrderArabicOcrText.
 * Kept in sync deliberately: the harness must score what the app ships.
 */
function nassilaLogicalText(pred) {
  return String(pred ?? '')
    .split(/\r?\n/)
    .map((line) => {
      const arabic = (line.match(/[\u0600-\u06FF]/g) ?? []).length
      if (arabic === 0) return line
      const latin = (line.match(/[A-Za-z]/g) ?? []).length
      if (latin === 0 || arabic >= latin * 2) return [...line].reverse().join('')
      const latinOrDigitRun = /[a-zA-Z0-9 :*./%+-]/
      const out = []
      let cur = ''
      for (const c of line) {
        if (!latinOrDigitRun.test(c)) {
          if (cur) {
            out.push(cur)
            cur = ''
          }
          out.push(c)
        } else cur += c
      }
      if (cur) out.push(cur)
      return out.reverse().join('')
    })
    .join('\n')
}

// ---------------------------------------------------------------------------
// build: choose pages, rasterize, write pages.json
// ---------------------------------------------------------------------------
async function listPdfs(dir) {
  const out = []
  const walk = async (current) => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (extname(entry.name).toLowerCase() === '.pdf') out.push(full)
    }
  }
  await walk(dir)
  return out.sort()
}

function spread(count, total, lo = 4, hi = 160) {
  const top = Math.max(lo + 1, Math.min(total - 4, hi))
  const step = Math.max(1, Math.floor((top - lo) / Math.max(1, count - 1)))
  const pages = []
  for (let p = lo; p <= top && pages.length < count; p += step) pages.push(p)
  return pages
}

async function build(
  corpusArg = option('--corpus', process.env.NASSILA_OCR_CORPUS || ''),
  outArg = option('--out', OUT_DEFAULT)
) {
  const corpus = resolve(corpusArg)
  if (!corpus || !existsSync(corpus)) fail('--corpus <dir> is required (or set NASSILA_OCR_CORPUS)')
  const out = resolve(outArg)
  const pagesDir = join(out, 'pages')
  await mkdir(pagesDir, { recursive: true })

  const mod = require('@firecrawl/pdf-inspector')
  const pdfjs = await import(pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.mjs')).href)
  const { createCanvas } = require('@napi-rs/canvas')
  const wasmUrl =
    pathToFileURL(join(dirname(require.resolve('pdfjs-dist/package.json')), 'wasm')).href + '/'

  let files = await listPdfs(corpus)
  if (MAX_BOOKS > 0) files = files.slice(0, MAX_BOOKS)
  info(`corpus ${corpus}: ${files.length} PDFs`)

  const items = []
  for (const file of files) {
    const name = relative(corpus, file)
    let buffer
    try {
      buffer = await readFile(file)
    } catch (err) {
      info(`skip ${name}: ${err.message}`)
      continue
    }
    let classification
    try {
      classification = mod.classifyPdf(buffer)
    } catch {
      info(`skip ${name}: not a readable PDF`)
      continue
    }
    const pageCount = Number(classification.pageCount) || 0
    const textBased = /TextBased|Mixed/i.test(String(classification.pdfType))

    if (textBased) {
      const candidates = spread(Math.min(24, Math.max(8, GOLD_PER_BOOK * 3)), pageCount)
      let perPage = []
      try {
        const res = await mod.extractPagesMarkdownAsync(
          buffer,
          candidates.map((p) => p - 1)
        )
        perPage = res.pages.map((p) => ({ page: p.page + 1, text: String(p.markdown ?? '') }))
      } catch {
        perPage = []
      }
      const qualifying = perPage
        .map((p) => {
          const arabic = (p.text.match(/[\u0600-\u06FF]/g) ?? []).length
          const fffd = (p.text.match(/\uFFFD/g) ?? []).length
          const rare = (p.text.match(RARE_ARABIC) ?? []).length
          const letters = (p.text.match(/[\p{L}]/gu) ?? []).length
          return { ...p, arabic, fffd, rare, ratio: letters ? arabic / letters : 0 }
        })
        // A legacy non-Unicode layer has no U+FFFD and no cmap gaps; only the
        // rare-letter share reveals it. Exclude it from gold rather than let it
        // poison every engine's CER.
        .filter((p) => p.arabic >= 350 && p.fffd <= 2 && p.ratio >= 0.4 && p.rare / p.arabic <= 0.02)
        .sort((a, b) => a.page - b.page)
      const stride = Math.max(1, Math.ceil(qualifying.length / GOLD_PER_BOOK))
      const picked = qualifying.filter((_, i) => i % stride === 0).slice(0, GOLD_PER_BOOK)
      for (const p of picked) items.push({ kind: 'gold', file: name, path: file, page: p.page, gold: p.text })
      info(`gold  ${name}: ${pageCount}p -> ${picked.length} pages`)
    } else {
      for (const page of spread(SCAN_PER_BOOK, pageCount, 5, Math.max(6, pageCount - 2))) {
        items.push({ kind: 'scan', file: name, path: file, page })
      }
      info(`scan  ${name}: ${pageCount}p -> ${Math.min(SCAN_PER_BOOK, pageCount)} pages`)
    }
  }

  // rasterize
  let done = 0
  const byFile = new Map()
  for (const item of items) {
    if (!byFile.has(item.path)) byFile.set(item.path, [])
    byFile.get(item.path).push(item)
  }
  for (const [file, group] of byFile) {
    try {
      const doc = await pdfjs.getDocument({ data: new Uint8Array(await readFile(file)), wasmUrl }).promise
      for (const item of group) {
        const page = await doc.getPage(item.page)
        const viewport = page.getViewport({ scale: DPI / 72 })
        const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
        const ctx = canvas.getContext('2d')
        await page.render({ canvasContext: ctx, viewport }).promise
        const { width, height } = canvas
        const data = ctx.getImageData(0, 0, width, height).data
        let ink = 0
        let sampled = 0
        for (let y = 0; y < height; y += 16) {
          for (let x = 0; x < width; x += 16) {
            const i = (y * width + x) * 4
            if (data[i] < 240 || data[i + 1] < 240 || data[i + 2] < 240) ink++
            sampled++
          }
        }
        item.ink = Number((ink / Math.max(1, sampled)).toFixed(3))
        item.id = `${item.kind}-${String(done + 1).padStart(3, '0')}-p${item.page}`
        item.png = join(pagesDir, `${item.id}.png`)
        await writeFile(item.png, canvas.toBuffer('image/png'))
        done++
      }
      await doc.destroy()
    } catch (err) {
      info(`rasterize failed for ${file}: ${err.message}`)
    }
  }

  const pagesFile = join(out, 'pages.json')
  await writeFile(pagesFile, JSON.stringify(items, null, 2), 'utf8')
  const gold = items.filter((i) => i.kind === 'gold').length
  info(`wrote ${pagesFile}: ${items.length} pages (${gold} gold, ${items.length - gold} scan)`)
}

// ---------------------------------------------------------------------------
// run-paddle
// ---------------------------------------------------------------------------
async function runPaddle(
  pagesFileArg = option('--pages', join(OUT_DEFAULT, 'pages.json')),
  outArg = option('--out', join(OUT_DEFAULT, 'paddle.json')),
  modelDirArg = option('--model-dir', join(root, 'resources', 'arabic-ocr'))
) {
  const pagesFile = resolve(pagesFileArg)
  const out = resolve(outArg)
  const modelDir = resolve(modelDirArg)
  const pages = JSON.parse(await readFile(pagesFile, 'utf8'))

  const mod = await import(pathToFileURL(require.resolve('ppu-paddle-ocr')).href)
  const PaddleOcrService = mod.PaddleOcrService ?? mod.default?.PaddleOcrService
  if (!PaddleOcrService) fail('ppu-paddle-ocr did not export PaddleOcrService')

  const service = new PaddleOcrService({
    model: {
      detection: join(modelDir, 'ppocrv5_mobile_det.onnx'),
      recognition: join(modelDir, 'arabic_ppocrv5_mobile_rec.onnx'),
      charactersDictionary: join(modelDir, 'ppocrv5_arabic_dict.txt')
    }
  })
  await service.initialize()

  const results = []
  for (const page of pages) {
    const bytes = await readFile(page.png)
    const started = performance.now()
    let raw = ''
    let confidence = 0
    let error = null
    try {
      const result = await service.recognize(
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
      )
      raw = String(result.text ?? '')
      confidence = Number(result.confidence ?? 0)
    } catch (err) {
      error = err instanceof Error ? err.message : String(err)
    }
    results.push({
      id: page.id,
      kind: page.kind,
      file: page.file,
      page: page.page,
      raw,
      confidence,
      ms: Math.round(performance.now() - started),
      ...(error ? { error } : {})
    })
    if (results.length % 10 === 0) info(`paddle ${results.length}/${pages.length}`)
  }
  await writeFile(out, JSON.stringify(results, null, 2), 'utf8')
  info(`wrote ${out} (${results.length} pages)`)
}

// ---------------------------------------------------------------------------
// run-indra (fetched runtime)
// ---------------------------------------------------------------------------
async function runIndra(
  pagesFileArg = option('--pages', join(OUT_DEFAULT, 'pages.json')),
  outArg = option('--out', join(OUT_DEFAULT, 'indra.json'))
) {
  const pagesFile = resolve(pagesFileArg)
  const out = resolve(outArg)
  const indraDir = resolve(option('--indra-dir', process.env.NASSILA_INDRA_DIR || join(root, 'resources', 'indra-ocr')))
  const markerPath = join(indraDir, '.nassila-indra-ocr-ready')
  if (!existsSync(markerPath)) {
    fail(`Indra runtime missing. Run: npm run ocr:indra-fetch  (expected ${markerPath})`)
  }
  const marker = JSON.parse(await readFile(markerPath, 'utf8'))
  const python = option('--python', marker.python)
  if (!existsSync(python)) fail(`Indra python not found: ${python}`)

  const runner = join(root, 'scripts', 'eval-arabic-ocr', 'run_indra.py')
  const result = spawnSync(
    python,
    [runner, '--pages', pagesFile, '--out', out, '--model-dir', marker.modelDirectory],
    { stdio: 'inherit' }
  )
  if (result.status !== 0) fail(`Indra runner failed (exit ${result.status})`)
  info(`wrote ${out}`)
}

// ---------------------------------------------------------------------------
// score
// ---------------------------------------------------------------------------
async function score(
  pagesFileArg = option('--pages', join(OUT_DEFAULT, 'pages.json')),
  paddleFileArg = option('--paddle', join(OUT_DEFAULT, 'paddle.json')),
  indraFileArg = option('--indra', join(OUT_DEFAULT, 'indra.json')),
  outArg = option('--out', join(OUT_DEFAULT, 'report.md'))
) {
  const pagesFile = resolve(pagesFileArg)
  const paddleFile = resolve(paddleFileArg)
  const indraFile = resolve(indraFileArg)
  const out = resolve(outArg)

  const pages = JSON.parse(await readFile(pagesFile, 'utf8'))
  const paddle = existsSync(paddleFile) ? JSON.parse(await readFile(paddleFile, 'utf8')) : []
  const indra = existsSync(indraFile) ? JSON.parse(await readFile(indraFile, 'utf8')) : []
  const pMap = new Map(paddle.map((r) => [r.id, r]))
  const iMap = new Map(indra.map((r) => [r.id, r]))

  const rows = []
  for (const page of pages) {
    const p = pMap.get(page.id)
    const i = iMap.get(page.id)
    if (!p && !i) continue
    const gold = page.gold ?? ''
    const row = {
      id: page.id,
      kind: page.kind,
      file: page.file,
      page: page.page,
      ink: page.ink,
      goldChars: normChars(gold).length,
      paddle: p ? { text: nassilaLogicalText(p.raw), ms: p.ms } : null,
      indra: i ? { text: String(i.text ?? ''), ms: i.ms } : null
    }
    if (row.goldChars > 0) {
      const ref = normChars(gold)
      for (const engine of ['paddle', 'indra']) {
        if (!row[engine]) continue
        const hyp = row[engine].text
        row[engine].cer = cer(ref, normChars(hyp))
        const rp = recallPrecisionF1(gold, hyp)
        row[engine].f1 = rp.f1
        row[engine].recall = rp.recall
      }
    }
    rows.push(row)
  }

  const goldRows = rows.filter((r) => r.goldChars > 0 && r.paddle && r.indra)
  const scanRows = rows.filter((r) => r.kind === 'scan' && r.paddle && r.indra)
  const lines = []
  lines.push('# Arabic OCR evaluation')
  lines.push('')
  lines.push(`Generated ${new Date().toISOString()} · ${rows.length} pages · corpus pages are not committed`)
  lines.push('')
  lines.push('## Gold pages (text-layer reference)')
  lines.push('')
  lines.push('| engine | pages | CER mean / median / p90 | 6-gram recall / F1 | ms median |')
  lines.push('|---|---|---|---|---|')
  for (const engine of ['paddle', 'indra']) {
    const values = goldRows.filter((r) => r[engine] && Number.isFinite(r[engine].cer))
    if (!values.length) continue
    lines.push(
      `| ${engine} | ${values.length} | ${fmt(mean(values.map((r) => r[engine].cer)))} / ${fmt(median(values.map((r) => r[engine].cer)))} / ${fmt(percentile(values.map((r) => r[engine].cer), 0.9))} | ${fmt(mean(values.map((r) => r[engine].recall)))} / ${fmt(mean(values.map((r) => r[engine].f1)))} | ${Math.round(median(values.map((r) => r[engine].ms)))} |`
    )
  }
  lines.push('')
  if (scanRows.length) {
    const agree = scanRows
      .map((r) => {
        const a = normChars(r.paddle.text)
        const b = normChars(r.indra.text)
        return a.length && b.length ? levenshtein(a, b) / Math.max(a.length, b.length) : null
      })
      .filter((x) => x != null)
    lines.push(
      `Scan pages: **${scanRows.length}** · cross-engine agreement CER median **${fmt(median(agree))}**, p90 **${fmt(percentile(agree, 0.9))}**`
    )
    lines.push('')
  }
  const perFile = new Map()
  for (const row of goldRows) {
    if (!perFile.has(row.file)) perFile.set(row.file, [])
    perFile.get(row.file).push(row)
  }
  lines.push('## Per file')
  lines.push('')
  lines.push('| file | pages | Paddle CER | Indra CER | Paddle F1 | Indra F1 |')
  lines.push('|---|---|---|---|---|---|')
  for (const [file, group] of perFile) {
    lines.push(
      `| ${file} | ${group.length} | ${fmt(mean(group.map((r) => r.paddle.cer)))} | ${fmt(mean(group.map((r) => r.indra.cer)))} | ${fmt(mean(group.map((r) => r.paddle.f1)))} | ${fmt(mean(group.map((r) => r.indra.f1)))} |`
    )
  }
  lines.push('')
  const worst = [...goldRows].sort((a, b) => b.indra.cer - a.indra.cer).slice(0, 10)
  lines.push('## Worst Indra pages')
  lines.push('')
  lines.push('| page | file | CER paddle / indra | ink |')
  lines.push('|---|---|---|---|')
  for (const r of worst) lines.push(`| p${r.page} | ${r.file} | ${fmt(r.paddle.cer)} / ${fmt(r.indra.cer)} | ${r.ink ?? '—'} |`)
  lines.push('')
  lines.push('## Notes')
  lines.push('')
  lines.push('- Gold is the PDF text layer; pages whose layer is incomplete (figure-only content) or mis-encoded can distort CER — inspect the worst-pages table.')
  lines.push('- Paddle output is scored through the shipped transform (`logicalOrderArabicOcrText`, mirrored in this script); Indra is scored raw.')
  lines.push('- Whitespace and punctuation are ignored; CER is Levenshtein over normalized Arabic letters/digits.')
  lines.push('- Indra weights are fetched, not bundled (`npm run ocr:indra-fetch`), and are NOT redistributed with the app.')
  lines.push('')
  await mkdir(dirname(out), { recursive: true })
  await writeFile(out, lines.join('\n'), 'utf8')
  info(`wrote ${out}`)
}

// ---------------------------------------------------------------------------
async function all() {
  const out = resolve(option('--out', OUT_DEFAULT))
  const pagesFile = join(out, 'pages.json')
  await build(option('--corpus', process.env.NASSILA_OCR_CORPUS || ''), out)
  await runPaddle(pagesFile, join(out, 'paddle.json'))
  try {
    await runIndra(pagesFile, join(out, 'indra.json'))
  } catch (err) {
    info(`Indra skipped: ${err instanceof Error ? err.message : String(err)}`)
  }
  await score(pagesFile, join(out, 'paddle.json'), join(out, 'indra.json'), join(out, 'report.md'))
}

const commands = {
  build: () => build(),
  'run-paddle': () => runPaddle(),
  'run-indra': () => runIndra(),
  score: () => score(),
  all
}
const handler = commands[command]
if (!handler) {
  fail(`unknown command "${command ?? ''}". Use: build | run-paddle | run-indra | score | all`)
}
handler().catch((err) => fail(err instanceof Error ? err.stack ?? err.message : String(err)))
