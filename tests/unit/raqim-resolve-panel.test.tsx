// @vitest-environment jsdom

import { act, render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import RaqimResolvePanel from '../../src/renderer/components/RaqimResolvePanel'
import type { CslItem } from '../../src/engine/types'

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({ t: (key: string) => key })
}))

const replaceCitation = vi.fn()
const updateCitation = vi.fn()

vi.mock('../../src/renderer/stores/citation-store', () => ({
  useCitationStore: Object.assign(
    (selector: (state: Record<string, unknown>) => unknown) =>
      selector({ networkStatus: 'online', selectedStyleId: null }),
    {
      getState: () => ({ replaceCitation, updateCitation })
    }
  )
}))

const richItem: CslItem = {
  id: 'row-1',
  type: 'article-journal',
  title: 'Attention is all you need',
  DOI: '10.5555/attention.2017'
}

function getKeyInput(): HTMLInputElement {
  return screen.getByPlaceholderText('raqimResolve.keyPlaceholder') as HTMLInputElement
}

function getKindSelect(): HTMLSelectElement {
  return screen.getByLabelText('raqimResolve.keyType') as HTMLSelectElement
}

describe('RaqimResolvePanel field prefill parity (#20)', () => {
  let lookupMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    lookupMock = vi.fn().mockResolvedValue([])
    ;(window as { api?: unknown }).api = {
      lookupRaqimCandidates: lookupMock,
      resolveWebpageMetadata: vi.fn().mockResolvedValue(null)
    }
  })

  it('auto-copies the matching row field when switching lookup kinds', () => {
    render(<RaqimResolvePanel item={richItem} />)

    fireEvent.click(screen.getByRole('button', { name: 'raqimResolve.open' }))
    expect(getKeyInput().value).toBe('Attention is all you need')

    fireEvent.change(getKindSelect(), { target: { value: 'doi' } })
    expect(getKeyInput().value).toBe('10.5555/attention.2017')

    fireEvent.change(getKindSelect(), { target: { value: 'pmid' } })
    expect(getKeyInput().value).toBe('')
  })

  it('never clobbers a user-edited key when switching kinds', () => {
    render(<RaqimResolvePanel item={richItem} />)

    fireEvent.click(screen.getByRole('button', { name: 'raqimResolve.open' }))
    fireEvent.change(getKeyInput(), { target: { value: 'my own query text' } })

    fireEvent.change(getKindSelect(), { target: { value: 'doi' } })
    expect(getKeyInput().value).toBe('my own query text')
  })

  it('syncs kind and key to the best identifier when pressing verify', async () => {
    render(<RaqimResolvePanel item={richItem} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'raqimResolve.verifyRow' }))
    })

    expect(lookupMock).toHaveBeenCalledTimes(1)
    expect(getKindSelect().value).toBe('doi')
    expect(getKeyInput().value).toBe('10.5555/attention.2017')
  })

  it('falls back through the identifier chain to title-only rows on verify', async () => {
    const titleOnly: CslItem = { id: 'row-2', type: 'article-journal', title: 'Only a title here' }
    render(<RaqimResolvePanel item={titleOnly} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'raqimResolve.verifyRow' }))
    })

    expect(lookupMock).toHaveBeenCalledTimes(1)
    expect(getKindSelect().value).toBe('title')
    expect(getKeyInput().value).toBe('Only a title here')
  })
})

describe('RaqimResolvePanel Wayback availability gating (#18)', () => {
  let lookupMock: ReturnType<typeof vi.fn>
  let waybackMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    lookupMock = vi.fn().mockResolvedValue([])
    waybackMock = vi.fn().mockResolvedValue(null)
    ;(window as { api?: unknown }).api = {
      lookupRaqimCandidates: lookupMock,
      resolveWebpageMetadata: vi.fn().mockResolvedValue(null),
      checkWaybackAvailability: waybackMock
    }
  })

  function panelWith(url?: string) {
    const item: CslItem = url
      ? { id: 'row-w', type: 'webpage', title: 'A page', URL: url }
      : { id: 'row-w', type: 'article-journal', title: 'No URL row', DOI: '10.5555/x' }
    return render(<RaqimResolvePanel item={item} />)
  }

  it('shows the archive link only when a snapshot exists, linking directly to it', async () => {
    waybackMock.mockResolvedValue({
      timestamp: '20240101000000',
      url: 'https://web.archive.org/web/20240101000000/https://alive.example/page'
    })
    panelWith('https://alive.example/page')

    expect(screen.queryByText('raqimResolve.waybackArchive')).toBeNull()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'raqimResolve.open' }))
    })

    const link = screen.getByRole('link', { name: 'raqimResolve.waybackArchive ↗' })
    expect(link.getAttribute('href')).toBe(
      'https://web.archive.org/web/20240101000000/https://alive.example/page'
    )
  })

  it('shows nothing when the availability API finds no snapshot', async () => {
    waybackMock.mockResolvedValue(null)
    panelWith('https://never-archived.example/page')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'raqimResolve.open' }))
    })

    expect(screen.queryByText('raqimResolve.waybackArchive')).toBeNull()
  })

  it('queries availability with the page URL, never a doi.org fallback', async () => {
    waybackMock.mockResolvedValue(null)
    panelWith(undefined)

    fireEvent.click(screen.getByRole('button', { name: 'raqimResolve.open' }))

    expect(waybackMock).not.toHaveBeenCalled()
  })
})
