import { describe, expect, it } from 'vitest'
import { buildGreyWebPageItem, classifyWebpageHost } from '../../src/engine/resolver/webpage-hosts'
import { lookupRaqimCandidates } from '../../src/engine/resolver/raqim-resolve'

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

describe('lookupRaqimCandidates grey web', () => {
  it('resolves grey-web URLs deterministically', async () => {
    const results = await lookupRaqimCandidates({
      item: { id: 'w1', type: 'webpage', title: 'WHO fact sheet' },
      key: 'https://www.who.int/news-room/fact-sheets',
      kind: 'url'
    })
    expect(results[0]?.provider).toBe('grey_web')
    expect(results[0]?.item.type).toBe('webpage')
  })
})
