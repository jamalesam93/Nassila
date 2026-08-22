import { describe, expect, it } from 'vitest'
import { buildGreyWebPageItem, classifyWebpageHost } from '../../src/engine/resolver/webpage-hosts'

describe('classifyWebpageHost', () => {
  it('classifies government hosts', () => {
    expect(classifyWebpageHost('https://www.nih.gov/news')).toMatchObject({ kind: 'government' })
    expect(classifyWebpageHost('https://www.gov.uk/guidance')).toMatchObject({ kind: 'government' })
  })

  it('classifies video and blog platforms', () => {
    expect(classifyWebpageHost('https://www.youtube.com/watch?v=abc')).toMatchObject({
      kind: 'video',
      platform: 'youtube'
    })
    expect(classifyWebpageHost('https://example.substack.com/p/post')).toMatchObject({
      kind: 'blog',
      platform: 'substack'
    })
  })
})

describe('buildGreyWebPageItem', () => {
  it('builds deterministic webpage stubs without fetch', () => {
    const item = buildGreyWebPageItem('https://www.who.int/news-room/fact-sheets')
    expect(item?.type).toBe('webpage')
    expect(item?.genre).toBe('organization')
    expect(item?.URL).toContain('who.int')
  })

  it('skips social hosts', () => {
    expect(buildGreyWebPageItem('https://twitter.com/example/status/1')).toBeNull()
  })
})

// Grey-web lookup ordering lives in raqim-url-title-fallback.test.ts (#20):
// the stub is a last resort and never suppresses registry title search.
