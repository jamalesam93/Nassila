import { describe, expect, it, beforeEach } from 'vitest'
import {
  chooseOcrLanguages,
  embeddedArabicLooksReversed,
  embeddedTextLooksSparse,
  shouldDeferArabicToDocx
} from '../../src/engine/maktab/ocr/post-process'
import {
  createCandidateArabicAdapter,
  resetArabicRecognizerAdapter,
  setArabicRecognizerAdapter
} from '../../src/engine/maktab/ocr/arabic-adapter'

describe('maktab OCR post-process helpers', () => {
  beforeEach(() => {
    resetArabicRecognizerAdapter()
  })

  it('detects reversed-Arabic warnings', () => {
    expect(
      embeddedArabicLooksReversed([
        'Arabic text from this PDF looks character-reversed (broken font encoding). Prefer the DOCX.'
      ])
    ).toBe(true)
    expect(embeddedArabicLooksReversed(['Very little text was extracted.'])).toBe(false)
  })

  it('detects sparse warnings', () => {
    expect(embeddedTextLooksSparse(['Very little text was extracted. The PDF may be a scan.'])).toBe(
      true
    )
  })

  it('defers Arabic-heavy text without adapter; always defers reversed', () => {
    const arabicHeavy = 'دور التنمية في تحقيق الاستقرار ومكافحة التطرف '.repeat(20)
    expect(shouldDeferArabicToDocx(arabicHeavy)).toBe(true)
    expect(shouldDeferArabicToDocx(arabicHeavy, [], { arabicAdapterAvailable: true })).toBe(false)
    expect(
      shouldDeferArabicToDocx(
        'يف ',
        [
          'Arabic text from this PDF looks character-reversed (broken font encoding). Prefer the DOCX.'
        ],
        { arabicAdapterAvailable: true }
      )
    ).toBe(true)
    expect(shouldDeferArabicToDocx('Introduction Methods Results '.repeat(20))).toBe(false)
  })

  it('keeps Latin Tesseract packs unless Arabic adapter + Arabic sample', () => {
    const arabicHeavy = 'دور التنمية في تحقيق الاستقرار ومكافحة التطرف '.repeat(20)
    expect(chooseOcrLanguages(arabicHeavy)).toEqual(['eng', 'fra'])
    expect(chooseOcrLanguages(arabicHeavy, ['eng', 'fra', 'ara'])).toEqual(['eng', 'fra'])
    expect(
      chooseOcrLanguages(arabicHeavy, ['eng', 'fra'], { arabicAdapterAvailable: true })
    ).toEqual(['eng', 'fra', 'ara'])
    expect(chooseOcrLanguages('Introduction Methods '.repeat(20))).toEqual(['eng', 'fra'])
  })

  it('registers candidate adapter availability via runner', () => {
    const adapter = createCandidateArabicAdapter({
      runner: async () => ({ text: 'مرحبا', confidence: 0.9, needsReview: false })
    })
    setArabicRecognizerAdapter(adapter)
    expect(adapter.isAvailable()).toBe(true)
  })

  it('logicalOrderArabicOcrText reverses visual-order Arabic CTC output', async () => {
    const { logicalOrderArabicOcrText } = await import('../../src/engine/maktab/ocr/post-process')
    const logical = 'مقاومة مضادات الميكروبات'
    const visual = [...logical].reverse().join('')
    expect(logicalOrderArabicOcrText(visual)).toBe(logical)
    expect(logicalOrderArabicOcrText('DOI: 10.1')).toBe('DOI: 10.1')
  })

  it('logicalOrderArabicOcrText reverses each line and preserves line order', async () => {
    const { logicalOrderArabicOcrText } = await import('../../src/engine/maktab/ocr/post-process')
    const logical = 'السطر الأول\nالسطر الثاني'
    const visual = logical
      .split('\n')
      .map((line) => [...line].reverse().join(''))
      .join('\n')
    expect(logicalOrderArabicOcrText(visual)).toBe(logical)
  })
})
