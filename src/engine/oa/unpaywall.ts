import { fetchWithPolicy, readJsonResponse, validateExternalUrl } from '../network/http'
import { THRESHOLDS } from '../manuscript/thresholds'

export interface UnpaywallBestLocation {
  url: string | null
  url_for_pdf?: string | null
  url_for_landing_page?: string | null
  license?: string | null
  host_type?: string | null
}

export interface UnpaywallResponse {
  doi: string
  is_oa: boolean
  best_oa_location?: UnpaywallBestLocation | null
}

export async function fetchUnpaywall(
  doi: string,
  options: { email?: string; signal?: AbortSignal }
): Promise<UnpaywallResponse> {
  const email = options.email?.trim()
  const url = new URL(`https://api.unpaywall.org/v2/${encodeURIComponent(doi)}`)
  if (email) url.searchParams.set('email', email)
  const validated = validateExternalUrl(url.toString())
  const response = await fetchWithPolicy(validated, { signal: options.signal }, { timeoutMs: THRESHOLDS.http.requestTimeoutMs })
  return await readJsonResponse<UnpaywallResponse>(response, { maxBytes: THRESHOLDS.http.abstractMaxBytes })
}

