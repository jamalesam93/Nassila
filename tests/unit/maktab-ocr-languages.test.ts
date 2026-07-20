import { describe, expect, it } from 'vitest'
import {
  chooseOcrLanguages,
  embeddedArabicLooksReversed,
  embeddedTextLooksSparse,
  shouldDeferArabicToDocx
} from '../../src/engine/maktab/ocr/post-process'

describe('maktab OCR post-process helpers', () => {
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

  it('defers Arabic-heavy and reversed text to DOCX', () => {
    const arabicHeavy = 'دور التنمية في تحقيق الاستقرار ومكافحة التطرف '.repeat(20)
    expect(shouldDeferArabicToDocx(arabicHeavy)).toBe(true)
    expect(
      shouldDeferArabicToDocx('يف ', [
        'Arabic text from this PDF looks character-reversed (broken font encoding). Prefer the DOCX.'
      ])
    ).toBe(true)
    expect(shouldDeferArabicToDocx('Introduction Methods Results '.repeat(20))).toBe(false)
  })

  it('never selects ara for Tesseract language packs', () => {
    const arabicHeavy = 'دور التنمية في تحقيق الاستقرار ومكافحة التطرف '.repeat(20)
    expect(chooseOcrLanguages(arabicHeavy)).toEqual(['eng', 'fra'])
    expect(chooseOcrLanguages(arabicHeavy, ['eng', 'fra', 'ara'])).toEqual(['eng', 'fra'])
    expect(chooseOcrLanguages('Introduction Methods '.repeat(20))).toEqual(['eng', 'fra'])
  })
})
