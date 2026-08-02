import type { CslItem } from '../types'

/** Deterministic grey-web host classification (Raqim Web / 1.5.0). */

export type WebpageHostKind =
  | 'scholarly_journal'
  | 'preprint'
  | 'government'
  | 'organization'
  | 'news'
  | 'blog'
  | 'video'
  | 'social'
  | 'repository'
  | 'dataset'
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
  { pattern: /(?:^|\.)kaggle\.com$/i, profile: { kind: 'dataset', platform: 'kaggle', stableParser: true } },
  { pattern: /(?:^|\.)huggingface\.co$/i, profile: { kind: 'repository', platform: 'huggingface', stableParser: true } },
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

/** Extract host-specific structured title & metadata signals (GitHub owner/repo, Kaggle dataset name, etc.) */
export function parseHostSpecificTitle(url: URL, profile: WebpageHostProfile): { title: string; publisher: string } | null {
  const host = url.hostname.toLowerCase()
  const pathSegments = url.pathname.split('/').filter(Boolean)

  if (profile.platform === 'github' && pathSegments.length >= 2) {
    const [owner, repo] = pathSegments
    return {
      title: `${owner}/${repo}`,
      publisher: 'GitHub'
    }
  }

  if (profile.platform === 'kaggle' && pathSegments.length >= 2) {
    const datasetName = pathSegments[pathSegments.length - 1].replace(/-/g, ' ')
    return {
      title: `Dataset: ${datasetName}`,
      publisher: 'Kaggle'
    }
  }

  if (profile.platform === 'huggingface' && pathSegments.length >= 2) {
    const [owner, repo] = pathSegments
    return {
      title: `${owner}/${repo}`,
      publisher: 'Hugging Face'
    }
  }

  if (profile.platform === 'substack') {
    const blogName = host.split('.')[0]
    const articleSlug = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1].replace(/-/g, ' ') : ''
    return {
      title: articleSlug ? `${articleSlug}` : `${blogName} on Substack`,
      publisher: `${blogName}.substack.com`
    }
  }

  return null
}

/** Deterministic grey-web catalogue stub — no page fetch (Raqim Web / 1.5.0). */
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

  const hostSpecific = parseHostSpecificTitle(url, profile)
  if (hostSpecific) {
    return {
      id: `grey-web-${hashUrl(rawUrl)}`,
      type: profile.kind === 'dataset' ? 'dataset' : 'webpage',
      title: hostSpecific.title,
      URL: rawUrl,
      publisher: hostSpecific.publisher,
      genre: profile.kind
    }
  }

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
