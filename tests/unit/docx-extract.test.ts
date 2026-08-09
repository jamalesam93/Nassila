import { describe, it, expect } from 'vitest'
import { extractStructuredDocx } from '@engine/maktab/docx-extract'
import { segmentManuscriptText } from '@engine/manuscript/segments'
import {
  buildDocxFixture,
  buildImradDocxFixture
} from '../fixtures/maktab-docx-builder'

describe('maktab structured DOCX extraction (Route C)', () => {
  it('extracts flat paragraphs with raw-text parity', async () => {
    const buf = await buildDocxFixture([
      { text: 'First paragraph of the manuscript.' },
      { text: 'Second paragraph follows.' }
    ])

    const result = await extractStructuredDocx(buf)

    expect(result.text).toContain('First paragraph of the manuscript.')
    expect(result.text).toContain('Second paragraph follows.')
    expect(result.headings).toEqual([])
    expect(result.needsReview).toBe(false)
  })

  it('surfaces real Word heading levels as a side-channel', async () => {
    const buf = await buildDocxFixture([
      { text: 'Introduction', heading: 1 },
      { text: 'Body sentence about methods.' },
      { text: 'Methods', heading: 2 },
      { text: 'Registry records were analyzed.' }
    ])

    const result = await extractStructuredDocx(buf)

    expect(result.headings).toHaveLength(2)
    expect(result.headings[0]).toMatchObject({ title: 'Introduction', level: 1 })
    expect(result.headings[1]).toMatchObject({ title: 'Methods', level: 2 })

    // Offsets index into the returned text.
    for (const heading of result.headings) {
      expect(result.text.slice(heading.start, heading.end)).toBe(heading.title)
    }
    expect(result.text).toContain('Introduction')
    expect(result.text).toContain('Methods')
  })

  it('keeps heading titles in body text so segmentation still works', async () => {
    const buf = await buildImradDocxFixture()
    const result = await extractStructuredDocx(buf)

    const segmented = segmentManuscriptText(result.text)
    expect(segmented.referencesText).toContain('Smith J')
    expect(segmented.bodyText).toContain('Introduction')
    expect(segmented.bodyText).toContain('Methods')

    // Real headings outrank the casing heuristic.
    expect(result.headings.some((h) => h.title === 'References' && h.level === 1)).toBe(true)
  })

  it('preserves list item and table cell blocks', async () => {
    const buf = await buildDocxFixture([
      { text: 'Methods', heading: 1 },
      { items: ['Registry extraction', 'Manual chart review'] },
      { rows: [['Site', 'Isolates'], ['Hospital A', '1204']] }
    ])

    const result = await extractStructuredDocx(buf)

    expect(result.text).toContain('Registry extraction')
    expect(result.text).toContain('Manual chart review')
    expect(result.text).toContain('Hospital A')
    expect(result.text).toContain('1204')
    expect(result.text).toContain('Site')
  })

  it('decodes XML entities into plain text', async () => {
    const buf = await buildDocxFixture([{ text: 'Risk & benefit <threshold>.' }])

    const result = await extractStructuredDocx(buf)

    expect(result.text).toContain('Risk & benefit <threshold>.')
  })

  it('rejects oversized documents', async () => {
    const oversized = new ArrayBuffer(15 * 1024 * 1024 + 1)
    await expect(extractStructuredDocx(oversized)).rejects.toThrow('too large')
  })
})
