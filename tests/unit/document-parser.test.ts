import { describe, expect, it } from 'vitest'
import { extractReferenceSection, splitReferenceEntries } from '../../src/engine/parser/document'

describe('document parser reference extraction', () => {
  it('extracts bracket-numbered bibliography at document start', () => {
    const text = `[22] Franc B, et al. Am J Pharm Educ. 2019. https://doi.org/10.5688/ajpe77365
[23] Awaisu A, et al. Journal. 2020. https://doi.org/10.1234/test.2
[24] Third author. Journal. 2021. https://doi.org/10.1234/test.3
[25] Fourth author. Journal. 2022.
[26] Fifth author. Journal. 2023.
[27] Ismail NK, et al. Int J Pharm Pract. 2024. https://doi.org/10.2147/IPRP.S464258`
    const section = extractReferenceSection(text)
    expect(section).toContain('Franc B')
    expect(section).toContain('Ismail NK')
  })

  it('splits entries when bracket numbers have no space after delimiter', () => {
    const text = `[1]Author A. Paper. 2020. https://doi.org/10.1234/a
[2]Author B. Paper. 2021. https://doi.org/10.1234/b
[3]Author C. Paper. 2022. https://doi.org/10.1234/c`
    const entries = splitReferenceEntries(text)
    expect(entries).toHaveLength(3)
    expect(entries[0]).toContain('Author A')
  })

  it('extracts trailing bibliography from full manuscript text', () => {
    const body = 'Discussion with in-text cite [22]. '.repeat(80)
    const refs = `[22] Franc B. Am J Pharm Educ. 2019. https://doi.org/10.5688/ajpe77365
[23] Awaisu A. Journal. 2020. https://doi.org/10.1234/test.2
[24] Third. Journal. 2021. https://doi.org/10.1234/test.3
[25] Fourth. 2022.
[26] Fifth. 2023.
[27] Sixth. 2024. https://doi.org/10.2147/IPRP.S464258`
    const section = extractReferenceSection(`${body}\n\n${refs}`)
    expect(section).toContain('Franc B')
    expect(section).not.toContain('Discussion with in-text')
  })

  it('splits newline-separated numbered entries but not space-joined PDF-like text', () => {
    const refs = `[1] Author A. Paper. 2020. https://doi.org/10.1234/a
[2] Author B. Paper. 2021. https://doi.org/10.1234/b
[3] Author C. Paper. 2022. https://doi.org/10.1234/c`
    expect(splitReferenceEntries(refs)).toHaveLength(3)
    expect(splitReferenceEntries(refs.replace(/\n/g, ' '))).toHaveLength(1)
  })

  it('splits blank-line separated unnumbered DOCX-style references', () => {
    const refs = `Bell S, et al. Artificial intelligence in nephrology. Clin Kidney J. 2024.

Luther MK, Timbrook TT. Vancomycin Plus Piperacillin-Tazobactam. Clin Infect Dis. 2011.

U.S. Food and Drug Administration. Software as a Medical Device. 2017.

Giuffré M, Shung D. Harnessing synthetic data. NPJ Digit Med. 2023.`
    expect(splitReferenceEntries(refs)).toHaveLength(4)
  })

  it('does not treat wrapped years or DOI paths as new numbered entries', () => {
    const refs = `43. Yoon J, et al. EHR-Safe: generating high-fidelity records. NPJ Digit Med.
2023;6(1):141.
https://doi.org/10.1038/s41746-023-00887-8
44. Azam M, Singh SI. When Validation Fails. 2025.
45. U.S. Food and Drug Administration. SaMD guidance. 2017.`
    const entries = splitReferenceEntries(refs)
    expect(entries).toHaveLength(3)
    expect(entries[0]).toContain('Yoon J')
    expect(entries[0]).toContain('10.1038')
    expect(entries[1]).toContain('Azam M')
    expect(entries[2]).toContain('Food and Drug')
  })
})
