import { describe, expect, it } from 'vitest'
import {
  HTML_FETCH_URL_POLICY,
  isAllowedHtmlFetchUrl,
  isAllowedOaFetchUrl,
  OA_FETCH_URL_POLICY
} from '../../src/engine/network/url-policies'
import { tryValidateExternalUrl } from '../../src/engine/network/http'

describe('OA fetch URL policy', () => {
  it('allows public https and http publisher URLs', () => {
    expect(isAllowedOaFetchUrl('https://pmc.ncbi.nlm.nih.gov/articles/PMC123/')).toBe(true)
    expect(isAllowedOaFetchUrl('http://example.org/article.pdf')).toBe(true)
  })

  it('blocks localhost and private networks', () => {
    expect(isAllowedOaFetchUrl('http://127.0.0.1/o')).toBe(false)
    expect(isAllowedOaFetchUrl('http://192.168.1.1/file')).toBe(false)
    expect(isAllowedOaFetchUrl('http://169.254.169.254/')).toBe(false)
  })

  it('blocks unsupported schemes', () => {
    expect(isAllowedOaFetchUrl('ftp://example.org/file')).toBe(false)
  })

  it('matches tryValidateExternalUrl with shared policy constant', () => {
    const url = 'https://example.org/oa'
    expect(isAllowedOaFetchUrl(url)).toBe(tryValidateExternalUrl(url, OA_FETCH_URL_POLICY) !== null)
  })
})

describe('HTML fetch URL policy', () => {
  it('requires https for metadata fetch', () => {
    expect(isAllowedHtmlFetchUrl('https://link.springer.com/article/10.1/example')).toBe(true)
    expect(isAllowedHtmlFetchUrl('http://example.org/page')).toBe(false)
  })

  it('blocks private hosts', () => {
    expect(isAllowedHtmlFetchUrl('https://127.0.0.1/')).toBe(false)
  })

  it('matches tryValidateExternalUrl with shared policy constant', () => {
    const url = 'https://example.org/meta'
    expect(isAllowedHtmlFetchUrl(url)).toBe(tryValidateExternalUrl(url, HTML_FETCH_URL_POLICY) !== null)
  })
})
