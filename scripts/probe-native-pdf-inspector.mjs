/**
 * Soft-load probe for packaged/native @firecrawl/pdf-inspector.
 * Run after `npm run build`: npx electron scripts/probe-native-pdf-inspector.mjs
 *
 * Exit 0 = napi module loads (PDFium/ONNX may still be missing for OCR pages).
 * Exit 2 = soft-unavailable (expected on clean machines without runtime assets).
 * Exit 1 = unexpected failure.
 */
import { app } from 'electron'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

app.whenReady().then(async () => {
  try {
    const require = createRequire(join(root, 'package.json'))
    let mod = null
    try {
      mod = require('@firecrawl/pdf-inspector')
    } catch (err) {
      console.log('probe:native-pdf-inspector=unavailable')
      console.log(
        'reason=',
        err instanceof Error ? err.message : String(err)
      )
      app.exit(2)
      return
    }

    const hasClassify = typeof mod?.classifyPdf === 'function'
    const hasProcess = typeof mod?.processPdfWithOcr === 'function'
    const modelDirCandidates = [
      join(process.resourcesPath || root, 'pdf-inspector', 'models'),
      join(root, 'resources', 'pdf-inspector', 'models')
    ]
    const modelDir = modelDirCandidates.find((p) => existsSync(p)) ?? null

    console.log('probe:native-pdf-inspector=true')
    console.log('classifyPdf=', hasClassify)
    console.log('processPdfWithOcr=', hasProcess)
    console.log('modelDirectory=', modelDir ?? '(missing — operator fetch required)')
    console.log(
      'note=PDFium/ONNX DLLs are a separate operator step; soft-degrade is expected without them'
    )
    app.exit(hasClassify && hasProcess ? 0 : 2)
  } catch (err) {
    console.log('probe:native-pdf-inspector=false')
    console.error(err instanceof Error ? err.stack ?? err.message : err)
    app.exit(1)
  }
})
