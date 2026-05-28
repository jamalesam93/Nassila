import { describe, it, expect } from 'vitest'
import { detectStyle } from '../../src/engine/detector/index'

describe('detectStyle', () => {
  it('detects IEEE-like numbered citation', async () => {
    const results = await detectStyle(
      '[1] J. Smith, "A study of AI," IEEE Trans. Comput., vol. 45, no. 2, pp. 112-128, Mar. 2024.'
    )
    expect(results.length).toBeGreaterThan(0)
    const ieee = results.find((r) => r.styleId === 'ieee')
    expect(ieee).toBeDefined()
  })

  it('detects APA-like author-date citation', async () => {
    const results = await detectStyle(
      'Smith, J. A. (2024). A study of artificial intelligence. Journal of Computer Science, 45(2), 112-128.'
    )
    expect(results.length).toBeGreaterThan(0)
    const apa = results.find((r) => r.category === 'author-date')
    expect(apa).toBeDefined()
  })

  it('detects Vancouver-like numbered citation', async () => {
    const results = await detectStyle(
      '1. Smith JA, Lee BC. A study of artificial intelligence. J Comput Sci. 2024;45(2):112-128.'
    )
    expect(results.length).toBeGreaterThan(0)
  })
})
