import { describe, expect, it } from 'vitest'
import { tryValidateExternalUrl, validateExternalUrl } from '../../src/engine/network/http'

describe('validateExternalUrl', () => {
  it('allows public https URLs', () => {
    const url = validateExternalUrl('https://example.org/article')
    expect(url.toString()).toBe('https://example.org/article')
  })

  it('blocks localhost and private addresses by default', () => {
    expect(() => validateExternalUrl('https://localhost:11434')).toThrow(/not allowed/i)
    expect(() => validateExternalUrl('https://127.0.0.1/test')).toThrow(/not allowed/i)
    expect(() => validateExternalUrl('https://192.168.1.10/test')).toThrow(/not allowed/i)
  })

  it('can allow local http for explicitly local services', () => {
    const url = validateExternalUrl('http://localhost:11434', {
      allowHttp: true,
      allowLocalhost: true
    })
    expect(url.host).toBe('localhost:11434')
  })

  it('rejects unsupported protocols and authenticated URLs', () => {
    expect(() => validateExternalUrl('ftp://example.org/file')).toThrow(/only http/i)
    expect(() => validateExternalUrl('https://user:pass@example.org')).toThrow(/authenticated/i)
  })

  it('allows public http URLs when explicitly permitted', () => {
    const url = validateExternalUrl('http://example.org/article.pdf', { allowHttp: true })
    expect(url.protocol).toBe('http:')
  })

  it('tryValidateExternalUrl returns null instead of throwing', () => {
    expect(tryValidateExternalUrl('ftp://example.org/file')).toBeNull()
    expect(tryValidateExternalUrl('http://example.org/oa', { allowHttp: true })?.hostname).toBe('example.org')
  })
})
