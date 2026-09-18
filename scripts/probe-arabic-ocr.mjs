/**
 * Probe Arabic PP-OCRv5 ONNX pack + ppu-paddle-ocr initialize.
 * Run after: npm run ocr:arabic-adapter
 *   npm run probe:arabic-ocr
 */
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = process.env.NASSILA_ARABIC_OCR_DIR || join(root, 'resources', 'arabic-ocr')

const required = [
  '.nassila-arabic-ocr-ready',
  'arabic_ppocrv5_mobile_rec.onnx',
  'ppocrv5_mobile_det.onnx',
  'ppocrv5_arabic_dict.txt'
]

const missing = required.filter((name) => !existsSync(join(dir, name)))
if (missing.length) {
  console.log('probe:arabic-ocr=false pack_incomplete missing=', missing.join(','))
  console.log('dir=', dir)
  console.log('Run: npm run ocr:arabic-adapter')
  process.exit(1)
}

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

try {
  const { PaddleOcrService } = await import('ppu-paddle-ocr')
  const service = new PaddleOcrService({
    model: {
      detection: join(dir, 'ppocrv5_mobile_det.onnx'),
      recognition: join(dir, 'arabic_ppocrv5_mobile_rec.onnx'),
      charactersDictionary: join(dir, 'ppocrv5_arabic_dict.txt')
    }
  })
  await service.initialize()
  const ab = tinyPng.buffer.slice(tinyPng.byteOffset, tinyPng.byteOffset + tinyPng.byteLength)
  const result = await service.recognize(ab)
  console.log(
    'probe:arabic-ocr=true init_ok text_len=',
    (result.text ?? '').length,
    'confidence=',
    result.confidence
  )
  if (typeof service.destroy === 'function') await service.destroy()
  process.exit(0)
} catch (err) {
  console.log('probe:arabic-ocr=false', err instanceof Error ? err.message : err)
  process.exit(1)
}
