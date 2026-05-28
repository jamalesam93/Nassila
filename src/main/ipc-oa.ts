import { ipcMain, net } from 'electron'
import { THRESHOLDS } from '../engine/manuscript/thresholds'
import { validateExternalUrl } from '../engine/network/http'

type OaContentKind = 'jats' | 'html' | 'pdf' | 'unknown'

async function netFetchWithTimeout(url: URL, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(new Error('Request timed out')), THRESHOLDS.http.requestTimeoutMs)
  const abortExternal = () => controller.abort(init.signal?.reason)
  init.signal?.addEventListener('abort', abortExternal, { once: true })

  try {
    // net.fetch uses Electron's network stack and bypasses renderer CORS constraints.
    return await net.fetch(url.toString(), { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
    init.signal?.removeEventListener('abort', abortExternal)
  }
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

    const validated = validateExternalUrl(url.toString())
    const response = await netFetchWithTimeout(validated, { headers: { 'accept': 'application/json' } })
    if (!response.ok) {
      // Commonly 422 when email is missing/invalid; treat as "no OA info" rather than hard error spam.
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
    const validated = validateExternalUrl(url)
    const response = await netFetchWithTimeout(validated, { headers: { 'accept': 'application/xml,text/xml' } })
    if (!response.ok) {
      throw new Error(`Europe PMC request failed: ${response.status}`)
    }
    const bytes = await readBytesCapped(response, THRESHOLDS.http.fullTextMaxBytes)
    const jatsXml = new TextDecoder().decode(bytes)
    return { source: 'europe_pmc', url: validated.toString(), jatsXml }
  })

  /**
   * Fetch an arbitrary article URL as HTML from the main process so we can read
   * `<meta name="citation_doi">` etc. without renderer-side CORS rejections.
   * Returns the response text along with the resolved (post-redirect) URL.
   */
  ipcMain.handle('url:fetchHtml', async (_event, rawUrl: string) => {
    if (typeof rawUrl !== 'string' || rawUrl.trim().length === 0) {
      throw new Error('Invalid URL')
    }
    let validated: URL
    try {
      validated = validateExternalUrl(rawUrl, {
        allowHttp: false,
        allowLocalhost: false,
        allowPrivateHosts: false
      })
    } catch (e) {
      return { ok: false, status: 0, contentType: null, finalUrl: rawUrl, html: '', error: (e as Error).message }
    }

    let response: Response
    try {
      response = await netFetchWithTimeout(validated, {
        headers: {
          'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'accept-language': 'en-US,en;q=0.9',
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        }
      })
    } catch (e) {
      return { ok: false, status: 0, contentType: null, finalUrl: validated.toString(), html: '', error: (e as Error).message }
    }

    const contentType = response.headers.get('content-type')
    if (!response.ok) {
      try { await response.body?.cancel() } catch { /* noop */ }
      return { ok: false, status: response.status, contentType, finalUrl: response.url || validated.toString(), html: '' }
    }
    const lower = (contentType ?? '').toLowerCase()
    if (lower && !lower.includes('html') && !lower.includes('xml')) {
      try { await response.body?.cancel() } catch { /* noop */ }
      return { ok: false, status: response.status, contentType, finalUrl: response.url || validated.toString(), html: '', error: 'non-html-content' }
    }

    try {
      const bytes = await readBytesCapped(response, 2 * 1024 * 1024)
      const html = new TextDecoder().decode(bytes)
      return { ok: true, status: response.status, contentType, finalUrl: response.url || validated.toString(), html }
    } catch (e) {
      return { ok: false, status: response.status, contentType, finalUrl: response.url || validated.toString(), html: '', error: (e as Error).message }
    }
  })

  ipcMain.handle('oa:fetchOaUrl', async (_event, rawUrl: string) => {
    if (typeof rawUrl !== 'string' || rawUrl.trim().length === 0) throw new Error('Invalid URL')
    const validated = validateExternalUrl(rawUrl, { allowHttp: false, allowLocalhost: false, allowPrivateHosts: false })

    const response = await netFetchWithTimeout(validated, {
      headers: {
        'accept':
          'application/pdf,application/xml,text/xml,text/html;q=0.9,*/*;q=0.5',
        'accept-language': 'en-US,en;q=0.9',
        'user-agent':
          'Mozilla/5.0 (compatible; CitationsStyleAuditor/1.0; +https://example.local)'
      }
    })

    if (!response.ok) {
      // Many publisher hosts block non-browser fetches (403), require auth (401),
      // rate-limit (429), or are unavailable for legal reasons (451). In those cases
      // we skip OA full-text and let the pipeline fall back to abstract-only —
      // without spamming the main-process log with unhandled errors.
      if ([401, 403, 404, 410, 429, 451].includes(response.status)) {
        return {
          url: validated.toString(),
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
      // We don't currently extract text from OA PDFs (L3 returns insufficient_evidence
      // when kind==='pdf'). Downloading the body would pull several MB per ref, then
      // transfer them over IPC, only to be discarded — which caused the pipeline to
      // hang on large PDFs. Close the connection after headers and move on.
      try { await response.body?.cancel() } catch { /* noop */ }
      return { url: validated.toString(), contentType, kind }
    }

    const bytes = await readBytesCapped(response, THRESHOLDS.http.fullTextMaxBytes)
    const text = new TextDecoder().decode(bytes)
    if (kind === 'unknown') {
      if (text.trimStart().startsWith('<?xml')) kind = 'jats'
      else if (/<\/(html|body)>/i.test(text)) kind = 'html'
    }

    return { url: validated.toString(), contentType, kind, text }
  })
}

