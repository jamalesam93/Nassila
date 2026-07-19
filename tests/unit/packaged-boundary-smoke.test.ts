/**
 * Packaged / production-boundary smoke checks that do not need a GUI.
 * Complements tests/smoke/PACKAGED_AUDIT_SMOKE.md (manual CSP audit).
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { productionContentSecurityPolicy } from '../../src/shared/content-security-policy'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

describe('packaged production boundaries', () => {
  it('CSP forces IPC-only network from the renderer', () => {
    const csp = productionContentSecurityPolicy()
    expect(csp).toContain("connect-src 'self'")
    expect(csp).not.toMatch(/connect-src[^;]*https?:/)
  })

  it('preload exposes manuscript audit + registry IPC', () => {
    const preload = readFileSync(join(root, 'src/preload/index.ts'), 'utf8')
    expect(preload).toContain('startManuscriptAudit')
    expect(preload).toContain('registry:resolveManuscriptItem')
    expect(preload).toContain('registry:alignManuscriptMetadata')
  })

  it('renderer audit hook only starts/cancels via IPC (no direct registry resolve)', () => {
    const hook = readFileSync(join(root, 'src/renderer/hooks/use-manuscript-audit.ts'), 'utf8')
    expect(hook).not.toMatch(/import\s*\{[^}]*resolveRegistry/)
    expect(hook).toContain('startManuscriptAudit')
    expect(hook).toContain('cancelManuscriptAudit')
  })

  it('main audit path owns registry resolve', () => {
    const main = readFileSync(join(root, 'src/main/ipc-manuscript-audit.ts'), 'utf8')
    expect(main).toMatch(/resolveRegistry|resolveManuscript/)
  })

  it('bundled OCR packs exist for offline first-use', () => {
    for (const lang of ['eng', 'fra', 'ara']) {
      const path = join(root, 'resources/tesseract', `${lang}.traineddata`)
      expect(existsSync(path), `missing ${lang}.traineddata`).toBe(true)
    }
  })
})
