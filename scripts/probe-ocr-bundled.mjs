/**
 * Probe OCR worker paths resolve and bundled main can import external canvas + tesseract.
 * Run after `npm run build`: npx electron scripts/probe-ocr-bundled.mjs
 */
import { app } from 'electron'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

function resolvePaths() {
  const require = createRequire(join(root, 'package.json'))
  return {
    workerPath: require.resolve('tesseract.js/src/worker-script/node/index.js'),
    corePath: require.resolve('tesseract.js-core/tesseract-core.wasm.js')
  }
}

app.whenReady().then(async () => {
  try {
    const paths = resolvePaths()
    await Promise.all([import('canvas'), import('tesseract.js'), import('@napi-rs/canvas')])
    console.log('probe:ocr=true', paths.workerPath)
    app.exit(0)
  } catch (err) {
    console.log('probe:ocr=false')
    console.error(err instanceof Error ? err.stack ?? err.message : err)
    app.exit(1)
  }
})
