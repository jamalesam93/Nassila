import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it, vi } from 'vitest'
import {
  attachSourcePdf,
  clearSourceArtifactCache,
  loadSourceArtifact,
  sourceArtifactCacheInfo
} from '../../src/engine/manuscript/source-artifact-cache'

describe('source artifact cache', () => {
  it('extracts once for identical PDF bytes and reuses the SHA-256 cache', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nassila-source-cache-'))
    const firstPath = join(root, 'first.pdf')
    const movedPath = join(root, 'moved.pdf')
    const bytes = Buffer.from('%PDF-1.4 identical fixture')
    await writeFile(firstPath, bytes)
    await writeFile(movedPath, bytes)
    const extract = vi.fn(async () => ({
      text: 'Page one\n\nPage two',
      pageCount: 2,
      pageBoundaries: [
        { page: 1, start: 0, end: 8 },
        { page: 2, start: 10, end: 18 }
      ],
      warnings: [],
      tier: 'embedded_text' as const,
      languages: ['eng' as const],
      needsReview: false
    }))
    const cacheDirectory = join(root, 'cache')

    const first = await attachSourcePdf(firstPath, cacheDirectory, extract)
    const moved = await attachSourcePdf(movedPath, cacheDirectory, extract)

    expect(extract).toHaveBeenCalledTimes(1)
    expect(moved.sha256).toBe(first.sha256)
    expect(moved.extractedTextCacheKey).toBe(first.extractedTextCacheKey)
    await expect(loadSourceArtifact(moved, cacheDirectory)).resolves.toMatchObject({
      status: 'ready',
      text: 'Page one\n\nPage two'
    })
  })

  it('detects source bytes changed after attachment', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nassila-source-change-'))
    const filePath = join(root, 'paper.pdf')
    await writeFile(filePath, '%PDF-original')
    const artifact = await attachSourcePdf(filePath, join(root, 'cache'), async () => ({
      text: 'Original source',
      pageCount: 1,
      warnings: [],
      tier: 'embedded_text',
      languages: ['eng'],
      needsReview: false
    }))

    await writeFile(filePath, '%PDF-changed')

    await expect(loadSourceArtifact(artifact, join(root, 'cache'))).resolves.toMatchObject({
      status: 'changed'
    })
  })

  it('reports cache size in entries and bytes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nassila-source-info-'))
    const filePath = join(root, 'paper.pdf')
    await writeFile(filePath, '%PDF-cache-info')
    const cacheDirectory = join(root, 'cache')

    await expect(sourceArtifactCacheInfo(cacheDirectory)).resolves.toEqual({ count: 0, bytes: 0 })

    await attachSourcePdf(filePath, cacheDirectory, async () => ({
      text: 'Cached text',
      pageCount: 1,
      warnings: [],
      tier: 'embedded_text',
      languages: ['eng'],
      needsReview: false
    }))

    const info = await sourceArtifactCacheInfo(cacheDirectory)
    expect(info.count).toBe(1)
    expect(info.bytes).toBeGreaterThan(0)
  })

  it('clears only pinned sha256.json entries and leaves other files intact', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nassila-source-clear-'))
    const filePath = join(root, 'paper.pdf')
    await writeFile(filePath, '%PDF-clear-cache')
    const cacheDirectory = join(root, 'cache')
    await mkdir(cacheDirectory, { recursive: true })
    const unrelated = join(cacheDirectory, 'unrelated.json')
    await writeFile(unrelated, '{"keep": true}')
    const unrelatedNonJson = join(cacheDirectory, 'notes.txt')
    await writeFile(unrelatedNonJson, 'keep me')

    await attachSourcePdf(filePath, cacheDirectory, async () => ({
      text: 'Cached text',
      pageCount: 1,
      warnings: [],
      tier: 'embedded_text',
      languages: ['eng'],
      needsReview: false
    }))
    const before = await sourceArtifactCacheInfo(cacheDirectory)
    expect(before.count).toBe(1)

    const cleared = await clearSourceArtifactCache(cacheDirectory)
    expect(cleared.clearedCount).toBe(1)
    expect(cleared.freedBytes).toBe(before.bytes)
    await expect(sourceArtifactCacheInfo(cacheDirectory)).resolves.toEqual({ count: 0, bytes: 0 })

    await expect(readFile(unrelated, 'utf8')).resolves.toBe('{"keep": true}')
    await expect(readFile(unrelatedNonJson, 'utf8')).resolves.toBe('keep me')
  })

  it('re-extracts after the cache is cleared', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nassila-source-clear-roundtrip-'))
    const filePath = join(root, 'paper.pdf')
    await writeFile(filePath, '%PDF-roundtrip')
    const cacheDirectory = join(root, 'cache')
    const extract = vi.fn(async () => ({
      text: 'Roundtrip text',
      pageCount: 1,
      warnings: [],
      tier: 'embedded_text',
      languages: ['eng'],
      needsReview: false
    }))

    await attachSourcePdf(filePath, cacheDirectory, extract)
    await clearSourceArtifactCache(cacheDirectory)
    const artifact = await attachSourcePdf(filePath, cacheDirectory, extract)

    expect(extract).toHaveBeenCalledTimes(2)
    await expect(loadSourceArtifact(artifact, cacheDirectory)).resolves.toMatchObject({
      status: 'ready',
      text: 'Roundtrip text'
    })
  })
})
