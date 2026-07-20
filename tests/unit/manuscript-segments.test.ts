import { describe, expect, it } from 'vitest'
import { findReferencesBoundary, segmentManuscriptText } from '../../src/engine/manuscript/segments'
import { parseInTextCitations } from '../../src/engine/manuscript/intext'
import { previewManuscript } from '../../src/renderer/utils/manuscript-preview'

describe('segmentManuscriptText', () => {
  it('splits on a References heading', () => {
    const text = `Body with a cite (Smith, 2020).

References
Smith J. Example paper. Journal. 2020.`
    const seg = segmentManuscriptText(text)
    expect(seg.referencesText).toContain('Smith J.')
    expect(seg.bodyText).toContain('Body with')
  })

  it('splits on numbered bibliography without a heading (mid-list numbers)', () => {
    const text = `Introduction with a cite (Franke, 2024).

53. Franke M. Example title. Journal Name. 2024. https://doi.org/10.1234/example.1
54. Smith J. Another paper. Other Journal. 2023. https://doi.org/10.1234/example.2
55. Jones A. Third paper. Third Journal. 2022. https://doi.org/10.1234/example.3
56. Lee B. Fourth paper. Fourth Journal. 2021. https://doi.org/10.1234/example.4`
    const boundary = findReferencesBoundary(text)
    expect(boundary?.kind).toBe('numbered')
    const seg = segmentManuscriptText(text)
    expect(seg.referencesText).toContain('Franke M.')
    expect(seg.bodyText).toContain('Introduction')
    expect(seg.bodyText).not.toContain('Franke M.')
  })

  it('accepts References with trailing colon', () => {
    const text = `Body text.

References:
Doe J. Paper. 2021.`
    expect(findReferencesBoundary(text)?.kind).toBe('header')
  })

  it('accepts numbered IMRAD References heading (common in PDF export)', () => {
    const body = 'Conclusion with cite [1]. '.repeat(80)
    const refs = `[1] First A. Journal. 2020. https://doi.org/10.1234/a
[2] Second B. Journal. 2021. https://doi.org/10.1234/b
[3] Third C. Journal. 2022. https://doi.org/10.1234/c`
    const text = `${body}\n\n9. References\n${refs}`
    const boundary = findReferencesBoundary(text)
    expect(boundary?.kind).toBe('header')
    const seg = segmentManuscriptText(text)
    expect(seg.referencesText).toContain('First A.')
    expect(seg.bodyText).toContain('Conclusion')
    expect(previewManuscript(text).ok).toBe(true)
  })

  it('accepts bracket-numbered bibliography at document start (refs-only paste)', () => {
    const text = `[22] Franc B, et al. Am J Pharm Educ. 2019. https://doi.org/10.5688/ajpe77365
[23] Awaisu A, et al. Journal. 2020. https://doi.org/10.1234/test.2
[24] Third author. Journal. 2021. https://doi.org/10.1234/test.3
[25] Fourth author. Journal. 2022.
[26] Fifth author. Journal. 2023.
[27] Ismail NK, et al. Int J Pharm Pract. 2024. https://doi.org/10.2147/IPRP.S464258`
    const boundary = findReferencesBoundary(text)
    expect(boundary?.kind).toBe('numbered')
    expect(boundary?.start).toBe(0)
    const seg = segmentManuscriptText(text)
    expect(seg.referencesText).toContain('Franc B')
    expect(seg.bodyText).toBe('')
  })

  it('accepts bracket numbers without space after delimiter', () => {
    const text = `Body with cite [1].

[1]Author A. Paper. 2020. https://doi.org/10.1234/a
[2]Author B. Paper. 2021. https://doi.org/10.1234/b
[3]Author C. Paper. 2022. https://doi.org/10.1234/c`
    expect(segmentManuscriptText(text).referencesText).toContain('Author A')
  })

  it('splits body from trailing bracket-numbered bibliography', () => {
    const body = 'Discussion with in-text cite [22]. '.repeat(400)
    const refs = `[22] Franc B. Am J Pharm Educ. 2019. https://doi.org/10.5688/ajpe77365
[23] Awaisu A. Journal. 2020. https://doi.org/10.1234/test.2
[24] Third. Journal. 2021. https://doi.org/10.1234/test.3
[25] Fourth. 2022.
[26] Fifth. 2023.
[27] Sixth. 2024. https://doi.org/10.2147/IPRP.S464258`
    const text = `${body}\n\n${refs}`
    const seg = segmentManuscriptText(text)
    expect(seg.referencesText).toContain('Franc B')
    expect(seg.bodyText).toContain('Discussion')
  })

  it('does not treat numbered section headings as bibliography (preserves in-text cites)', () => {
    const text = `1. Introduction
Pharmacy education in Yemen has expanded rapidly [9]. Further context [23-24] and more [20,25].

2. Methods
We surveyed programs [8].

[22] Franc B, et al. Am J Pharm Educ. 2019. https://doi.org/10.5688/ajpe77365
[23] Awaisu A, et al. Journal. 2020. https://doi.org/10.1234/test.2
[24] Third author. Journal. 2021. https://doi.org/10.1234/test.3
[25] Fourth author. Journal. 2022.
[26] Fifth author. Journal. 2023.
[27] Ismail NK, et al. Int J Pharm Pract. 2024. https://doi.org/10.2147/IPRP.S464258`
    const seg = segmentManuscriptText(text)
    expect(seg.bodyText).toContain('[9]')
    expect(seg.referencesText).toContain('Franc B')
    expect(parseInTextCitations(seg.bodyText).citations.length).toBeGreaterThan(0)
    const preview = previewManuscript(text)
    expect(preview.ok).toBe(true)
    if (preview.ok) expect(preview.inTextCitationCount).toBeGreaterThan(0)
  })

  it('splits on Arabic / bilingual bibliography heading (not TOC)', () => {
    const toc = `قائمة المصطلحات والاختصارات\t3
قائمة المراجع والمصادر (Academic Bibliography)\t118
أولاً: المراجع باللغة العربية (Arabic References)\t118`

    const body = 'متن البحث مع استشهاد (Sen, 1999). '.repeat(40)
    const refs = `أولاً: المراجع باللغة العربية (Arabic References)
الكتاب، المؤلف. عنوان. 2020.

ثانياً: المراجع باللغة الإنجليزية (English References)
Smith J. Example paper. Journal. 2020.`

    const text = `${toc}\n\n${body}\n\nقائمة المراجع والمصادر (Academic Bibliography)\n${refs}`
    const boundary = findReferencesBoundary(text)
    expect(boundary?.kind).toBe('header')
    const seg = segmentManuscriptText(text)
    expect(seg.referencesText).toContain('Smith J.')
    expect(seg.referencesText).toContain('الكتاب')
    expect(seg.bodyText).toContain('متن البحث')
    expect(seg.bodyText).not.toContain('Smith J.')
    expect(previewManuscript(text).ok).toBe(true)
  })

  it('does not treat glossary heading as bibliography', () => {
    const text = `مقدمة.

قائمة المصطلحات والاختصارات
التنمية: تعريف.

قائمة المراجع والمصادر
Author A. Paper. 2020.`
    const seg = segmentManuscriptText(text)
    expect(seg.referencesText).toContain('Author A')
    expect(seg.bodyText).toContain('المصطلحات')
  })
})
