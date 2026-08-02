import type { CslItem } from '../types'
import { classifyWebpageHost, type WebpageHostProfile } from './webpage-hosts'
import { fetchUrlMetadata } from './url'

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

/** Construct a canonical Wayback Machine snapshot lookup URL for dead or broken links. */
export function buildWaybackUrl(rawUrl: string): string {
  let clean = rawUrl.trim()
  if (!/^https?:\/\//i.test(clean)) {
    clean = `https://${clean}`
  }
  return `https://web.archive.org/web/*/${clean}`
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
