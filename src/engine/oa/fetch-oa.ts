import { fetchWithPolicy, readTextResponse, tryValidateExternalUrl } from '../network/http'
import { fetchWithValidatedRedirects } from '../network/redirect-fetch'
import { OA_FETCH_URL_POLICY } from '../network/url-policies'
import { THRESHOLDS } from '../manuscript/thresholds'

export type OaContentKind = 'jats' | 'html' | 'pdf' | 'unknown'

export interface OaFetchResult {
  url: string
  contentType: string | null
  kind: OaContentKind
  text?: string
  pdfBytes?: ArrayBuffer
}

export async function fetchOaUrlText(
  rawUrl: string,
  signal?: AbortSignal
): Promise<OaFetchResult> {
  const url = tryValidateExternalUrl(rawUrl, OA_FETCH_URL_POLICY)
  if (!url) {
    throw new Error('OA URL is not a fetchable HTTP(S) address')
  }

  const { response, finalUrl } = await fetchWithValidatedRedirects(
    (parsed, init) => fetchWithPolicy(parsed, init, { timeoutMs: THRESHOLDS.http.requestTimeoutMs }),
    url.toString(),
    { signal },
    OA_FETCH_URL_POLICY
  )

  const contentType = response.headers.get('content-type')
  const lower = (contentType ?? '').toLowerCase()

  if (lower.includes('application/pdf')) {
    const bytes = await response.arrayBuffer()
    if (bytes.byteLength > THRESHOLDS.http.fullTextMaxBytes) {
      throw new Error('OA PDF exceeded max size')
    }
    return { url: finalUrl.toString(), contentType, kind: 'pdf', pdfBytes: bytes }
  }

  const text = await readTextResponse(response, { maxBytes: THRESHOLDS.http.fullTextMaxBytes })
  if (lower.includes('xml') || text.trimStart().startsWith('<?xml')) {
    return { url: finalUrl.toString(), contentType, kind: 'jats', text }
  }
  if (lower.includes('html') || /<\/(html|body)>/i.test(text)) {
    return { url: finalUrl.toString(), contentType, kind: 'html', text }
  }

  return { url: finalUrl.toString(), contentType, kind: 'unknown', text }
}
