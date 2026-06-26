import { describe, expect, it, vi } from 'vitest'
import { fetchWithValidatedRedirects } from '../../src/engine/network/redirect-fetch'

function mockResponse(status: number, init: { location?: string; url?: string } = {}): Response {
  return {
    status,
    url: init.url ?? '',
    headers: {
      get(name: string) {
        if (name.toLowerCase() === 'location') return init.location ?? null
        return null
      }
    },
    body: { cancel: vi.fn() }
  } as unknown as Response
}

describe('fetchWithValidatedRedirects', () => {
  it('follows redirects that stay on allowed public hosts', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(mockResponse(302, { location: '/final' }))
      .mockResolvedValueOnce(mockResponse(200, { url: 'https://example.org/final' }))

    const { response, finalUrl } = await fetchWithValidatedRedirects(
      fetchFn,
      'https://example.org/start',
      {},
      { allowHttp: true }
    )

    expect(fetchFn).toHaveBeenCalledTimes(2)
    expect(response.status).toBe(200)
    expect(finalUrl.hostname).toBe('example.org')
    expect(fetchFn.mock.calls[0][1]).toMatchObject({ redirect: 'manual' })
  })

  it('blocks redirects to localhost (SSRF)', async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(
      mockResponse(302, { location: 'http://127.0.0.1/secret' })
    )

    await expect(
      fetchWithValidatedRedirects(fetchFn, 'https://example.org/start', {}, { allowHttp: true })
    ).rejects.toThrow(/not allowed/i)
  })

  it('blocks redirects to private IPv4', async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(
      mockResponse(302, { location: 'http://192.168.0.1/' })
    )

    await expect(
      fetchWithValidatedRedirects(fetchFn, 'https://example.org/', {}, { allowHttp: true })
    ).rejects.toThrow(/not allowed/i)
  })

  it('rejects final response.url that fails policy', async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(
      mockResponse(200, { url: 'http://127.0.0.1/evil' })
    )

    await expect(
      fetchWithValidatedRedirects(
        fetchFn,
        'https://example.org/',
        {},
        { allowHttp: false, allowLocalhost: false, allowPrivateHosts: false }
      )
    ).rejects.toThrow(/not allowed|Only HTTP/i)
  })

  it('caps redirect hops', async () => {
    const fetchFn = vi.fn().mockImplementation(() =>
      Promise.resolve(mockResponse(302, { location: '/loop' }))
    )

    await expect(
      fetchWithValidatedRedirects(fetchFn, 'https://example.org/', {}, { allowHttp: true })
    ).rejects.toThrow(/too many redirects/i)
  })
})
