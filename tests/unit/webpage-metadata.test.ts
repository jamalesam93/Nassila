import { afterEach, describe, it, expect, vi } from 'vitest'
import {
  buildWaybackUrl,
  queryWaybackSnapshot,
  resolveWebpageMetadata
} from '@engine/resolver/webpage-metadata'
import * as urlResolver from '@engine/resolver/url'

function archiveResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

describe('Raqim Web metadata resolver (webpage-metadata.ts)', () => {
  it('constructs canonical Wayback Machine archive URLs', () => {
    expect(buildWaybackUrl('https://example.com/article')).toBe(
      'https://web.archive.org/web/*/https://example.com/article'
    )
    expect(buildWaybackUrl('example.com/dead-page')).toBe(
      'https://web.archive.org/web/*/https://example.com/dead-page'
    )
  })

  it('handles invalid metadata or unresolvable URLs cleanly', async () => {
    vi.spyOn(urlResolver, 'fetchUrlMetadata').mockResolvedValue(null)

    const result = await resolveWebpageMetadata('https://invalid-dead-site.com/foo')

    expect(result.url).toBe('https://invalid-dead-site.com/foo')
    expect(result.item).toBeNull()
    expect(result.health.isDead).toBe(true)
    expect(result.health.waybackUrl).toBe(
      'https://web.archive.org/web/*/https://invalid-dead-site.com/foo'
    )
  })

  it('resolves valid webpage HTML metadata into a CslItem and host profile', async () => {
    vi.spyOn(urlResolver, 'fetchUrlMetadata').mockResolvedValue({
      title: 'Understanding Quantum Computing',
      author: [{ family: 'Smith', given: 'Alice' }],
      publisher: 'techblog.com',
      abstract: 'A deep dive into quantum algorithms.'
    })

    const result = await resolveWebpageMetadata('https://techblog.com/quantum')

    expect(result.item).not.toBeNull()
    expect(result.item?.title).toBe('Understanding Quantum Computing')
    expect(result.item?.type).toBe('webpage')
    expect(result.item?.URL).toBe('https://techblog.com/quantum')
    expect(result.health.isDead).toBe(false)
    expect(result.health.ok).toBe(true)
  })
})

describe('queryWaybackSnapshot availability gating (#18)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the closest snapshot when one exists', async () => {
    const snapshotUrl = 'https://web.archive.org/web/20201001000000/https://example.com/article'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        archiveResponse({
          archived_snapshots: { closest: { available: true, url: snapshotUrl, timestamp: '20201001000000' } }
        })
      )
    )

    const snapshot = await queryWaybackSnapshot('https://example.com/article')

    expect(snapshot).toEqual({ timestamp: '20201001000000', url: snapshotUrl })
  })

  it('returns null when no snapshot is available', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        archiveResponse({ archived_snapshots: { closest: { available: false } } })
      )
    )

    expect(await queryWaybackSnapshot('https://never-archived.example/page')).toBeNull()
  })

  it('returns null on network failure instead of throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    expect(await queryWaybackSnapshot('https://example.com/article')).toBeNull()
  })

  it('returns null for unparseable targets without calling the API', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect(await queryWaybackSnapshot('not a valid url')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
