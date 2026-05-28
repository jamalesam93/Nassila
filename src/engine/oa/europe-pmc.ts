import { fetchWithPolicy, readTextResponse, validateExternalUrl } from '../network/http'
import { THRESHOLDS } from '../manuscript/thresholds'

export interface EuropePmcFullTextResult {
  source: 'europe_pmc'
  url: string
  jatsXml: string
}

export async function fetchEuropePmcJatsByPmcid(
  pmcid: string,
  signal?: AbortSignal
): Promise<EuropePmcFullTextResult> {
  const normalized = pmcid.toUpperCase().startsWith('PMC') ? pmcid.toUpperCase() : `PMC${pmcid}`
  const rawUrl = `https://www.ebi.ac.uk/europepmc/webservices/rest/PMC${normalized.replace(/^PMC/, '')}/fullTextXML`
  const url = validateExternalUrl(rawUrl)
  const response = await fetchWithPolicy(url, { signal }, { timeoutMs: THRESHOLDS.http.requestTimeoutMs })
  const jatsXml = await readTextResponse(response, { maxBytes: THRESHOLDS.http.fullTextMaxBytes })
  return { source: 'europe_pmc', url: url.toString(), jatsXml }
}

