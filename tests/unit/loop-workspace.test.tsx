// @vitest-environment jsdom

import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import OuroborosLoopWorkspace from '../../src/renderer/components/loop/OuroborosLoopWorkspace'
import { useManuscriptAuditStore } from '../../src/renderer/stores/manuscript-audit-store'
import { useCitationStore } from '../../src/renderer/stores/citation-store'

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (key === 'loop.previewStats') return `${opts?.words} words, ${opts?.cites} citations`
      return key
    }
  })
}))

function createApiMock() {
  return {
    listTemplates: vi.fn().mockResolvedValue([
      { id: 'imrad', name: 'Empirical (IMRAD)', headings: {} },
      { id: 'review', name: 'Review', headings: {} }
    ]),
    loadManuscriptAuditPrefs: vi.fn().mockResolvedValue({ version: 1 }),
    saveManuscriptAuditPrefs: vi.fn().mockResolvedValue(undefined),
    getAppAbout: vi.fn().mockResolvedValue({ name: 'Nassila', version: '1.6.0' })
  }
}

describe('OuroborosLoopWorkspace component', () => {
  beforeEach(() => {
    window.api = createApiMock() as unknown as typeof window.api
    useManuscriptAuditStore.setState({
      rawManuscriptText: '',
      report: null,
      step: 'idle',
      auditProgress: null,
      importProgress: null,
      error: null,
      unpaywallEmail: 'test@example.com',
      auditReferenceSource: 'manuscript',
      manuscriptSourceFormat: 'docx',
      selectedTemplateId: 'imrad',
      templateStrict: false,
      templates: [
        { id: 'imrad', name: 'Empirical (IMRAD)', headings: {} },
        { id: 'review', name: 'Review', headings: {} }
      ]
    })
    useCitationStore.setState({
      citations: [],
      networkStatus: 'online'
    })
  })

  it('renders editor placeholder and source format badge', async () => {
    await act(async () => {
      render(<OuroborosLoopWorkspace />)
    })

    expect(screen.getByPlaceholderText('manuscriptAudit.editorPlaceholder')).toBeTruthy()
    expect(screen.getByText(/docx/i)).toBeTruthy()
    expect(screen.getByTitle('manuscriptAudit.structureTitle')).toBeTruthy()
  })

  it('updates raw text state when user types in editor', async () => {
    await act(async () => {
      render(<OuroborosLoopWorkspace />)
    })

    const textarea = screen.getByPlaceholderText('manuscriptAudit.editorPlaceholder') as HTMLTextAreaElement
    act(() => {
      fireEvent.change(textarea, { target: { value: 'Introduction\nThis is a test manuscript.' } })
    })

    expect(useManuscriptAuditStore.getState().rawManuscriptText).toBe('Introduction\nThis is a test manuscript.')
  })

  it('allows changing structure template and strict mode toggle', async () => {
    await act(async () => {
      render(<OuroborosLoopWorkspace />)
    })

    const select = screen.getByTitle('manuscriptAudit.structureTitle') as HTMLSelectElement
    act(() => {
      fireEvent.change(select, { target: { value: 'review' } })
    })

    expect(useManuscriptAuditStore.getState().selectedTemplateId).toBe('review')

    const checkbox = screen.getByTitle('manuscriptAudit.strictMode').querySelector('input') as HTMLInputElement
    act(() => {
      fireEvent.click(checkbox)
    })

    expect(useManuscriptAuditStore.getState().templateStrict).toBe(true)
  })
})
