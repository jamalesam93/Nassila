import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import {
  INDRA_MODEL_FILES,
  INDRA_MODEL_REVISION,
  fetchIndraRuntime,
  getIndraRuntimeStatus,
  indraRuntimePaths,
  resetIndraFetchState,
  resolveIndraRuntimeDirectory
} from '../../src/main/maktab/indra-runtime'

function hashesFor(payload: Buffer): Record<string, string> {
  const hash = createHash('sha256').update(payload).digest('hex')
  return Object.fromEntries(INDRA_MODEL_FILES.map((file) => [file, hash]))
}

describe('indra runtime directory', () => {
  it('uses NASSILA_INDRA_DIR when set, otherwise userData', () => {
    expect(resolveIndraRuntimeDirectory({ userDataPath: 'C:\\data', envDir: 'D:\\indra' })).toBe(
      'D:\\indra'
    )
    expect(resolveIndraRuntimeDirectory({ userDataPath: 'C:\\data' })).toBe(
      join('C:\\data', 'indra-ocr')
    )
  })

  it('stays not ready until the pinned model files are present', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'indra-status-'))
    expect((await getIndraRuntimeStatus(dir)).ready).toBe(false)
    expect((await getIndraRuntimeStatus(dir)).license).toContain('OpenRAIL')
  })
})

describe('fetchIndraRuntime', () => {
  it('downloads the pinned files, checks them, and does not provision Python', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'indra-fetch-'))
    const progress: string[] = []
    const payload = Buffer.from('weights')
    const fetchImpl = vi.fn(async (url: string) => {
      expect(url).toContain(`/resolve/${INDRA_MODEL_REVISION}/`)
      expect(url).not.toContain('/resolve/main/')
      return new Response(payload, { status: 200 })
    })

    const status = await fetchIndraRuntime(dir, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      hashes: hashesFor(payload),
      onProgress: (update) => progress.push(update.phase)
    })

    expect(fetchImpl).toHaveBeenCalledTimes(INDRA_MODEL_FILES.length)
    expect(progress).toContain('models')
    expect(progress).toContain('verify')
    expect(progress).not.toContain('venv')
    expect(progress).not.toContain('package')
    expect(status.ready).toBe(true)
    expect(status).not.toHaveProperty('packageVersion')

    const checksums = await readFile(join(dir, 'checksums.sha256'), 'utf8')
    expect(checksums.trim().split('\n')).toHaveLength(INDRA_MODEL_FILES.length)
    expect(checksums).toContain('det.onnx')
    const marker = JSON.parse(await readFile(indraRuntimePaths(dir).marker, 'utf8')) as {
      revision: string
    }
    expect(marker.revision).toBe(INDRA_MODEL_REVISION)
    await rm(dir, { recursive: true, force: true })
  })

  it('reuses cached models on a second run', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'indra-cache-'))
    const payload = Buffer.from('weights')
    const fetchImpl = vi.fn(async () => new Response(payload, { status: 200 }))
    const options = {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      hashes: hashesFor(payload)
    }
    await fetchIndraRuntime(dir, options)
    fetchImpl.mockClear()
    resetIndraFetchState()
    await fetchIndraRuntime(dir, options)
    expect(fetchImpl).not.toHaveBeenCalled()
    await rm(dir, { recursive: true, force: true })
  })

  it('rejects a file whose checksum does not match the pin', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'indra-bad-'))
    const fetchImpl = vi.fn(async () => new Response(Buffer.from('nope'), { status: 200 }))
    await expect(
      fetchIndraRuntime(dir, {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        hashes: { 'det.onnx': 'f'.repeat(64) }
      })
    ).rejects.toThrow(/Checksum mismatch/)
    await rm(dir, { recursive: true, force: true })
  })
})
