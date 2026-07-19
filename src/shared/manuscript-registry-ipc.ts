import type { CslItem } from '../engine/types'
import type { MetadataAlignment, RegistryResolution, RegistrySource } from '../engine/manuscript/verify'

/** Valid registry sources accepted over IPC. */
const REGISTRY_SOURCES = new Set<RegistrySource>(['crossref', 'datacite', 'pubmed', 'openalex', 'none'])

export function sanitizeCslItem(raw: unknown): CslItem | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as CslItem
  if (typeof item.id !== 'string' || !item.id.trim()) return null
  return item
}

export function sanitizeRegistrySource(raw: unknown): RegistrySource | null {
  if (typeof raw !== 'string') return null
  return REGISTRY_SOURCES.has(raw as RegistrySource) ? (raw as RegistrySource) : null
}

export type ManuscriptResolveResult = RegistryResolution
export type ManuscriptAlignResult = MetadataAlignment
