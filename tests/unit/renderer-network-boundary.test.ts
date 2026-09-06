import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Renderer network boundary (#21 packaged-parity batch).
 *
 * Production CSP is `connect-src 'self'` — the packaged renderer can only
 * reach the network through main-process IPC. Engine modules that fetch
 * (resolver index, online enhance, network/http) must never be imported by
 * renderer code outside the guarded fallbacks in use-citation-engine.ts.
 * If this test fails, route the new call site through a registry:* IPC
 * (see ipc-policy.ts) instead of importing the engine module directly.
 */

const testDir = dirname(fileURLToPath(import.meta.url))
const rendererDir = join(testDir, '..', '..', 'src', 'renderer')

/** Renderer files allowed to import network-bound engine modules (IPC-guarded fallbacks). */
const ALLOWED = ['hooks/use-citation-engine.ts']

const NETWORK_BOUND_IMPORT = /from\s+['"][^'"]*engine\/(?:resolver(?:\/|['"])|autocorrect\/enhance|network\/http)/

/** Native OCR / napi must stay in main — renderer uses maktab:* IPC only. */
const NATIVE_OCR_IMPORT =
  /from\s+['"][^'"]*(?:maktab\/native-pdf-inspector|@firecrawl\/pdf-inspector(?:-wasm)?['"]|main\/maktab\/)/

/** Type-only IPC adapters may import native-backend interfaces. */
const NATIVE_OCR_ALLOWED = new Set(['maktab/register-maktab-ocr.ts'])

function tsFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) files.push(...tsFiles(path))
    else if (/\.(ts|tsx)$/.test(entry)) files.push(path)
  }
  return files
}

describe('renderer network boundary', () => {
  it('imports network-bound engine modules only from guarded fallback sites', () => {
    const violations: string[] = []

    for (const file of tsFiles(rendererDir)) {
      const rel = relative(rendererDir, file).replace(/\\/g, '/')
      if (ALLOWED.includes(rel)) continue
      const source = readFileSync(file, 'utf-8')
      if (NETWORK_BOUND_IMPORT.test(source)) {
        violations.push(rel)
      }
    }

    expect(
      violations,
      `Renderer files import network-bound engine modules directly: ${violations.join(', ')}. ` +
        'Route them through a registry:* IPC handler instead (packaged CSP blocks renderer fetch).'
    ).toEqual([])
  })

  it('keeps the guarded fallback site wired to the IPC surface it falls back from', () => {
    const engine = readFileSync(join(rendererDir, 'hooks', 'use-citation-engine.ts'), 'utf-8')
    expect(engine).toContain('window.api?.lookupRaqimCandidates')
    expect(engine).toContain('window.api?.enhanceCitations')
    expect(engine).toContain('window.api?.resolveIdentifiers')
    expect(engine).toContain('window.api?.verifyUnifiedRegistry')
  })

  it('keeps native pdf-inspector and main OCR backends out of the renderer', () => {
    const violations: string[] = []
    for (const file of tsFiles(rendererDir)) {
      const rel = relative(rendererDir, file).replace(/\\/g, '/')
      if (NATIVE_OCR_ALLOWED.has(rel)) continue
      const source = readFileSync(file, 'utf-8')
      if (NATIVE_OCR_IMPORT.test(source)) violations.push(rel)
    }
    expect(
      violations,
      `Renderer imported native OCR/main backends: ${violations.join(', ')}. Use window.api.maktabNative* / maktabOcr* IPC.`
    ).toEqual([])
  })
})
