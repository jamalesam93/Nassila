import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveDataCiteDoi } from '../../src/engine/resolver/datacite'

describe('DataCite preprint identity', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('maps DataCite Text/Preprint to article and preserves version', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: {
        attributes: {
          doi: '10.48550/arXiv.2507.19530',
          titles: [{ title: 'Operator arXiv preprint' }],
          creators: [{ familyName: 'Smith', givenName: 'A' }],
          publisher: 'arXiv',
          publicationYear: 2025,
          types: {
            resourceTypeGeneral: 'Text',
            resourceType: 'Preprint'
          },
          version: 'v2',
          url: 'https://arxiv.org/abs/2507.19530v2'
        }
      }
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    })))

    const item = await resolveDataCiteDoi('10.48550/arXiv.2507.19530')

    expect(item).toMatchObject({
      type: 'article',
      genre: 'Preprint',
      version: 'v2',
      DOI: '10.48550/arXiv.2507.19530',
      URL: 'https://arxiv.org/abs/2507.19530v2'
    })
  })
})
