import type { CslItem } from '../types'
import type { ImportResult } from './index'
import {
  fetchWithPolicy,
  readJsonResponse,
  validateExternalUrl
} from '../network/http'

const ZOTERO_WEB_API = 'https://api.zotero.org'

/**
 * Import from Zotero. Supports:
 * 1. Zotero Web API (if user provides an API key)
 * 2. Local exported files (.json CSL, .bib, .ris)
 *
 * Direct SQLite access is complex and requires the Zotero app to not be running,
 * so we primarily support the Web API and file-based import.
 */
export async function importFromZotero(pathOrApiKey?: string): Promise<ImportResult> {
  const errors: string[] = []
  const items: CslItem[] = []

  if (!pathOrApiKey) {
    return {
      items: [],
      errors: ['Zotero import requires a file path or Web API key'],
      source: 'zotero'
    }
  }

  // If it looks like an API key, use the Web API
  if (/^[a-zA-Z0-9]{24}$/.test(pathOrApiKey.trim())) {
    return importFromZoteroApi(pathOrApiKey.trim())
  }

  // Otherwise treat it as a file path
  try {
    const content = await window.api?.readFile(pathOrApiKey)
    if (!content) {
      return { items: [], errors: ['Could not read file'], source: 'zotero' }
    }

    // Try to parse as CSL-JSON (Zotero's native export format)
    try {
      const parsed = JSON.parse(content)
      const arr = Array.isArray(parsed) ? parsed : [parsed]
      for (const item of arr) {
        items.push({
          ...item,
          id: item.id ?? `zotero-${items.length}`,
          _sourceFormat: 'zotero',
          _parseConfidence: 1.0
        })
      }
    } catch {
      errors.push('File is not valid CSL-JSON. Try exporting from Zotero as CSL JSON.')
    }
  } catch (e) {
    errors.push(`Failed to read file: ${(e as Error).message}`)
  }

  return { items, errors, source: 'zotero' }
}

async function importFromZoteroApi(apiKey: string): Promise<ImportResult> {
  try {
    validateExternalUrl(ZOTERO_WEB_API)

    // Get the user's key info to find their userId
    const keyResponse = await fetchWithPolicy(`${ZOTERO_WEB_API}/keys/${apiKey}`, {
      headers: { 'Zotero-API-Version': '3' }
    })

    if (!keyResponse.ok) {
      return { items: [], errors: ['Invalid Zotero API key'], source: 'zotero' }
    }

    const keyData = await readJsonResponse<{ userID: number }>(keyResponse)
    const userId = keyData.userID

    // Fetch items (first 100)
    const itemsResponse = await fetchWithPolicy(
      `${ZOTERO_WEB_API}/users/${userId}/items?format=csljson&limit=100`,
      {
        headers: {
          'Zotero-API-Version': '3',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    )

    if (!itemsResponse.ok) {
      return { items: [], errors: ['Failed to fetch Zotero items'], source: 'zotero' }
    }

    const data = await readJsonResponse<{ items: CslItem[] }>(itemsResponse)
    const items: CslItem[] = (data.items ?? []).map((item, i) => ({
      ...item,
      id: item.id ?? `zotero-api-${i}`,
      _sourceFormat: 'zotero' as const,
      _parseConfidence: 1.0
    }))

    return { items, errors: [], source: 'zotero' }
  } catch (e) {
    return { items: [], errors: [`Zotero API error: ${(e as Error).message}`], source: 'zotero' }
  }
}
