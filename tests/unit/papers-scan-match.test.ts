import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../src/engine/manuscript/pdfjs-loader', () => ({
  loadPdfJs: vi.fn(),
  configurePdfJsWorker: vi.fn()
}))

import { listPaperFiles } from '../../src/engine/papers/scan'
import {
  extractPaperIdentity,
  guessTitleFromFirstPage,
  matchPaperIdentity,
  targetsFromItems
} from '../../src/engine/papers/match'
import { MAX_PAPERS_SCAN_FILES } from '../../src/shared/papers-limits'

describe('listPaperFiles folder scan (#19)', () => {
  it('walks nested folders for PDFs only, sorted by name', () => {
    const root = mkdtempSync(join(tmpdir(), 'nassila-papers-'))
    writeFileSync(join(root, 'b.pdf'), 'x')
    writeFileSync(join(root, 'a.pdf'), 'x')
    writeFileSync(join(root, 'notes.txt'), 'x')
    const sub = join(root, 'sub')
    mkdirSync(sub)
    writeFileSync(join(sub, 'c.pdf'), 'x')

    const files = listPaperFiles(root)

    expect(files.map((file) => file.name)).toEqual(['a.pdf', 'b.pdf', 'c.pdf'])
    expect(files[0].path).toContain('a.pdf')
  })

  it('stops at the shared scan cap', () => {
    const root = mkdtempSync(join(tmpdir(), 'nassila-papers-cap-'))
    for (let i = 0; i < MAX_PAPERS_SCAN_FILES + 20; i++) {
      writeFileSync(join(root, `paper-${String(i).padStart(3, '0')}.pdf`), 'x')
    }

    expect(listPaperFiles(root)).toHaveLength(MAX_PAPERS_SCAN_FILES)
  })
})

describe('matchPaperIdentity (#19)', () => {
  const targets = targetsFromItems([
    { bibKey: '3', item: { id: 'a', type: 'article-journal', title: 'Attention Is All You Need', DOI: '10.5555/attn' } },
    { bibKey: '7', item: { id: 'b', type: 'article-journal', title: 'Deep Residual Learning' } }
  ])

  it('matches by normalized DOI first', () => {
    const match = matchPaperIdentity(
      { doi: 'https://doi.org/10.5555/ATTN', title: undefined },
      targets
    )
    expect(match).toEqual({ bibKeys: ['3'], kind: 'matched', matchedBy: 'doi' })
  })

  it('falls back to exact normalized title when DOIs miss', () => {
    const match = matchPaperIdentity(
      { doi: '10.9999/unknown', title: 'deep residual learning' },
      targets
    )
    expect(match).toEqual({ bibKeys: ['7'], kind: 'matched', matchedBy: 'title' })
  })

  it('reports multi-target title hits as ambiguous', () => {
    const twins = targetsFromItems([
      { bibKey: '1', item: { id: 'a', type: 'article-journal', title: 'Twin Study' } },
      { bibKey: '2', item: { id: 'b', type: 'article-journal', title: 'Twin Study' } }
    ])
    const match = matchPaperIdentity({ title: 'twin study' }, twins)
    expect(match.kind).toBe('ambiguous')
    expect(match.bibKeys).toEqual(['1', '2'])
  })

  it('returns unmatched without identity signals', () => {
    expect(matchPaperIdentity({}, targets)).toEqual({
      bibKeys: [],
      kind: 'unmatched',
      matchedBy: null
    })
  })

  it('derives a DOI from the file name when the body has none', () => {
    const match = matchPaperIdentity(
      { fileName: '10.5555/attn.pdf' },
      targets
    )
    expect(match.kind).toBe('matched')
    expect(match.matchedBy).toBe('doi')
  })

  it('matches bare filename stem to bibliography key when DOI/title miss', () => {
    const match = matchPaperIdentity({ fileName: '7.pdf' }, targets)
    expect(match).toEqual({ bibKeys: ['7'], kind: 'matched', matchedBy: 'bibKey' })
  })

  it('does not treat DOI-shaped filenames as bib-key stems', () => {
    const match = matchPaperIdentity({ fileName: '10.9999/unknown.pdf' }, targets)
    expect(match.kind).toBe('unmatched')
  })

  it('leaves stems with no matching bibliography key unmatched', () => {
    expect(matchPaperIdentity({ fileName: '56.pdf' }, targets)).toEqual({
      bibKeys: [],
      kind: 'unmatched',
      matchedBy: null
    })
  })

  it('prefers DOI over filename stem when both are present', () => {
    const match = matchPaperIdentity(
      { doi: '10.5555/attn', fileName: '7.pdf' },
      targets
    )
    expect(match).toEqual({ bibKeys: ['3'], kind: 'matched', matchedBy: 'doi' })
  })
})

describe('guessTitleFromFirstPage heuristics', () => {
  it('skips DOI, URL, and short noise lines', () => {
    const pageText = [
      '10.5555/some.doi',
      'https://publisher.example/landing',
      '12',
      'A Proper Research Paper Title Goes Here'
    ].join('\n')

    expect(guessTitleFromFirstPage(pageText)).toBe('A Proper Research Paper Title Goes Here')
  })
})

describe('extractPaperIdentity via pdf.js (#19)', () => {
  it('reads DOI and title signals from the first two pages', async () => {
    const { loadPdfJs } = await import('../../src/engine/manuscript/pdfjs-loader')
    const fakePage = (items: string[]) => ({
      getTextContent: async () => ({ items: items.map((str) => ({ str })) }),
      cleanup: () => {}
    })
    const fakePdf = {
      numPages: 2,
      getPage: async (n: number) =>
        n === 1
          ? fakePage(['10.5555/body.doi', 'Attention Is All You Need'])
          : fakePage(['page two filler']),
      destroy: async () => {}
    }
    ;(loadPdfJs as ReturnType<typeof vi.fn>).mockResolvedValue({
      getDocument: () => ({ promise: Promise.resolve(fakePdf) }),
      GlobalWorkerOptions: {}
    })

    const signals = await extractPaperIdentity(new ArrayBuffer(8), 'paper.pdf')

    expect(signals.doi).toBe('10.5555/body.doi')
    expect(signals.title).toBe('Attention Is All You Need')
  })

  it('survives a broken PDF by returning empty signals', async () => {
    const { loadPdfJs } = await import('../../src/engine/manuscript/pdfjs-loader')
    ;(loadPdfJs as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('no pdfjs'))

    const signals = await extractPaperIdentity(new ArrayBuffer(8), 'broken.pdf')
    expect(signals).toEqual({})
  })
})
