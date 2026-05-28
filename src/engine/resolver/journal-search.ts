import { fetchWithPolicy, readJsonResponse } from '../network/http'

const CROSSREF_JOURNALS_API = 'https://api.crossref.org/journals'
const USER_AGENT = 'Nassila/1.0 (mailto:nassila-app@users.noreply.github.com)'

export interface JournalResult {
  title: string
  publisher: string
  issn: string[]
  subjects: string[]
  totalDois: number
}

export async function searchJournalsCrossRef(
  query: string,
  rows = 15
): Promise<JournalResult[]> {
  if (!query || query.length < 2) return []

  try {
    const response = await fetchWithPolicy(
      `${CROSSREF_JOURNALS_API}?query=${encodeURIComponent(query)}&rows=${rows}`,
      {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/json'
        }
      }
    )

    if (!response.ok) return []

    const data = await readJsonResponse<{
      message: {
        items: {
          title: string
          publisher: string
          ISSN?: string[]
          subjects?: { name: string }[]
          counts?: { 'total-dois'?: number }
        }[]
      }
    }>(response)

    return data.message.items.map((item) => ({
      title: item.title,
      publisher: item.publisher ?? '',
      issn: item.ISSN ?? [],
      subjects: (item.subjects ?? []).map((s) => s.name),
      totalDois: item.counts?.['total-dois'] ?? 0
    }))
  } catch {
    return []
  }
}
