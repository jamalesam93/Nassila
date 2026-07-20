import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

describe('canvas native packaging for Maktab OCR', () => {
  it('keeps canvas external in the main Vite build', () => {
    const viteCfg = readFileSync(join(root, 'electron.vite.config.ts'), 'utf8')
    expect(viteCfg).toMatch(/MAIN_NATIVE_EXTERNALS\s*=\s*\[[^\]]*['"]canvas['"]/)
    expect(viteCfg).toMatch(/external:\s*\[\s*\.\.\.MAIN_NATIVE_EXTERNALS\s*\]/)
  })

  it('canvas Release ships companion natives (Windows DLLs / shared libs)', () => {
    const require = createRequire(join(root, 'package.json'))
    const releaseDir = join(dirname(require.resolve('canvas/package.json')), 'build', 'Release')
    expect(existsSync(releaseDir), 'canvas build/Release missing — run npm install').toBe(true)
    expect(existsSync(join(releaseDir, 'canvas.node'))).toBe(true)
    const companions = readdirSync(releaseDir).filter((name) =>
      /\.(dll|dylib|so(\.\d+)*)$/i.test(name)
    )
    expect(companions.length).toBeGreaterThan(0)
  })

  it('electron-builder ships and unpacks native OCR deps', () => {
    const yml = readFileSync(join(root, 'electron-builder.yml'), 'utf8')
    expect(yml).toMatch(/node_modules\/canvas\/\*\*\/\*/)
    expect(yml).toMatch(/node_modules\/tesseract\.js\/\*\*\/\*/)
    expect(yml).toMatch(/node_modules\/tesseract\.js-core\/\*\*\/\*/)
    expect(yml).toContain('asarUnpack:')
  })

  it('keeps tesseract external in the main Vite build', () => {
    const viteCfg = readFileSync(join(root, 'electron.vite.config.ts'), 'utf8')
    expect(viteCfg).toMatch(/['"]tesseract\.js['"]/)
    expect(viteCfg).toMatch(/['"]tesseract\.js-core['"]/)
  })
})
