import type { CslItem } from '../types'
import { classifyWebpageHost, type WebpageHostProfile } from './webpage-hosts'
import { fetchUrlMetadata } from './url'
import { fetchWithPolicy, readJsonResponse, tryValidateExternalUrl } from '../network/http'

export interface WebpageHealthResult {
  url: string
  ok: boolean
  status: number
  isDead: boolean
  waybackUrl: string
  contentType?: string | null
  error?: string
}

export interface WebpageResolutionResult {
  url: string
  item: CslItem | null
  hostProfile: WebpageHostProfile
  health: WebpageHealthResult
}

/** Normalize a raw citation URL into an http(s) page target for archive lookups. */
function canonicalPageUrl(rawUrl: string): string {
  let clean = rawUrl.trim()
  if (!/^https?:\/\//i.test(clean)) {
    clean = `https://${clean}`
  }
  return clean
}

/** Construct a canonical Wayback Machine snapshot lookup URL for dead or broken links. */
export function buildWaybackUrl(rawUrl: string): string {
  return `https://web.archive.org/web/*/${canonicalPageUrl(rawUrl)}`
}

export interface WaybackSnapshot {
  timestamp: string
  url: string
}

const WAYBACK_AVAILABILITY_ENDPOINT = 'https://archive.org/wayback/available'

/**
 * Query the Wayback availability API for the closest snapshot of a page.
 * Returns null when no snapshot exists or the lookup fails — callers show nothing.
 */
export async function queryWaybackSnapshot(rawUrl: string): Promise<WaybackSnapshot | null> {
  try {
    const target = tryValidateExternalUrl(canonicalPageUrl(rawUrl))
    if (!target) return null
    const response = await fetchWithPolicy(
      `${WAYBACK_AVAILABILITY_ENDPOINT}?url=${encodeURIComponent(target.toString())}`
    )
    if (!response.ok) return null
    const data = await readJsonResponse<{
      archived_snapshots?: { closest?: { available?: boolean; url?: string; timestamp?: string } }
    }>(response)
    const closest = data.archived_snapshots?.closest
    if (!closest?.available || !closest.url || !closest.timestamp) return null
    return { timestamp: closest.timestamp, url: closest.url }
  } catch {
    return null
  }
}

/** Extract host profile, webpage metadata, and archive links for a target URL citation. */
export async function resolveWebpageMetadata(rawUrl: string): Promise<WebpageResolutionResult> {
  const hostProfile = classifyWebpageHost(rawUrl)
  const waybackUrl = buildWaybackUrl(rawUrl)

  const partialMeta = await fetchUrlMetadata(rawUrl)

  if (!partialMeta || !partialMeta.title) {
    const health: WebpageHealthResult = {
      url: rawUrl,
      ok: false,
      status: 404,
      isDead: true,
      waybackUrl,
      error: 'Failed to extract valid title from webpage HTML'
    }

    return {
      url: rawUrl,
      item: null,
      hostProfile,
      health
    }
  }

  let hostname = ''
  try {
    hostname = new URL(rawUrl).hostname
  } catch {
    hostname = rawUrl
  }

  const health: WebpageHealthResult = {
    url: rawUrl,
    ok: true,
    status: 200,
    isDead: false,
    waybackUrl
  }

  const item: CslItem = {
    id: `webpage-${Date.now()}`,
    type: 'webpage',
    title: partialMeta.title,
    author: partialMeta.author ?? [],
    'container-title': partialMeta['container-title'] ?? hostname,
    publisher: partialMeta.publisher ?? hostname,
    URL: rawUrl,
    issued: partialMeta.issued,
    abstract: partialMeta.abstract,
    DOI: partialMeta.DOI,
    genre: hostProfile.kind !== 'unknown' ? hostProfile.kind : undefined,
    _sourceFormat: 'url',
    _parseConfidence: 0.85
  }

  return {
    url: rawUrl,
    item,
    hostProfile,
    health
  }
}
