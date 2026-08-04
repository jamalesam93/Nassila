// @vitest-environment jsdom

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import LoopAuditDetail from '../../src/renderer/components/loop/LoopAuditDetail'
import { useOuroborosLoopStore } from '../../src/renderer/stores/ouroboros-loop-store'
import { useManuscriptAuditStore } from '../../src/renderer/stores/manuscript-audit-store'
import type { CitationFinding } from '../../src/engine/manuscript/types'
import type { SourceArtifact } from '../../src/shared/source-artifact'

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (!opts) return key
      return Object.entries(opts).reduce((acc, [k, v]) => acc.replaceAll(`{{${k}}}`, String(v)), key)
    }
  })
}))

vi.mock('../../src/renderer/lib/notify', () => ({
  pushToast: vi.fn(),
  notifyCopied: vi.fn()
}))

vi.mock('../../src/renderer/utils/copy-to-clipboard', () => ({
  copyToClipboard: vi.fn().mockResolvedValue(true)
}))

const SHA = 'ab'.repeat(32)

const ATTACH_LINE = /loop\.pdfAttached · 7 · embedded_text · abababababab/

const artifact: SourceArtifact = {
  path: 'C:\\papers\\smith2020.pdf',
  sha256: SHA,
  sourceHash: `sha256:${SHA}`,
  size: 1024,
  extractedTextCacheKey: `source-pdf:${SHA}`,
  tier: 'embedded_text',
  languages: ['eng'],
  warnings: [],
  pageCount: 7,
  pageBoundaries: [{ page: 1, start: 0, end: 500 }],
  attachedAt: '2026-08-05T00:00:00.000Z'
}

const finding: CitationFinding = {
  bibKey: 'Smith2020',
  inTextSpans: [{ start: 0, end: 10, raw: '(Smith 2020)', locator: 'p. 12' }],
  resolvedItem: { id: 'Smith2020', type: 'article-journal', title: 'A Sample Paper' },
  referenceIntegrityRisk: 'locator_ok',
  layers: {
    registry: { status: 'pass' },
    metadata: { status: 'pass' },
    passage: { status: 'pass' }
  },
  l3Coverage: 'full_text_attached_pdf',
  citeSites: [
    {
      inTextSpan: { start: 0, end: 10, raw: '(Smith 2020)', locator: 'p. 12' },
      passageWindow: 'The authors found a significant effect.',
      deterministicScore: 0.85,
      deterministicBucket: 'high',
      matchedTermsSample: ['significant', 'effect'],
      passageVerdict: { status: 'pass' },
      sourceExcerpt: 'We report a significant effect for the treatment group.',
      sourceExcerptSource: 'local_pdf'
    }
  ],
  evidence: [{ source: 'local_pdf', text: 'We report a significant effect.' }],
  greyTags: [],
  userAction: { kind: 'none' }
}

function renderDetail(onReaudit = vi.fn()) {
  return render(<LoopAuditDetail finding={finding} onReaudit={onReaudit} />)
}

describe('LoopAuditDetail source attach', () => {
  beforeEach(() => {
    useOuroborosLoopStore.setState({ sourceArtifactsByBibKey: {} })
    window.api = {
      openFileDialog: vi.fn().mockResolvedValue(['C:\\papers\\smith2020.pdf']),
      attachSourcePdf: vi.fn().mockResolvedValue(artifact)
    } as unknown as typeof window.api
  })

  it('shows the attach action and no artifact line before any PDF is attached', () => {
    renderDetail()
    expect(screen.getByText('loop.attachPdfAction')).toBeTruthy()
    expect(screen.queryByText(ATTACH_LINE)).toBeNull()
  })

  it('attaching a PDF stores the artifact, surfaces the descriptor, and re-audits that bibKey', async () => {
    const onReaudit = vi.fn()
    renderDetail(onReaudit)

    fireEvent.click(screen.getByText('loop.attachPdfAction'))

    await waitFor(() => {
      const line = screen.getByText(ATTACH_LINE)
      expect(line.textContent).toContain('7')
      expect(line.textContent).toContain('embedded_text')
      expect(line.textContent).toContain(SHA.slice(0, 12))
    })
    expect(window.api.attachSourcePdf).toHaveBeenCalledWith('C:\\papers\\smith2020.pdf')
    expect(useOuroborosLoopStore.getState().sourceArtifactsByBibKey.Smith2020).toEqual(artifact)
    expect(onReaudit).toHaveBeenCalledWith('Smith2020')
  })

  it('cancelling the file dialog does not attach or re-audit', async () => {
    ;(window.api.openFileDialog as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([])
    const onReaudit = vi.fn()
    renderDetail(onReaudit)

    fireEvent.click(screen.getByText('loop.attachPdfAction'))

    await waitFor(() => {
      expect(window.api.attachSourcePdf).not.toHaveBeenCalled()
    })
    expect(onReaudit).not.toHaveBeenCalled()
    expect(useOuroborosLoopStore.getState().sourceArtifactsByBibKey.Smith2020).toBeUndefined()
  })

  it('clearing an attached PDF removes its descriptor and does not re-audit', async () => {
    useOuroborosLoopStore.setState({ sourceArtifactsByBibKey: { Smith2020: artifact } })
    const onReaudit = vi.fn()
    renderDetail(onReaudit)

    expect(screen.getByText(ATTACH_LINE)).toBeTruthy()

    fireEvent.click(screen.getByText('loop.attachPdfClear'))

    await waitFor(() => {
      expect(useOuroborosLoopStore.getState().sourceArtifactsByBibKey.Smith2020).toBeUndefined()
    })
    expect(screen.queryByText(ATTACH_LINE)).toBeNull()
    expect(onReaudit).not.toHaveBeenCalled()
  })

  it('disables attach and clear while an audit is in flight', () => {
    useOuroborosLoopStore.setState({ sourceArtifactsByBibKey: { Smith2020: artifact } })
    useManuscriptAuditStore.setState({ activeRunId: 'run-1', activeBibKeyFilter: 'Smith2020' })
    renderDetail()

    const attach = screen.getByText('loop.attachPdfAction') as HTMLButtonElement
    const clear = screen.getByText('loop.attachPdfClear') as HTMLButtonElement
    expect(attach.disabled).toBe(true)
    expect(clear.disabled).toBe(true)
  })
})