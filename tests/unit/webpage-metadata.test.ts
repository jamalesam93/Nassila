import { describe, it, expect, vi } from 'vitest'
import { buildWaybackUrl, resolveWebpageMetadata } from '@engine/resolver/webpage-metadata'
import * as urlResolver from '@engine/resolver/url'

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
