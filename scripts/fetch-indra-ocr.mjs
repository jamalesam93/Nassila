/**
 * Fetch the Indra OCR runtime (first-run setup; nothing is bundled).
 *
 * - downloads the model files from huggingface.co/datalab-to/indra-ocr
 * - creates a local Python venv and installs the pinned `indra-ocr` package
 * - verifies the import and writes a ready marker + checksums
 *
 * Usage:
 *   npm run ocr:indra-fetch
 *   node scripts/fetch-indra-ocr.mjs [--force] [--dir <path>] [--version 1.1.2]
 *
 * Env:
 *   NASSILA_INDRA_DIR   destination (default resources/indra-ocr)
 *
 * Weights are a modified OpenRAIL-M license: they are fetched, never committed
 * or bundled. See resources/indra-ocr/README.md before packaging.
 */
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const value = (name, fallback) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}

const DEST = resolve(value('--dir', process.env.NASSILA_INDRA_DIR || join(root, 'resources', 'indra-ocr')))
const MODELS = join(DEST, 'models')
const VENV = join(DEST, 'venv')
const MARKER = join(DEST, '.nassila-indra-ocr-ready')
const CHECKSUMS = join(DEST, 'checksums.sha256')
const VERSION = value('--version', '1.1.2')
const REPO = 'datalab-to/indra-ocr'
const FORCE = flag('--force')

const MODEL_FILES = [
  'det.onnx',
  'lm.npz',
  'lm_cjk.npz',
  'lm_world.npz',
  'math_dec_init.onnx',
  'math_dec_step.onnx',
  'math_enc.onnx',
  'mathcls.onnx',
  'meta.json',
  'order.onnx',
  'orient.onnx',
  'rec.onnx',
  'rec_cjk.onnx',
  'rec_rtl.onnx',
  'rec_world.onnx',
  'script.onnx',
  'LICENSE'
]

const info = (msg) => console.log(`[indra-fetch] ${msg}`)
const fail = (msg) => {
  console.error(`[indra-fetch] ERROR: ${msg}`)
  process.exit(1)
}

function run(command, commandArgs, opts = {}) {
  const result = spawnSync(command, commandArgs, { stdio: 'inherit', ...opts })
  return result.status === 0
}

function hasCommand(name) {
  const probe = spawnSync(name, ['--version'], { stdio: 'ignore', shell: process.platform === 'win32' })
  return probe.status === 0
}

function venvPython() {
  return process.platform === 'win32'
    ? join(VENV, 'Scripts', 'python.exe')
    : join(VENV, 'bin', 'python')
}

async function download(url, destination) {
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  const data = Buffer.from(await response.arrayBuffer())
  const temporary = `${destination}.tmp`
  await writeFile(temporary, data)
  await rm(destination, { force: true })
  await rename(temporary, destination)
  return { bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') }
}

async function readMarker() {
  try {
    return JSON.parse(await readFile(MARKER, 'utf8'))
  } catch {
    return null
  }
}

async function main() {
  await mkdir(MODELS, { recursive: true })

  const marker = await readMarker()
  const modelsReady =
    !FORCE && MODEL_FILES.every((f) => existsSync(join(MODELS, f))) && existsSync(venvPython())
  if (modelsReady && marker?.packageVersion) {
    const check = spawnSync(venvPython(), ['-c', 'import indra_ocr'], { stdio: 'ignore' })
    if (check.status === 0) {
      info(`already ready: ${DEST} (indra-ocr ${marker.packageVersion})`)
      return
    }
  }

  info(`destination ${DEST}`)
  info(`fetching ${MODEL_FILES.length} files from huggingface.co/${REPO}`)
  const checksums = []
  for (const file of MODEL_FILES) {
    const target = join(MODELS, file)
    if (!FORCE && existsSync(target)) {
      const data = await readFile(target)
      checksums.push(`${createHash('sha256').update(data).digest('hex')}  ${file}`)
      info(`  = ${file} (cached)`)
      continue
    }
    const url = `https://huggingface.co/${REPO}/resolve/main/${file}`
    const { bytes, sha256 } = await download(url, target)
    checksums.push(`${sha256}  ${file}`)
    info(`  + ${file} (${(bytes / 1048576).toFixed(1)} MB)`)
  }
  await writeFile(CHECKSUMS, checksums.join('\n') + '\n', 'utf8')

  // ---- Python environment --------------------------------------------------
  const uv = hasCommand('uv')
  if (!existsSync(venvPython())) {
    info(`creating venv with ${uv ? 'uv' : 'python -m venv'}`)
    const created = uv
      ? run('uv', ['venv', VENV, '--python', 'python'])
      : run('python', ['-m', 'venv', VENV])
    if (!created) fail('could not create the Python venv')
  }

  info(`installing indra-ocr==${VERSION}${uv ? ' with uv' : ' with pip'}`)
  const installed = uv
    ? run('uv', ['pip', 'install', '--python', venvPython(), `indra-ocr==${VERSION}`])
    : run(venvPython(), ['-m', 'pip', 'install', '--disable-pip-version-check', `indra-ocr==${VERSION}`])
  if (!installed) {
    fail(
      'could not install indra-ocr. pip can hang behind some proxies — install uv ' +
        '(https://docs.astral.sh/uv/) and re-run.'
    )
  }

  const versionCheck = spawnSync(
    venvPython(),
    ['-c', 'import indra_ocr, sys; print("indra_ocr", getattr(indra_ocr, "__version__", "unknown"))'],
    { encoding: 'utf8' }
  )
  if (versionCheck.status !== 0) fail(`import check failed:\n${versionCheck.stderr || versionCheck.stdout}`)
  info(versionCheck.stdout.trim())

  const pythonVersion = spawnSync(venvPython(), ['--version'], { encoding: 'utf8' }).stdout.trim()
  await writeFile(
    MARKER,
    JSON.stringify(
      {
        packageVersion: VERSION,
        python: venvPython(),
        pythonVersion,
        modelDirectory: MODELS,
        fetchedAt: new Date().toISOString(),
        license: 'modified OpenRAIL-M (see models/LICENSE) — fetched, not redistributed'
      },
      null,
      2
    ) + '\n',
    'utf8'
  )
  info(`ready: ${MARKER}`)
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)))
