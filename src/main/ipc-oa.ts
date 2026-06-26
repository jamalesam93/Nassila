import { ipcMain, net } from 'electron'
import { THRESHOLDS } from '../engine/manuscript/thresholds'
import { tryValidateExternalUrl, type UrlPolicy } from '../engine/network/http'
import { fetchWithValidatedRedirects } from '../engine/network/redirect-fetch'
import { HTML_FETCH_URL_POLICY, OA_FETCH_URL_POLICY } from '../engine/network/url-policies'

type OaContentKind = 'jats' | 'html' | 'pdf' | 'unknown'

async function netFetchWithTimeout(url: URL, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(new Error('Request timed out')), THRESHOLDS.http.requestTimeoutMs)
  const abortExternal = () => controller.abort(init.signal?.reason)
  init.signal?.addEventListener('abort', abortExternal, { once: true })

  try {
    return await net.fetch(url.toString(), { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
    init.signal?.removeEventListener('abort', abortExternal)
  }
}

async function netFetchValidated(
  rawUrl: string,
  init: RequestInit,
  urlPolicy: UrlPolicy
): Promise<{ response: Response; finalUrl: URL }> {
  return fetchWithValidatedRedirects(
    (parsed, requestInit) => netFetchWithTimeout(parsed, requestInit),
    rawUrl,
    init,
    urlPolicy
  )
}

async function readBytesCapped(response: Response, maxBytes: number): Promise<Uint8Array> {
  const headerLength = response.headers.get('content-length')
  const declaredBytes = headerLength ? Number.parseInt(headerLength, 10) : Number.NaN
  if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
    throw new Error(`Response exceeded ${maxBytes} bytes`)
  }

  const buffer = new Uint8Array(await response.arrayBuffer())
  if (buffer.byteLength > maxBytes) {
    throw new Error(`Response exceeded ${maxBytes} bytes`)
  }
  return buffer
}

export function registerOaIpcHandlers(): void {
  ipcMain.handle('oa:unpaywall', async (_event, doi: string, email?: string) => {
    if (typeof doi !== 'string' || doi.trim().length === 0) throw new Error('Invalid DOI')
    const url = new URL(`https://api.unpaywall.org/v2/${encodeURIComponent(doi.trim())}`)
    if (typeof email === 'string' && email.trim()) {
      url.searchParams.set('email', email.trim())
    }

    const { response } = await netFetchValidated(url.toString(), { headers: { accept: 'application/json' } }, HTML_FETCH_URL_POLICY)
    if (!response.ok) {
      if (response.status === 422) {
        return { doi: doi.trim(), is_oa: false, best_oa_location: null, error: 'unpaywall_422' }
      }
      throw new Error(`Unpaywall request failed: ${response.status}`)
    }

    const bytes = await readBytesCapped(response, THRESHOLDS.http.abstractMaxBytes)
    const text = new TextDecoder().decode(bytes)
    return JSON.parse(text) as unknown
  })

  ipcMain.handle('oa:europePmcJatsByPmcid', async (_event, pmcid: string) => {
    if (typeof pmcid !== 'string' || pmcid.trim().length === 0) throw new Error('Invalid PMCID')
    const normalized = pmcid.toUpperCase().startsWith('PMC') ? pmcid.toUpperCase() : `PMC${pmcid}`
    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/PMC${normalized.replace(/^PMC/, '')}/fullTextXML`
    const { response, finalUrl } = await netFetchValidated(
      url,
      { headers: { accept: 'application/xml,text/xml' } },
      HTML_FETCH_URL_POLICY
    )
    if (!response.ok) {
      throw new Error(`Europe PMC request failed: ${response.status}`)
    }
    const bytes = await readBytesCapped(response, THRESHOLDS.http.fullTextMaxBytes)
    const jatsXml = new TextDecoder().decode(bytes)
    return { source: 'europe_pmc', url: finalUrl.toString(), jatsXml }
  })

  ipcMain.handle('url:fetchHtml', async (_event, rawUrl: string) => {
    if (typeof rawUrl !== 'string' || rawUrl.trim().length === 0) {
      throw new Error('Invalid URL')
    }

    let response: Response
    let finalUrl: URL
    try {
      const result = await netFetchValidated(
        rawUrl,
        {
          headers: {
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'accept-language': 'en-US,en;q=0.9',
            'user-agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
          }
        },
        HTML_FETCH_URL_POLICY
      )
      response = result.response
      finalUrl = result.finalUrl
    } catch (e) {
      return { ok: false, status: 0, contentType: null, finalUrl: rawUrl, html: '', error: (e as Error).message }
    }

    const contentType = response.headers.get('content-type')
    const finalUrlStr = finalUrl.toString()

    if (!response.ok) {
      try { await response.body?.cancel() } catch { /* noop */ }
      return { ok: false, status: response.status, contentType, finalUrl: finalUrlStr, html: '' }
    }

    const lower = (contentType ?? '').toLowerCase()
    if (lower && !lower.includes('html') && !lower.includes('xml')) {
      try { await response.body?.cancel() } catch { /* noop */ }
      return { ok: false, status: response.status, contentType, finalUrl: finalUrlStr, html: '', error: 'non-html-content' }
    }

    try {
      const bytes = await readBytesCapped(response, 2 * 1024 * 1024)
      const html = new TextDecoder().decode(bytes)
      return { ok: true, status: response.status, contentType, finalUrl: finalUrlStr, html }
    } catch (e) {
      return { ok: false, status: response.status, contentType, finalUrl: finalUrlStr, html: '', error: (e as Error).message }
    }
  })

  ipcMain.handle('oa:fetchOaUrl', async (_event, rawUrl: string) => {
    if (typeof rawUrl !== 'string' || rawUrl.trim().length === 0) {
      return {
        url: '',
        contentType: null,
        kind: 'unknown' as OaContentKind,
        text: '',
        blocked: true,
        status: 0,
        error: 'invalid_url'
      }
    }

    const validated = tryValidateExternalUrl(rawUrl, OA_FETCH_URL_POLICY)
    if (!validated) {
      return {
        url: rawUrl.trim(),
        contentType: null,
        kind: 'unknown' as OaContentKind,
        text: '',
        blocked: true,
        status: 0,
        error: 'url_not_allowed'
      }
    }

    let response: Response
    let finalUrl: URL
    try {
      const result = await netFetchValidated(
        validated.toString(),
        {
          headers: {
            accept: 'application/pdf,application/xml,text/xml,text/html;q=0.9,*/*;q=0.5',
            'accept-language': 'en-US,en;q=0.9',
            'user-agent': 'Mozilla/5.0 (compatible; CitationsStyleAuditor/1.0; +https://example.local)'
          }
        },
        OA_FETCH_URL_POLICY
      )
      response = result.response
      finalUrl = result.finalUrl
    } catch (e) {
      return {
        url: validated.toString(),
        contentType: null,
        kind: 'unknown' as OaContentKind,
        text: '',
        blocked: true,
        status: 0,
        error: (e as Error).message
      }
    }

    const resolvedUrl = finalUrl.toString()

    if (!response.ok) {
      if ([401, 403, 404, 410, 429, 451].includes(response.status)) {
        return {
          url: resolvedUrl,
          contentType: null,
          kind: 'unknown' as OaContentKind,
          text: '',
          blocked: true,
          status: response.status
        }
      }
      throw new Error(`OA fetch failed: ${response.status}`)
    }

    const contentType = response.headers.get('content-type')
    const lower = (contentType ?? '').toLowerCase()

    let kind: OaContentKind = 'unknown'
    if (lower.includes('application/pdf')) kind = 'pdf'
    else if (lower.includes('xml')) kind = 'jats'
    else if (lower.includes('html')) kind = 'html'

    if (kind === 'pdf') {
      try { await response.body?.cancel() } catch { /* noop */ }
      return { url: resolvedUrl, contentType, kind }
    }

    const bytes = await readBytesCapped(response, THRESHOLDS.http.fullTextMaxBytes)
    const text = new TextDecoder().decode(bytes)
    if (kind === 'unknown') {
      if (text.trimStart().startsWith('<?xml')) kind = 'jats'
      else if (/<\/(html|body)>/i.test(text)) kind = 'html'
    }

    return { url: resolvedUrl, contentType, kind, text }
  })
}
