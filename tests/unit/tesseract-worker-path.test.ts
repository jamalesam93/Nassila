import { describe, expect, it } from 'vitest'
import { resolveTesseractWorkerPaths } from '../../src/main/maktab/tesseract-ocr'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

describe('tesseract worker paths', () => {
  it('resolves worker-script and core wasm from node_modules', () => {
    const { workerPath, corePath } = resolveTesseractWorkerPaths(root)
    expect(existsSync(workerPath)).toBe(true)
    expect(existsSync(corePath)).toBe(true)
    expect(workerPath).toMatch(/worker-script[\\/]node[\\/]index\.js$/)
    expect(corePath).toMatch(/tesseract-core\.wasm\.js$/)
  })
})
