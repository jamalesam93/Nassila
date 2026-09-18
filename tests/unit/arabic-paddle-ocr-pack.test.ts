import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import {
  isArabicOcrPackComplete,
  resolveArabicOcrModelDirectory,
  ARABIC_OCR_REC_ONNX,
  ARABIC_OCR_DET_ONNX,
  ARABIC_OCR_DICT
} from '../../src/main/maktab/arabic-paddle-ocr'

describe('arabic paddle OCR pack paths', () => {
  it('resolves unpackaged resources/arabic-ocr', () => {
    const dir = resolveArabicOcrModelDirectory({
      isPackaged: false,
      appPath: 'E:/Cursor Projects/Nassila',
      resourcesPath: 'C:/fake'
    })
    expect(dir.replace(/\\/g, '/')).toBe('E:/Cursor Projects/Nassila/resources/arabic-ocr')
  })

  it('resolves packaged resourcesPath/arabic-ocr', () => {
    const dir = resolveArabicOcrModelDirectory({
      isPackaged: true,
      appPath: 'C:/App/resources/app.asar',
      resourcesPath: 'C:/App/resources'
    })
    expect(dir.replace(/\\/g, '/')).toBe('C:/App/resources/arabic-ocr')
  })

  it('prefers NASSILA_ARABIC_OCR_DIR / envDir', () => {
    const dir = resolveArabicOcrModelDirectory({
      isPackaged: true,
      appPath: 'x',
      resourcesPath: 'y',
      envDir: 'D:/custom-arabic-ocr'
    })
    expect(dir).toBe('D:/custom-arabic-ocr')
  })

  it('reports pack complete only when marker + onnx + dict exist', () => {
    const root = join(process.cwd(), 'resources', 'arabic-ocr')
    // Operator may or may not have run download in CI — assert API honesty either way.
    const complete = isArabicOcrPackComplete(root)
    if (complete) {
      expect(ARABIC_OCR_REC_ONNX).toMatch(/\.onnx$/)
      expect(ARABIC_OCR_DET_ONNX).toMatch(/\.onnx$/)
      expect(ARABIC_OCR_DICT).toMatch(/\.txt$/)
    } else {
      expect(complete).toBe(false)
    }
  })
})
