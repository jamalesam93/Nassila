/**
 * Indra OCR candidate runtime (main process).
 *
 * Fetched on first use, never bundled: the weights use a modified OpenRAIL-M
 * license (see resources/indra-ocr/README.md). Download + Python provisioning
 * mirror scripts/fetch-indra-ocr.mjs so the operator CLI and the app agree.
 *
 * SEC: the destination is fixed (userData/indra-ocr or NASSILA_INDRA_DIR); the
 * renderer never supplies a path, a URL or command arguments.
 */
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import {
  INDRA_LICENSE_LABEL,
  type IndraFetchProgress,
  type IndraRuntimeStatus
} from '../../shared/indra-runtime'

export const INDRA_OCR_REPO = 'datalab-to/indra-ocr'
export const INDRA_PACKAGE_VERSION = '1.1.2'
export const INDRA_MARKER_FILE = '.nassila-indra-ocr-ready'

/** Files the `indra-ocr` package needs; `model.safetensors` and assets are not used. */
export const INDRA_MODEL_FILES: readonly string[] = [
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

export interface IndraRuntimePaths {
  directory: string
  models: string
  venv: string
  marker: string
}

export function resolveIndraRuntimeDirectory(options: {
  userDataPath: string
  envDir?: string
}): string {
  if (options.envDir && options.envDir.length > 0) return options.envDir
  return join(options.userDataPath, 'indra-ocr')
}

export function indraRuntimePaths(directory: string): IndraRuntimePaths {
  return {
    directory,
    models: join(directory, 'models'),
    venv: join(directory, 'venv'),
    marker: join(directory, INDRA_MARKER_FILE)
  }
}

export function indraVenvPython(directory: string): string {
  return process.platform === 'win32'
    ? join(directory, 'venv', 'Scripts', 'python.exe')
    : join(directory, 'venv', 'bin', 'python')
}

async function readMarker(directory: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await readFile(indraRuntimePaths(directory).marker, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

async function modelsBytes(modelsDirectory: string): Promise<number> {
  let total = 0
  for (const file of INDRA_MODEL_FILES) {
    try {
      total += (await stat(join(modelsDirectory, file))).size
    } catch {
      // missing file: contributes nothing
    }
  }
  return total
}

export async function getIndraRuntimeStatus(directory: string): Promise<IndraRuntimeStatus> {
  const paths = indraRuntimePaths(directory)
  const marker = await readMarker(directory)
  const python = indraVenvPython(directory)
  const filesPresent = INDRA_MODEL_FILES.every((file) => existsSync(join(paths.models, file)))
  return {
    ready: Boolean(marker) && filesPresent && existsSync(python),
    directory,
    modelBytes: await modelsBytes(paths.models),
    packageVersion:
      marker && typeof marker.packageVersion === 'string' ? marker.packageVersion : null,
    license: INDRA_LICENSE_LABEL
  }
}

export type IndraCommandRunner = (
  command: string,
  args: string[],
  options?: { cwd?: string }
) => Promise<boolean>

function defaultRunner(): IndraCommandRunner {
  return (command, args, options) =>
    new Promise((resolve) => {
      try {
        const child = spawn(command, args, {
          cwd: options?.cwd,
          stdio: 'ignore',
          windowsHide: true
        })
        child.on('error', () => resolve(false))
        child.on('close', (code) => resolve(code === 0))
      } catch {
        resolve(false)
      }
    })
}

export interface FetchIndraOptions {
  force?: boolean
  fetchImpl?: typeof fetch
  run?: IndraCommandRunner
  onProgress?: (progress: IndraFetchProgress) => void
}

async function download(
  fetchImpl: typeof fetch,
  url: string,
  destination: string
): Promise<{ sha256: string; bytes: number }> {
  const response = await fetchImpl(url, { redirect: 'follow' })
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  const data = Buffer.from(await response.arrayBuffer())
  const temporary = `${destination}.tmp`
  await writeFile(temporary, data)
  await rm(destination, { force: true })
  await rename(temporary, destination)
  return { sha256: createHash('sha256').update(data).digest('hex'), bytes: data.length }
}

export async function fetchIndraRuntime(
  directory: string,
  options: FetchIndraOptions = {}
): Promise<IndraRuntimeStatus> {
  const paths = indraRuntimePaths(directory)
  const fetchImpl = options.fetchImpl ?? fetch
  const run = options.run ?? defaultRunner()
  const progress = (update: IndraFetchProgress): void => options.onProgress?.(update)

  await mkdir(paths.models, { recursive: true })

  // ---- model files ---------------------------------------------------------
  const checksums: string[] = []
  for (const [index, file] of INDRA_MODEL_FILES.entries()) {
    const target = join(paths.models, file)
    if (!options.force && existsSync(target)) {
      const existing = await readFile(target)
      checksums.push(`${createHash('sha256').update(existing).digest('hex')}  ${file}`)
      progress({ phase: 'models', completed: index + 1, total: INDRA_MODEL_FILES.length, message: file })
      continue
    }
    const url = `https://huggingface.co/${INDRA_OCR_REPO}/resolve/main/${file}`
    const result = await download(fetchImpl, url, target)
    checksums.push(`${result.sha256}  ${file}`)
    progress({ phase: 'models', completed: index + 1, total: INDRA_MODEL_FILES.length, message: file })
  }
  await writeFile(join(directory, 'checksums.sha256'), checksums.join('\n') + '\n', 'utf8')

  // ---- Python environment --------------------------------------------------
  const python = indraVenvPython(directory)
  const hasUv = await run('uv', ['--version'])
  if (!existsSync(python)) {
    progress({ phase: 'venv', completed: 0, total: 1, message: hasUv ? 'uv venv' : 'python -m venv' })
    let created = hasUv
      ? await run('uv', ['venv', paths.venv, '--python', 'python'])
      : await run('python', ['-m', 'venv', paths.venv])
    // No discoverable system Python: uv can provision its own managed 3.12.
    if (!created && hasUv) {
      created = await run('uv', ['venv', paths.venv, '--python', '3.12'])
    }
    if (!created) {
      throw new Error(
        'Could not create the Python environment for Indra OCR. Install uv (https://docs.astral.sh/uv/) or Python 3.10+ and retry.'
      )
    }
    progress({ phase: 'venv', completed: 1, total: 1 })
  }

  progress({ phase: 'package', completed: 0, total: 1, message: `indra-ocr==${INDRA_PACKAGE_VERSION}` })
  const installed = hasUv
    ? await run('uv', ['pip', 'install', '--python', python, `indra-ocr==${INDRA_PACKAGE_VERSION}`])
    : await run(python, [
        '-m',
        'pip',
        'install',
        '--disable-pip-version-check',
        `indra-ocr==${INDRA_PACKAGE_VERSION}`
      ])
  if (!installed) {
    throw new Error(
      'Could not install the indra-ocr package. pip can hang behind some proxies — install uv and retry.'
    )
  }
  progress({ phase: 'package', completed: 1, total: 1, message: `indra-ocr==${INDRA_PACKAGE_VERSION}` })

  progress({ phase: 'verify', completed: 0, total: 1 })
  if (!(await run(python, ['-c', 'import indra_ocr']))) {
    throw new Error('The indra-ocr package was installed but cannot be imported.')
  }
  progress({ phase: 'verify', completed: 1, total: 1 })

  await writeFile(
    paths.marker,
    JSON.stringify(
      {
        packageVersion: INDRA_PACKAGE_VERSION,
        python,
        modelDirectory: paths.models,
        fetchedAt: new Date().toISOString(),
        license: `${INDRA_LICENSE_LABEL} (see models/LICENSE) — fetched, not redistributed`
      },
      null,
      2
    ) + '\n',
    'utf8'
  )

  return getIndraRuntimeStatus(directory)
}

let activeFetch: Promise<IndraRuntimeStatus> | null = null

/** Coalesces concurrent fetch requests (double-click, two windows). */
export function fetchIndraRuntimeOnce(
  directory: string,
  options: FetchIndraOptions = {}
): Promise<IndraRuntimeStatus> {
  if (activeFetch) return activeFetch
  activeFetch = fetchIndraRuntime(directory, options).finally(() => {
    activeFetch = null
  })
  return activeFetch
}

/** Test hook. */
export function resetIndraFetchState(): void {
  activeFetch = null
}
