import { fetchWithPolicy, readTextResponse, validateExternalUrl } from '../network/http'
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
  const url = validateExternalUrl(rawUrl, { allowHttp: false, allowLocalhost: false, allowPrivateHosts: false })
  const response = await fetchWithPolicy(url, { signal }, { timeoutMs: THRESHOLDS.http.requestTimeoutMs })
  const contentType = response.headers.get('content-type')
  const lower = (contentType ?? '').toLowerCase()

  if (lower.includes('application/pdf')) {
    const bytes = await response.arrayBuffer()
    if (bytes.byteLength > THRESHOLDS.http.fullTextMaxBytes) {
      throw new Error('OA PDF exceeded max size')
    }
    return { url: url.toString(), contentType, kind: 'pdf', pdfBytes: bytes }
  }

  const text = await readTextResponse(response, { maxBytes: THRESHOLDS.http.fullTextMaxBytes })
  if (lower.includes('xml') || text.trimStart().startsWith('<?xml')) {
    return { url: url.toString(), contentType, kind: 'jats', text }
  }
  if (lower.includes('html') || /<\/(html|body)>/i.test(text)) {
    return { url: url.toString(), contentType, kind: 'html', text }
  }

  return { url: url.toString(), contentType, kind: 'unknown', text }
}

