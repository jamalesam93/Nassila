import { describe, it, expect } from 'vitest'
import { detectIdentifierType, cleanIdentifier } from '../../src/engine/resolver/index'

describe('identifier detection', () => {
  it('detects DOI', () => {
    expect(detectIdentifierType('10.1038/s41586-024-07386-0')).toBe('doi')
    expect(detectIdentifierType('https://doi.org/10.1038/s41586-024-07386-0')).toBe('doi')
  })

  it('detects ISBN', () => {
    expect(detectIdentifierType('978-0-13-468599-1')).toBe('isbn')
    expect(detectIdentifierType('9780134685991')).toBe('isbn')
  })

  it('detects PMID', () => {
    expect(detectIdentifierType('12345678')).toBe('pmid')
  })

  it('detects URL', () => {
    expect(detectIdentifierType('https://www.nature.com/articles/s41586-024-07386-0')).toBe('url')
  })

  it('returns unknown for garbage', () => {
    expect(detectIdentifierType('hello world')).toBe('unknown')
  })
})

describe('cleanIdentifier', () => {
  it('strips doi.org prefix', () => {
    expect(cleanIdentifier('https://doi.org/10.1038/test', 'doi')).toBe('10.1038/test')
  })

  it('strips ISBN hyphens', () => {
    expect(cleanIdentifier('978-0-13-468599-1', 'isbn')).toBe('9780134685991')
  })
})
