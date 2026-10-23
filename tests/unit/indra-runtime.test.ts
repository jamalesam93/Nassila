import { mkdtemp, mkdir, readFile, rm, writeFile, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import {
  INDRA_MODEL_FILES,
  fetchIndraRuntime,
  getIndraRuntimeStatus,
  indraRuntimePaths,
  indraVenvPython,
  resolveIndraRuntimeDirectory
} from '../../src/main/maktab/indra-runtime'

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function seedReadyRuntime(dir: string): Promise<void> {
  const paths = indraRuntimePaths(dir)
  await mkdir(paths.models, { recursive: true })
  for (const file of INDRA_MODEL_FILES) await writeFile(join(paths.models, file), 'x')
  await writeFile(
    paths.marker,
    JSON.stringify({ packageVersion: '1.1.2', python: indraVenvPython(dir) })
  )
  const python = indraVenvPython(dir)
  await mkdir(join(dir, 'venv', process.platform === 'win32' ? 'Scripts' : 'bin'), {
    recursive: true
  })
  await writeFile(python, '')
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

  it('reports ready only when marker, models and Python env are present', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'indra-status-'))
    expect((await getIndraRuntimeStatus(dir)).ready).toBe(false)

    await seedReadyRuntime(dir)
    const status = await getIndraRuntimeStatus(dir)
    expect(status.ready).toBe(true)
    expect(status.packageVersion).toBe('1.1.2')
    expect(status.modelBytes).toBe(INDRA_MODEL_FILES.length)
    expect(status.license).toContain('OpenRAIL')
  })

  it('reports not ready when the marker disappears', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'indra-status2-'))
    await seedReadyRuntime(dir)
    await rm(indraRuntimePaths(dir).marker)
    expect((await getIndraRuntimeStatus(dir)).ready).toBe(false)
  })
})

describe('fetchIndraRuntime', () => {
  it('downloads models, provisions the env and writes the marker', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'indra-fetch-'))
    const progress: string[] = []
    const payload = Buffer.from('weights')
    const fetchImpl = vi.fn(async () => new Response(payload, { status: 200 }))
    const run = vi.fn(async (command: string, args: string[]) => {
      if (args.includes('venv')) {
        const python = indraVenvPython(dir)
        await mkdir(join(dir, 'venv', process.platform === 'win32' ? 'Scripts' : 'bin'), {
          recursive: true
        })
        await writeFile(python, '')
      }
      return true
    })

    const status = await fetchIndraRuntime(dir, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      run,
      onProgress: (p) => progress.push(p.phase)
    })

    expect(fetchImpl).toHaveBeenCalledTimes(INDRA_MODEL_FILES.length)
    expect(progress).toContain('models')
    expect(progress).toContain('venv')
    expect(progress).toContain('package')
    expect(progress).toContain('verify')
    expect(status.ready).toBe(true)
    expect(status.packageVersion).toBe('1.1.2')

    for (const file of INDRA_MODEL_FILES) {
      expect(await exists(join(indraRuntimePaths(dir).models, file))).toBe(true)
    }
    const checksums = await readFile(join(dir, 'checksums.sha256'), 'utf8')
    expect(checksums.trim().split('\n')).toHaveLength(INDRA_MODEL_FILES.length)
    expect(checksums).toContain('det.onnx')
  })

  it('reuses cached models on a second run', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'indra-cache-'))
    const fetchImpl = vi.fn(async () => new Response(Buffer.from('w'), { status: 200 }))
    const run = vi.fn(async (command: string, args: string[]) => {
      if (args.includes('venv')) {
        const python = indraVenvPython(dir)
        await mkdir(join(dir, 'venv', process.platform === 'win32' ? 'Scripts' : 'bin'), {
          recursive: true
        })
        await writeFile(python, '')
      }
      return true
    })
    await fetchIndraRuntime(dir, { fetchImpl: fetchImpl as unknown as typeof fetch, run })
    fetchImpl.mockClear()
    await fetchIndraRuntime(dir, { fetchImpl: fetchImpl as unknown as typeof fetch, run })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('throws a helpful error when no Python environment can be created', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'indra-fail-'))
    const fetchImpl = vi.fn(async () => new Response(Buffer.from('w'), { status: 200 }))
    await expect(
      fetchIndraRuntime(dir, {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        run: async () => false
      })
    ).rejects.toThrow(/Python environment/i)
  })
})
