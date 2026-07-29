import type { CslItem } from '../types'

/** Deterministic grey-web host classification (Raqim Web / 1.5.0 prep). */

export type WebpageHostKind =  | 'scholarly_journal'
  | 'preprint'
  | 'government'
  | 'organization'
  | 'news'
  | 'blog'
  | 'video'
  | 'social'
  | 'repository'
  | 'unknown'

export interface WebpageHostProfile {
  kind: WebpageHostKind
  platform?: string
  stableParser: boolean
  notes?: string
}

const HOST_RULES: { pattern: RegExp; profile: WebpageHostProfile }[] = [
  { pattern: /(?:^|\.)youtube\.com$/i, profile: { kind: 'video', platform: 'youtube', stableParser: true } },
  { pattern: /youtu\.be$/i, profile: { kind: 'video', platform: 'youtube', stableParser: true } },
  { pattern: /(?:^|\.)substack\.com$/i, profile: { kind: 'blog', platform: 'substack', stableParser: true } },
  { pattern: /(?:^|\.)medium\.com$/i, profile: { kind: 'blog', platform: 'medium', stableParser: false } },
  { pattern: /(?:^|\.)github\.com$/i, profile: { kind: 'repository', platform: 'github', stableParser: true } },
  { pattern: /(?:^|\.)gitlab\.com$/i, profile: { kind: 'repository', platform: 'gitlab', stableParser: false } },
  { pattern: /(?:^|\.)zenodo\.org$/i, profile: { kind: 'repository', platform: 'zenodo', stableParser: true } },
  { pattern: /(?:^|\.)who\.int$/i, profile: { kind: 'organization', platform: 'who', stableParser: false } },
  { pattern: /\.gov(?:\.[a-z]{2})?$/i, profile: { kind: 'government', stableParser: false, notes: 'Prefer official catalogue URL patterns for legislation' } },
  { pattern: /\.gov\.uk$/i, profile: { kind: 'government', stableParser: false } },
  { pattern: /(?:^|\.)twitter\.com$|(?:^|\.)x\.com$/i, profile: { kind: 'social', platform: 'x', stableParser: false } },
  { pattern: /(?:^|\.)linkedin\.com$/i, profile: { kind: 'social', platform: 'linkedin', stableParser: false } }
]

export function classifyWebpageHost(rawUrl: string): WebpageHostProfile {
  let host = ''
  try {
    host = new URL(rawUrl).hostname.toLowerCase()
  } catch {
    return { kind: 'unknown', stableParser: false }
  }

  for (const rule of HOST_RULES) {
    if (rule.pattern.test(host)) return { ...rule.profile }
  }

  if (/(?:^|\.)news\./i.test(host) || /(?:^|\.)reuters\.com$|(?:^|\.)bbc\.(co\.uk|com)$/i.test(host)) {
    return { kind: 'news', stableParser: false }
  }

  return { kind: 'unknown', stableParser: false }
}

function hashUrl(value: string): string {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash.toString(16)
}

/** Deterministic grey-web catalogue stub — no page fetch (Raqim Web / 1.5.0 prep). */
export function buildGreyWebPageItem(rawUrl: string): CslItem | null {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }
  if (!/^https?:$/i.test(url.protocol)) return null

  const profile = classifyWebpageHost(rawUrl)
  if (profile.kind === 'social') return null

  const pathLabel = url.pathname.replace(/\//g, ' ').replace(/\s+/g, ' ').trim()
  const kindLabel = profile.kind.replace(/_/g, ' ')
  const title = pathLabel
    ? `${kindLabel} — ${pathLabel.slice(0, 100)}`
    : `${kindLabel} — ${url.hostname}`

  return {
    id: `grey-web-${hashUrl(rawUrl)}`,
    type: 'webpage',
    title,
    URL: rawUrl,
    publisher: url.hostname,
    genre: profile.kind
  }
}
