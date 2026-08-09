// @vitest-environment jsdom

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import SharhLitePanel from '../../src/renderer/components/loop/SharhLitePanel'
import type { AuditReport } from '../../src/engine/manuscript/types'

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (key === 'sharhLite.mappingCoverage') return `Coverage: ${opts?.percent}%`
      if (!opts) return key
      return Object.entries(opts).reduce(
        (acc, [k, v]) => acc.replaceAll(`{{${k}}}`, String(v)),
        key
      )
    }
  })
}))

vi.mock('../../src/renderer/lib/notify', () => ({
  pushToast: vi.fn()
}))

function createSampleReport(): AuditReport {
  return {
    auditId: 'audit-123',
    appVersion: '1.6.0',
    createdAt: Date.now(),
    manuscriptSourceFormat: 'docx',
    template: {
      id: 'imrad',
      strict: false
    },
    networkStatus: 'online',
    grounding: {
      enabled: true,
      runner: 'lmstudio',
      presetId: 'nassila-sanad-4b',
      modelId: 'nassila-sanad-4b',
      checkpoint: 'v1.12',
      usedFallback: false,
      tier: '4b'
    },
    inTextCitations: [
      { citeKey: 'Ref1', rawText: '(Ref1)', paragraphIndex: 0, mappedBibKey: 'Ref1' }
    ],
    citationMapping: {
      totalInText: 1,
      totalRefs: 1,
      matched: 1,
      unmatched: 0,
      ambiguous: 0,
      mappingCoverage: 1.0
    },
    segmentation: {
      bodyParagraphs: 5,
      hasReferencesSection: true
    },
    findings: [
      {
        bibKey: 'Ref1',
        inTextCitations: [{ citeKey: 'Ref1', rawText: '(Ref1)', paragraphIndex: 0, mappedBibKey: 'Ref1' }],
        layers: {
          registry: { status: 'pass', source: 'crossref' },
          metadata: { status: 'pass' },
          passage: { status: 'pass' }
        },
        evidence: [{ text: 'Sample passage evidence text' }],
        resolvedItem: { id: 'Ref1', type: 'article-journal', title: 'Sample Paper' }
      }
    ]
  }
}

describe('SharhLitePanel', () => {
  beforeEach(() => {
    window.api = {
      getAppAbout: vi.fn().mockResolvedValue({ name: 'Nassila', version: '1.6.0' }),
      saveFileDialog: vi.fn().mockResolvedValue('test-export.json'),
      writeFile: vi.fn().mockResolvedValue(undefined)
    } as unknown as typeof window.api
  })

  it('renders empty message when report is null', () => {
    render(<SharhLitePanel report={null} />)
    expect(screen.getByText('sharhLite.empty')).toBeTruthy()
  })

  it('renders summary metrics, preflight status, and next actions for an audit report', () => {
    const report = createSampleReport()
    render(<SharhLitePanel report={report} />)

    expect(screen.getByText('sharhLite.title')).toBeTruthy()
    expect(screen.getByText('sharhLite.supported')).toBeTruthy()
    expect(screen.getByText('sharhLite.preflightOk')).toBeTruthy()
    expect(screen.getByText('sharhLite.mappingBreakdown')).toBeTruthy()
    expect(screen.getByText('sharhLite.exportSubmissionBundle')).toBeTruthy()
    expect(screen.getByText('sharhLite.exportDiagnostic')).toBeTruthy()
  })

  it('triggers submission bundle export on button click', async () => {
    const report = createSampleReport()
    render(<SharhLitePanel report={report} />)

    const btn = screen.getByText('sharhLite.exportSubmissionBundle')
    fireEvent.click(btn)

    await waitFor(() => {
      expect(window.api.saveFileDialog).toHaveBeenCalled()
      expect(window.api.writeFile).toHaveBeenCalledWith(
        'test-export.json',
        expect.stringContaining('nassila-sanad-4b')
      )
    })
  })

  it('renders headline and per-finding explanations when claims are grounded', () => {
    const report = createSampleReport()
    report.findings[0] = {
      ...report.findings[0],
      citeSites: [
        {
          inTextSpan: { start: 0, end: 1, raw: '(Ref1)' },
          passageWindow: 'window',
          deterministicScore: 0.9,
          deterministicBucket: 'high',
          matchedTermsSample: [],
          passageVerdict: { status: 'pass' },
          claimGrounding: [
            {
              claim: 'dose claim',
              verdict: 'supported',
              quoteValidation: { status: 'found', checkedQuotes: 1, matchedQuotes: 1 }
            },
            {
              claim: 'timing claim',
              verdict: 'contradicted',
              quoteValidation: { status: 'not_found', checkedQuotes: 1, matchedQuotes: 0 }
            }
          ]
        }
      ],
      l3Coverage: 'full_text_oa_unpaywall',
      layers: {
        registry: { status: 'pass', source: 'crossref' },
        metadata: { status: 'pass' },
        passage: { status: 'pass' }
      }
    } as unknown as (typeof report.findings)[number]

    render(<SharhLitePanel report={report} />)

    expect(screen.getByText('sharhLite.perFinding')).toBeTruthy()
    expect(screen.getByText('Ref1')).toBeTruthy()
    expect(
      screen.getByText(/supported.*contradicted/i)
    ).toBeTruthy()
  })
})
