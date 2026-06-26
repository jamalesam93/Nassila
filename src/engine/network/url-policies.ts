import { tryValidateExternalUrl, type UrlPolicy } from './http'

/** OA full-text / publisher fetch from main process (ipc-oa, engine fetch-oa). */
export const OA_FETCH_URL_POLICY = {
  allowHttp: true,
  allowLocalhost: false,
  allowPrivateHosts: false
} as const satisfies UrlPolicy

/** HTML metadata fetch (citation_doi meta tags) — HTTPS public hosts only. */
export const HTML_FETCH_URL_POLICY = {
  allowHttp: false,
  allowLocalhost: false,
  allowPrivateHosts: false
} as const satisfies UrlPolicy

export function isAllowedOaFetchUrl(rawUrl: string): boolean {
  return tryValidateExternalUrl(rawUrl, OA_FETCH_URL_POLICY) !== null
}

export function isAllowedHtmlFetchUrl(rawUrl: string): boolean {
  return tryValidateExternalUrl(rawUrl, HTML_FETCH_URL_POLICY) !== null
}
