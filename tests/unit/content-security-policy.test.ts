import { describe, expect, it } from 'vitest'
import { productionContentSecurityPolicy } from '../../src/shared/content-security-policy'

describe('productionContentSecurityPolicy', () => {
  it('restricts connect-src and allows pdf workers in production policy', () => {
    const csp = productionContentSecurityPolicy()
    expect(csp).toContain("connect-src 'self'")
    expect(csp).toContain("worker-src 'self' blob:")
    expect(csp).not.toContain('unsafe-eval')
  })
})
