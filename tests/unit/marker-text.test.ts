import { describe, expect, it } from 'vitest'
import { selectBestMarkdownPath } from '../../src/engine/manuscript/marker-text'

describe('selectBestMarkdownPath', () => {
  it('returns null for empty input', () => {
    expect(selectBestMarkdownPath([])).toBeNull()
  })

  it('prefers largest file and skips readme', () => {
    const picked = selectBestMarkdownPath([
      { path: 'out/readme.md', byteLength: 200 },
      { path: 'out/doc/article.md', byteLength: 5000 }
    ])
    expect(picked).toContain('article.md')
  })

  it('falls back to readme when it is the only candidate', () => {
    expect(selectBestMarkdownPath([{ path: 'README.md', byteLength: 100 }])).toContain('README.md')
  })
})
