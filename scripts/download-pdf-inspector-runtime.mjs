/**
 * Download pinned pdf-inspector offline assets into resources/pdf-inspector/.
 *
 * Default: PP-OCRv6 Small models (~31 MB). Pass --runtime to also fetch
 * platform PDFium + ONNX Runtime (hundreds of MB; gitignored).
 *
 * Usage:
 *   node scripts/download-pdf-inspector-runtime.mjs
 *   node scripts/download-pdf-inspector-runtime.mjs --models
 *   node scripts/download-pdf-inspector-runtime.mjs --runtime
 *   node scripts/download-pdf-inspector-runtime.mjs --all
 */

import { createHash } from 'node:crypto'
import { mkdir, rename, rm, writeFile, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputRoot = join(root, 'resources', 'pdf-inspector')
const modelDir = join(outputRoot, 'pp-ocrv6-small')
const runtimeDir = join(outputRoot, 'runtime')

const OAR_OCR_TAG = 'v0.7.0'
const MODEL_FILES = [
  {
    name: 'pp-ocrv6_small_det.onnx',
    url: `https://github.com/GreatV/oar-ocr/releases/download/${OAR_OCR_TAG}/pp-ocrv6_small_det.onnx`,
    sha256: 'd73e0058b7a8086bbd57f3d10b8bcd4ff95363f67e06e2762b5e814fe9c9410e'
  },
  {
    name: 'pp-ocrv6_small_rec.onnx',
    url: `https://github.com/GreatV/oar-ocr/releases/download/${OAR_OCR_TAG}/pp-ocrv6_small_rec.onnx`,
    sha256: '5435fd747c9e0efe15a96d0b378d5bd157e9492ed8fd80edf08f30d02fa24634'
  },
  {
    name: 'ppocrv6_dict.txt',
    url: `https://github.com/GreatV/oar-ocr/releases/download/${OAR_OCR_TAG}/ppocrv6_dict.txt`,
    sha256: 'b5f2bfe2bdd9448429e3e82b51c789775d9b42f2403d082b00662eb77e401c5d'
  }
]

/** Windows x64 preview pins — operators on other platforms should follow Firecrawl docs. */
const RUNTIME_WIN_X64 = [
  {
    name: 'firecrawl-pdfium-win-x64.tgz',
    url: 'https://github.com/firecrawl/pdfium-rs/releases/download/native-v7988/firecrawl-pdfium-win-x64.tgz',
    note: 'Extract pdfium.dll; set PDFIUM_LIB_PATH'
  },
  {
    name: 'onnxruntime-win-x64-1.27.0.zip',
    url: 'https://github.com/microsoft/onnxruntime/releases/download/v1.27.0/onnxruntime-win-x64-1.27.0.zip',
    note: 'Extract onnxruntime.dll; set ORT_DYLIB_PATH'
  }
]

const args = new Set(process.argv.slice(2))
const wantModels = args.size === 0 || args.has('--models') || args.has('--all')
const wantRuntime = args.has('--runtime') || args.has('--all')

async function download(url, destination, expectedSha256) {
  console.log(`Downloading ${url}`)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }
  const data = Buffer.from(await response.arrayBuffer())
  if (expectedSha256) {
    const digest = createHash('sha256').update(data).digest('hex')
    if (digest !== expectedSha256) {
      throw new Error(`Checksum mismatch for ${destination}: got ${digest}`)
    }
  }
  const temporary = `${destination}.tmp`
  await writeFile(temporary, data)
  await rm(destination, { force: true })
  await rename(temporary, destination)
  return createHash('sha256').update(data).digest('hex')
}

await mkdir(outputRoot, { recursive: true })
const checksumLines = []

if (wantModels) {
  await mkdir(modelDir, { recursive: true })
  for (const file of MODEL_FILES) {
    const dest = join(modelDir, file.name)
    try {
      const existing = await readFile(dest)
      const digest = createHash('sha256').update(existing).digest('hex')
      if (digest === file.sha256) {
        console.log(`  skip (ok): ${file.name}`)
        checksumLines.push(`${digest}  pp-ocrv6-small/${file.name}`)
        continue
      }
    } catch {
      // download
    }
    const digest = await download(file.url, dest, file.sha256)
    checksumLines.push(`${digest}  pp-ocrv6-small/${file.name}`)
    console.log(`  ${file.name}: ${(Buffer.byteLength(await readFile(dest)) / 1024 / 1024).toFixed(1)} MB`)
  }
}

if (wantRuntime) {
  await mkdir(runtimeDir, { recursive: true })
  console.log('Fetching runtime archives (not auto-extracted; see README.md)...')
  for (const file of RUNTIME_WIN_X64) {
    const dest = join(runtimeDir, file.name)
    await download(file.url, dest)
    const data = await readFile(dest)
    const digest = createHash('sha256').update(data).digest('hex')
    checksumLines.push(`${digest}  runtime/${file.name}`)
    console.log(`  ${file.name}: ${(data.byteLength / 1024 / 1024).toFixed(1)} MB — ${file.note}`)
  }
}

if (checksumLines.length > 0) {
  await writeFile(join(outputRoot, 'checksums.sha256'), `${checksumLines.join('\n')}\n`)
}

console.log(`Done. Models dir: ${modelDir}`)
if (!wantRuntime) {
  console.log('Tip: pass --runtime to download PDFium/ONNX archives for Windows x64.')
}
