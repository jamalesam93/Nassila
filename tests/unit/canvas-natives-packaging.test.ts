import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

describe('canvas native packaging for Maktab OCR', () => {
  it('keeps canvas external in the main Vite build', () => {
    const viteCfg = readFileSync(join(root, 'electron.vite.config.ts'), 'utf8')
    expect(viteCfg).toMatch(/MAIN_NATIVE_EXTERNALS\s*=\s*\[[^\]]*['"]canvas['"]/s)
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
    // pdf.js v5 resolves @napi-rs/canvas at runtime (pdf-page-raster.ts, tesseract-ocr.ts);
    // node-canvas is no longer part of the shipped set — see the next test.
    expect(yml).toMatch(/node_modules\/@napi-rs\/canvas\/\*\*\/\*/)
    expect(yml).toMatch(/node_modules\/tesseract\.js\/\*\*\/\*/)
    expect(yml).toMatch(/node_modules\/tesseract\.js-core\/\*\*\/\*/)
    expect(yml).toMatch(/node_modules\/@firecrawl\/pdf-inspector\/\*\*\/\*/)
    expect(yml).toMatch(/node_modules\/@firecrawl\/anydoc\/\*\*\/\*/)
    expect(yml).toContain('asarUnpack:')
    expect(yml).toMatch(/resources\/pdf-inspector/)
  })

  it('does not ship node-canvas: the main bundle never requires it', () => {
    const yml = readFileSync(join(root, 'electron-builder.yml'), 'utf8')
    expect(yml).not.toMatch(/node_modules\/canvas\/\*\*\/\*/)
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    expect(pkg.dependencies?.canvas).toBeUndefined()
    // Still installed: tests/smoke/setup-pdfjs-node.ts polyfills pdf.js from it and
    // scripts/probe-ocr-bundled.mjs imports it. Neither ships in the app.
    expect(pkg.devDependencies?.canvas).toBeDefined()
  })

  it('prunes unused onnxruntime-node platform slices with a reversible hook', () => {
    const yml = readFileSync(join(root, 'electron-builder.yml'), 'utf8')
    expect(yml).toMatch(/beforePack:\s*\.\/scripts\/prune-native-platforms\.mjs/)
    expect(yml).toMatch(/afterPack:\s*\.\/scripts\/prune-native-platforms\.mjs/)
    // Guard the constraint: expressing the prune as a platform-specific `files` negation
    // leaves electron-builder's defaultMatcher holding only ignore patterns, which trips
    // containsOnlyIgnore() in app-builder-lib/out/fileMatcher.js and prepends a
    // match-everything glob — packing the entire repository into app.asar (+174.6 MB).
    expect(yml).not.toContain('napi-v6')
  })

  it('keeps tesseract and firecrawl natives external in the main Vite build', () => {
    const viteCfg = readFileSync(join(root, 'electron.vite.config.ts'), 'utf8')
    expect(viteCfg).toMatch(/['"]tesseract\.js['"]/)
    expect(viteCfg).toMatch(/['"]tesseract\.js-core['"]/)
    expect(viteCfg).toMatch(/['"]@firecrawl\/pdf-inspector['"]/)
    expect(viteCfg).toMatch(/['"]@firecrawl\/anydoc['"]/)
  })
})
