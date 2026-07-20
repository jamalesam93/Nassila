import { describe, expect, it } from 'vitest'
import {
  chooseOcrLanguages,
  countSpuriousLatinNearArabic,
  mergeOcrWithEmbeddedPages,
  stripSpuriousDigitNoiseInArabic,
  stripSpuriousLatinInArabic
} from '../../src/engine/maktab/ocr/post-process'

describe('stripSpuriousLatinInArabic', () => {
  it('removes short Latin scraps from Arabic dedication-like OCR noise', () => {
    const sample = [
      'إلى أهلي وعشيرتي في اليمن Its3',
      'دراسة dou البرنامج',
      'محافظة عدن Sle حصام',
      'she الذي Gi إلى due نعومة',
      'وكانت ولا SW إلى أمي الحنون',
      'ومزدهره AT إلى يمن يليق'
    ].join('\n')

    const before = countSpuriousLatinNearArabic(sample)
    expect(before.count).toBeGreaterThan(3)

    const cleaned = stripSpuriousLatinInArabic(sample)
    expect(cleaned).toContain('في اليمن')
    expect(cleaned).not.toMatch(/\bIts3\b/)
    expect(cleaned).not.toMatch(/\bSW\b/)
    expect(cleaned).not.toMatch(/\bshe\b/)
    expect(countSpuriousLatinNearArabic(cleaned).count).toBeLessThan(before.count)
  })

  it('removes BiDi-wrapped Latin scraps from real OCR output', () => {
    // U+200E LEFT-TO-RIGHT MARK as emitted by Tesseract around Latin scraps
    const sample =
      'دراسة \u200EIts\u200F لقطاعى الصحة والتعليم 3\nمحافظة عدن\n\u200ESle\u200F عصام ا حمد السقاف'
    const before = countSpuriousLatinNearArabic(sample)
    expect(before.count).toBeGreaterThan(0)
    expect(before.samples).toEqual(expect.arrayContaining(['Its', 'Sle']))

    const cleaned = stripSpuriousLatinInArabic(sample)
    expect(cleaned).toContain('دراسة')
    expect(cleaned).toContain('لقطاعى')
    expect(cleaned).toContain('عصام')
    expect(cleaned).not.toMatch(/Its/)
    expect(cleaned).not.toMatch(/Sle/)
    expect(countSpuriousLatinNearArabic(cleaned).count).toBe(0)
  })

  it('keeps longer English phrases', () => {
    const sample = 'انظر Academic Bibliography للمزيد'
    expect(stripSpuriousLatinInArabic(sample)).toContain('Academic')
  })
})

describe('stripSpuriousDigitNoiseInArabic', () => {
  it('removes digits glued to Arabic and long non-year blobs', () => {
    const sample = 'العم / 77515آ221مر عبر استعراض 21601 كان في 2020 جيد'
    const cleaned = stripSpuriousDigitNoiseInArabic(sample)
    expect(cleaned).not.toMatch(/77515/)
    expect(cleaned).not.toMatch(/21601/)
    expect(cleaned).toContain('2020')
    expect(cleaned).toContain('آ')
  })
})

describe('mergeOcrWithEmbeddedPages', () => {
  it('keeps high-confidence OCR pages and falls back on weak OCR', () => {
    const ocrText = 'عنوان جيد من التعرف الضوئي\n\nنص سيء 77515آ ورقم 21601 كثير'
    const embeddedText = 'عنوان مضمّن مقلوب يف\n\nمتن مضمّن أوضح نسبيًا للقارئ'
    const ocrBoundaries = [
      { page: 1, start: 0, end: 'عنوان جيد من التعرف الضوئي'.length },
      {
        page: 2,
        start: 'عنوان جيد من التعرف الضوئي'.length + 2,
        end: ocrText.length
      }
    ]
    const embeddedBoundaries = [
      { page: 1, start: 0, end: 'عنوان مضمّن مقلوب يف'.length },
      {
        page: 2,
        start: 'عنوان مضمّن مقلوب يف'.length + 2,
        end: embeddedText.length
      }
    ]
    const merged = mergeOcrWithEmbeddedPages({
      ocrText,
      ocrBoundaries,
      ocrConfidences: [85, 60],
      embeddedText,
      embeddedBoundaries
    })
    expect(merged.ocrPagesUsed).toBe(1)
    expect(merged.embeddedPagesUsed).toBe(1)
    expect(merged.text).toContain('عنوان جيد من التعرف الضوئي')
    expect(merged.text).toContain('متن مضمّن أوضح')
    expect(merged.text).not.toContain('21601')
  })
})

describe('chooseOcrLanguages for Latin OCR', () => {
  it('never selects ara (Arabic Tesseract deferred)', () => {
    const sample = 'دور التنمية في تحقيق الاستقرار ومكافحة التطرف '.repeat(30)
    expect(chooseOcrLanguages(sample)).toEqual(['eng', 'fra'])
  })
})
