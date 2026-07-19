import { createHash } from 'node:crypto'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { extractFromPdf } from '../maktab/extract'
import type { MaktabExtractionResult } from '../maktab/types'
import type {
  LoadedSourceArtifact,
  SourceArtifact,
  SourcePageBoundary
} from '../../shared/source-artifact'

const CACHE_VERSION = 1
const MAX_SOURCE_PDF_BYTES = 100 * 1024 * 1024

type ExtractPdf = (buffer: ArrayBuffer) => Promise<MaktabExtractionResult>

interface CachedSourceExtraction {
  version: typeof CACHE_VERSION
  sha256: string
  sourceHash: string
  text: string
  tier: SourceArtifact['tier']
  languages: SourceArtifact['languages']
  warnings: string[]
  pageCount: number
  pageBoundaries: SourcePageBoundary[]
}

export async function attachSourcePdf(
  filePath: string,
  cacheDirectory: string,
  extract: ExtractPdf = (buffer) => extractFromPdf(buffer, { mode: 'auto' }),
  now: () => Date = () => new Date()
): Promise<SourceArtifact> {
  if (extname(filePath).toLowerCase() !== '.pdf') {
    throw new Error('Attached source must be a PDF file.')
  }

  const file = await readFile(filePath)
  if (file.byteLength > MAX_SOURCE_PDF_BYTES) {
    throw new Error('Attached source PDF exceeds the 100 MB safety limit.')
  }
  const sha256 = hashBytes(file)
  const sourceHash = `sha256:${sha256}`
  const cachePath = cacheFilePath(cacheDirectory, sha256)
  let cached = await readCachedExtraction(cachePath, sha256)

  if (!cached) {
    const arrayBuffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)
    const extracted = await extract(arrayBuffer)
    cached = {
      version: CACHE_VERSION,
      sha256,
      sourceHash,
      text: extracted.text,
      tier: extracted.tier,
      languages: extracted.languages,
      warnings: extracted.warnings,
      pageCount: extracted.pageCount,
      pageBoundaries: extracted.pageBoundaries ?? buildPageBoundaries(extracted.text, extracted.pageCount)
    }
    await mkdir(cacheDirectory, { recursive: true })
    await writeFile(cachePath, JSON.stringify(cached), 'utf8')
  }

  return {
    path: filePath,
    sha256,
    sourceHash,
    size: file.byteLength,
    extractedTextCacheKey: `source-pdf:${sha256}`,
    tier: cached.tier,
    languages: cached.languages,
    warnings: cached.warnings,
    pageCount: cached.pageCount,
    pageBoundaries: cached.pageBoundaries,
    attachedAt: now().toISOString()
  }
}

export async function loadSourceArtifact(
  artifact: SourceArtifact,
  cacheDirectory: string
): Promise<LoadedSourceArtifact> {
  let file: Buffer
  try {
    file = await readFile(artifact.path)
  } catch {
    return { status: 'missing', artifact }
  }

  const actualSha256 = hashBytes(file)
  if (actualSha256 !== artifact.sha256) {
    return { status: 'changed', artifact, actualSha256 }
  }

  const cached = await readCachedExtraction(cacheFilePath(cacheDirectory, artifact.sha256), artifact.sha256)
  if (!cached) return { status: 'missing', artifact }
  return { status: 'ready', artifact, text: cached.text }
}

export function sourceArtifactCacheDirectory(userDataPath: string): string {
  return join(userDataPath, 'source-artifacts')
}

function cacheFilePath(cacheDirectory: string, sha256: string): string {
  return join(cacheDirectory, `${sha256}.json`)
}

async function readCachedExtraction(
  cachePath: string,
  sha256: string
): Promise<CachedSourceExtraction | null> {
  try {
    const cacheStat = await stat(cachePath)
    if (!cacheStat.isFile() || cacheStat.size > 20_000_000) return null
    const parsed = JSON.parse(await readFile(cachePath, 'utf8')) as Partial<CachedSourceExtraction>
    if (
      parsed.version !== CACHE_VERSION ||
      parsed.sha256 !== sha256 ||
      parsed.sourceHash !== `sha256:${sha256}` ||
      typeof parsed.text !== 'string' ||
      (parsed.tier !== 'embedded_text' && parsed.tier !== 'ocr') ||
      !Array.isArray(parsed.languages) ||
      !Array.isArray(parsed.warnings) ||
      !Number.isSafeInteger(parsed.pageCount) ||
      !Array.isArray(parsed.pageBoundaries)
    ) {
      return null
    }
    return parsed as CachedSourceExtraction
  } catch {
    return null
  }
}

function hashBytes(buffer: Uint8Array): string {
  return createHash('sha256').update(buffer).digest('hex')
}

function buildPageBoundaries(text: string, pageCount: number): SourcePageBoundary[] {
  if (pageCount <= 0) return []
  const length = text.length
  return Array.from({ length: pageCount }, (_, index) => ({
    page: index + 1,
    start: Math.floor((length * index) / pageCount),
    end: Math.floor((length * (index + 1)) / pageCount)
  }))
}
