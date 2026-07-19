import { describe, expect, it } from 'vitest'
import {
  sanitizeCslItem,
  sanitizeRegistrySource
} from '../../src/shared/manuscript-registry-ipc'

describe('manuscript registry IPC sanitizers', () => {
  it('accepts CslItem with string id', () => {
    const item = sanitizeCslItem({ id: 'c1', title: 'Test', type: 'article-journal' })
    expect(item?.id).toBe('c1')
    expect(item?.title).toBe('Test')
  })

  it('rejects non-objects and missing id', () => {
    expect(sanitizeCslItem(null)).toBeNull()
    expect(sanitizeCslItem({})).toBeNull()
    expect(sanitizeCslItem({ id: 1 })).toBeNull()
    expect(sanitizeCslItem({ id: '  ' })).toBeNull()
  })

  it('accepts only known registry sources', () => {
    expect(sanitizeRegistrySource('crossref')).toBe('crossref')
    expect(sanitizeRegistrySource('datacite')).toBe('datacite')
    expect(sanitizeRegistrySource('pubmed')).toBe('pubmed')
    expect(sanitizeRegistrySource('openalex')).toBe('openalex')
    expect(sanitizeRegistrySource('none')).toBe('none')
    expect(sanitizeRegistrySource(1)).toBeNull()
  })
})
