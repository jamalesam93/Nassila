import { validateExternalUrl, type UrlPolicy } from './http'

export const MAX_VALIDATED_REDIRECTS = 5

export type ValidatedFetchFn = (url: URL, init: RequestInit) => Promise<Response>

export interface ValidatedFetchResult {
  response: Response
  finalUrl: URL
}

/**
 * Fetch with redirect: manual and re-validate each hop + final response.url
 * against the same URL policy (blocks redirect SSRF to localhost/private hosts).
 */
export async function fetchWithValidatedRedirects(
  fetchFn: ValidatedFetchFn,
  rawUrl: string,
  init: RequestInit,
  urlPolicy: UrlPolicy,
  redirectCount = 0
): Promise<ValidatedFetchResult> {
  const currentUrl = validateExternalUrl(rawUrl, urlPolicy)
  const response = await fetchFn(currentUrl, { ...init, redirect: 'manual' })

  if (response.status >= 300 && response.status < 400) {
    if (redirectCount >= MAX_VALIDATED_REDIRECTS) {
      try { await response.body?.cancel() } catch { /* noop */ }
      throw new Error('Too many redirects')
    }

    const location = response.headers.get('location')
    if (!location) {
      try { await response.body?.cancel() } catch { /* noop */ }
      throw new Error('Redirect missing location')
    }

    try { await response.body?.cancel() } catch { /* noop */ }

    const redirected = new URL(location, currentUrl).toString()
    return fetchWithValidatedRedirects(fetchFn, redirected, init, urlPolicy, redirectCount + 1)
  }

  const finalRaw = response.url && response.url.length > 0 ? response.url : currentUrl.toString()
  const finalUrl = validateExternalUrl(finalRaw, urlPolicy)
  return { response, finalUrl }
}
