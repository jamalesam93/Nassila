import { mkdtemp, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it, vi } from 'vitest'
import {
  attachSourcePdf,
  loadSourceArtifact
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
})
