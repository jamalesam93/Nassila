/**
 * Download official Paddle Arabic PP-OCRv5 ONNX packs into resources/arabic-ocr/.
 *
 * Pins (not the multilingual CJK/EN/JA PP-OCRv5, and not community medyas v6):
 *   - PaddlePaddle/arabic_PP-OCRv5_mobile_rec_onnx
 *   - PaddlePaddle/PP-OCRv5_mobile_det_onnx
 *   - Arabic character dict (ppu-paddle-ocr compatible one-char-per-line)
 *
 * Usage:
 *   npm run ocr:arabic-adapter
 *   node scripts/download-arabic-ocr-adapter.mjs
 *   node scripts/download-arabic-ocr-adapter.mjs --force-stamp   # policy tests only
 */
import { createHash } from 'node:crypto'
import { mkdir, rename, rm, writeFile, readFile, access } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'resources', 'arabic-ocr')
const marker = join(dir, '.nassila-arabic-ocr-ready')
const checksumsPath = join(dir, 'checksums.sha256')

const HF = 'https://huggingface.co'
/** Dict used by ppu-paddle-ocr V5_ARABIC_MOBILE_MODEL (one character per line). */
const DICT_URL = `${HF}/snowfluke/ppu-paddle-ocr-models/resolve/main/recognition/multi/arabic/v5/ppocrv5_arabic_dict.txt`

/** Official ONNX pack — keep filenames stable for the adapter runner. */
const MODEL_FILES = [
  {
    name: 'arabic_ppocrv5_mobile_rec.onnx',
    url: `${HF}/PaddlePaddle/arabic_PP-OCRv5_mobile_rec_onnx/resolve/main/inference.onnx`,
    hub: 'PaddlePaddle/arabic_PP-OCRv5_mobile_rec_onnx'
  },
  {
    name: 'arabic_ppocrv5_mobile_rec.yml',
    url: `${HF}/PaddlePaddle/arabic_PP-OCRv5_mobile_rec_onnx/resolve/main/inference.yml`,
    hub: 'PaddlePaddle/arabic_PP-OCRv5_mobile_rec_onnx'
  },
  {
    name: 'ppocrv5_mobile_det.onnx',
    url: `${HF}/PaddlePaddle/PP-OCRv5_mobile_det_onnx/resolve/main/inference.onnx`,
    hub: 'PaddlePaddle/PP-OCRv5_mobile_det_onnx'
  },
  {
    name: 'ppocrv5_mobile_det.yml',
    url: `${HF}/PaddlePaddle/PP-OCRv5_mobile_det_onnx/resolve/main/inference.yml`,
    hub: 'PaddlePaddle/PP-OCRv5_mobile_det_onnx'
  },
  {
    name: 'ppocrv5_arabic_dict.txt',
    url: DICT_URL,
    hub: 'snowfluke/ppu-paddle-ocr-models (arabic v5 dict)'
  }
]

const args = new Set(process.argv.slice(2))
const forceStamp = args.has('--force-stamp')

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function download(url, destination) {
  console.log(`Downloading ${url}`)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }
  const data = Buffer.from(await response.arrayBuffer())
  const temporary = `${destination}.tmp`
  await writeFile(temporary, data)
  await rm(destination, { force: true })
  await rename(temporary, destination)
  return createHash('sha256').update(data).digest('hex')
}

await mkdir(dir, { recursive: true })

if (forceStamp) {
  await writeFile(
    marker,
    `ready\n# force-stamp ${new Date().toISOString()}\n# POLICY TEST ONLY — not a production pack\n`,
    'utf8'
  )
  console.log(`Wrote force-stamp marker: ${marker}`)
  console.log('Do not treat this as Track A GO.')
  process.exit(0)
}

const checksumLines = []
for (const file of MODEL_FILES) {
  const dest = join(dir, file.name)
  if (await exists(dest)) {
    const existing = await readFile(dest)
    const digest = createHash('sha256').update(existing).digest('hex')
    checksumLines.push(`${digest}  ${file.name}`)
    console.log(`  skip (present): ${file.name} (${(existing.byteLength / 1024 / 1024).toFixed(1)} MB)`)
    continue
  }
  const digest = await download(file.url, dest)
  const data = await readFile(dest)
  checksumLines.push(`${digest}  ${file.name}`)
  console.log(`  ${file.name}: ${(data.byteLength / 1024 / 1024).toFixed(1)} MB  ← ${file.hub}`)
}

await writeFile(checksumsPath, `${checksumLines.join('\n')}\n`)

const missing = []
for (const file of MODEL_FILES) {
  if (!(await exists(join(dir, file.name)))) missing.push(file.name)
}

if (missing.length > 0) {
  console.error(`Incomplete pack; missing: ${missing.join(', ')}`)
  process.exit(1)
}

await writeFile(
  marker,
  [
    'ready',
    `# stamped ${new Date().toISOString()}`,
    '# rec: PaddlePaddle/arabic_PP-OCRv5_mobile_rec_onnx',
    '# det: PaddlePaddle/PP-OCRv5_mobile_det_onnx',
    '# dict: snowfluke/ppu-paddle-ocr-models arabic v5',
    '# runner: ppu-paddle-ocr + onnxruntime-node (main process)',
    '# Not medyas v6; not multilingual CJK/EN/JA PP-OCRv5.',
    ''
  ].join('\n'),
  'utf8'
)

console.log(`Done. Pack: ${dir}`)
console.log(`Ready marker: ${marker}`)
