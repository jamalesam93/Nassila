/**
 * Indra OCR model download (main process).
 *
 * The weights use a modified OpenRAIL-M license, so they are fetched on
 * demand and never bundled. The app runs them with onnxruntime-node; nothing
 * here installs Python or the `indra-ocr` package.
 *
 * SEC: the destination is fixed (userData/indra-ocr or NASSILA_INDRA_DIR).
 * The renderer never supplies a path or a URL.
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import {
  INDRA_LICENSE_LABEL,
  type IndraFetchProgress,
  type IndraRuntimeStatus
} from '../../shared/indra-runtime'

export const INDRA_OCR_REPO = 'datalab-to/indra-ocr'
/** Tag the in-app port was checked against. `main` moves; this tag does not. */
export const INDRA_MODEL_REVISION = 'v1.1.0'
export const INDRA_MARKER_FILE = '.nassila-indra-ocr-ready'

/**
 * Files the Arabic path runs. SHA-256 pins match Hugging Face `v1.1.0`
 * (onnx files via their LFS oid; meta.json and LICENSE hashed from that tag).
 * The CJK, math, and language-model files are not used.
 */
export const INDRA_MODEL_SHA256 = {
  'det.onnx': 'f2bd4cba23e9c328cf7ec824634e423e191a2c6aacbbf35c62bd79dd70f62f59',
  'script.onnx': 'b6ce4e926e19c243faaf37bd46880398bf2cb4ae56a29e1177a3b017c1280e36',
  'rec.onnx': '475972a2710be4a3cbfeb2bc7f3624ffd563de07de42476fc7a290d4e1ece484',
  'rec_rtl.onnx': '468796bd684486a8388c30c8b4ed2a26e3eeb1f8ff02831c24c2e12c79a2a834',
  'orient.onnx': '20eaf670f55a7cf9facfe1bdd6c7b8e40be75bbf4d48a3df43f66aa3bbd874fd',
  'order.onnx': 'a42db2e8b536ad3d84045a4b7f9b0a72667cf8be4aa02d63f7b38004719fb180',
  'meta.json': '4ce4c94b46f5d644033c02e718322014ff4081270f385038c571912b56696339',
  LICENSE: '50c88a018a7ee322e89f6b09401b237beb0cd331685879405b3db48993950a5f'
} as const

export const INDRA_MODEL_FILES: readonly string[] = Object.keys(INDRA_MODEL_SHA256)

export interface IndraRuntimePaths {
  directory: string
  models: string
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
    marker: join(directory, INDRA_MARKER_FILE)
  }
}

function sha256(bytes: Buffer | Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

export function indraFileMatches(path: string, expected: string): boolean {
  if (!existsSync(path)) return false
  return sha256(readFileSync(path)) === expected
}

const readyCache = new Set<string>()

/** True when every pinned model file is present and unmodified. */
export function isIndraModelReady(
  modelsDirectory: string,
  hashes: Readonly<Record<string, string>> = INDRA_MODEL_SHA256
): boolean {
  const production = hashes === INDRA_MODEL_SHA256
  if (production && readyCache.has(modelsDirectory)) return true
  const ready = Object.entries(hashes).every(([file, expected]) =>
    indraFileMatches(join(modelsDirectory, file), expected)
  )
  if (ready && production) readyCache.add(modelsDirectory)
  return ready
}

export function resetIndraReadyCache(): void {
  readyCache.clear()
}

async function modelsBytes(modelsDirectory: string): Promise<number> {
  let total = 0
  for (const file of INDRA_MODEL_FILES) {
    try {
      total += (await stat(join(modelsDirectory, file))).size
    } catch {
      // A missing file contributes nothing.
    }
  }
  return total
}

export async function getIndraRuntimeStatus(directory: string): Promise<IndraRuntimeStatus> {
  const paths = indraRuntimePaths(directory)
  return {
    ready: isIndraModelReady(paths.models),
    directory,
    modelBytes: await modelsBytes(paths.models),
    license: INDRA_LICENSE_LABEL
  }
}

export interface FetchIndraOptions {
  force?: boolean
  fetchImpl?: typeof fetch
  /** Test override. Production uses `INDRA_MODEL_SHA256`. */
  hashes?: Readonly<Record<string, string>>
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
  return { sha256: sha256(data), bytes: data.length }
}

export async function fetchIndraRuntime(
  directory: string,
  options: FetchIndraOptions = {}
): Promise<IndraRuntimeStatus> {
  const paths = indraRuntimePaths(directory)
  const fetchImpl = options.fetchImpl ?? fetch
  const hashes = options.hashes ?? INDRA_MODEL_SHA256
  const files = Object.keys(hashes)
  const progress = (update: IndraFetchProgress): void => options.onProgress?.(update)

  await mkdir(paths.models, { recursive: true })

  const checksums: string[] = []
  for (const [index, file] of files.entries()) {
    const target = join(paths.models, file)
    const expected = hashes[file as keyof typeof hashes]
    if (!options.force && indraFileMatches(target, expected)) {
      checksums.push(`${expected}  ${file}`)
      progress({ phase: 'models', completed: index + 1, total: files.length, message: file })
      continue
    }
    const url = `https://huggingface.co/${INDRA_OCR_REPO}/resolve/${INDRA_MODEL_REVISION}/${file}?download=true`
    const result = await download(fetchImpl, url, target)
    if (result.sha256 !== expected) {
      await rm(target, { force: true })
      throw new Error(`Checksum mismatch for ${file}`)
    }
    checksums.push(`${result.sha256}  ${file}`)
    progress({ phase: 'models', completed: index + 1, total: files.length, message: file })
  }
  await writeFile(join(directory, 'checksums.sha256'), checksums.join('\n') + '\n', 'utf8')

  progress({ phase: 'verify', completed: 0, total: 1 })
  const verified = isIndraModelReady(paths.models, hashes)
  if (!verified) {
    throw new Error('Indra models failed verification after download.')
  }
  progress({ phase: 'verify', completed: 1, total: 1 })

  await writeFile(
    paths.marker,
    JSON.stringify(
      {
        revision: INDRA_MODEL_REVISION,
        modelDirectory: paths.models,
        fetchedAt: new Date().toISOString(),
        license: `${INDRA_LICENSE_LABEL} (see models/LICENSE) — fetched, not redistributed`
      },
      null,
      2
    ) + '\n',
    'utf8'
  )

  const status = await getIndraRuntimeStatus(directory)
  return hashes === INDRA_MODEL_SHA256 ? status : { ...status, ready: true }
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
  resetIndraReadyCache()
}
