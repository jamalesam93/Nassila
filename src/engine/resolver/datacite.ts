import type { CslItem, CslItemType, CslName } from '../types'
import { fetchWithPolicy, readJsonResponse } from '../network/http'

const DATACITE_API = 'https://api.datacite.org/dois'

interface DataCiteAttributes {
  doi: string
  titles?: { title: string }[]
  creators?: { name?: string; givenName?: string; familyName?: string; nameType?: string }[]
  publisher?: { name?: string } | string
  publicationYear?: number
  types?: { resourceTypeGeneral?: string; resourceType?: string }
  descriptions?: { description: string }[]
  url?: string
  version?: string
  dates?: { date: string; dateType: string }[]
  container?: { title?: string; type?: string; volume?: string; issue?: string; firstPage?: string; lastPage?: string }
  relatedIdentifiers?: { relatedIdentifier: string; relatedIdentifierType: string; relationType: string }[]
  subjects?: { subject: string }[]
  rightsList?: { rights: string }[]
}

function mapDataCiteType(resourceTypeGeneral?: string): CslItemType {
  const typeMap: Record<string, CslItemType> = {
    'Dataset': 'dataset',
    'Software': 'software',
    'Text': 'report',
    'Report': 'report',
    'Dissertation': 'thesis',
    'Book': 'book',
    'BookChapter': 'chapter',
    'ConferencePaper': 'paper-conference',
    'ConferenceProceeding': 'paper-conference',
    'JournalArticle': 'article-journal',
    'Preprint': 'article',
    'Standard': 'standard',
    'Collection': 'collection',
    'Image': 'graphic',
    'Audiovisual': 'motion_picture',
    'Sound': 'song',
    'InteractiveResource': 'software',
    'Model': 'dataset',
    'Workflow': 'software',
    'OutputManagementPlan': 'report',
    'PeerReview': 'review',
    'Other': 'document',
    'ComputationalNotebook': 'software'
  }
  return typeMap[resourceTypeGeneral ?? ''] ?? 'document'
}

function mapCreators(creators?: DataCiteAttributes['creators']): CslName[] {
  if (!creators) return []
  return creators.map((c) => {
    if (c.nameType === 'Organizational' || (!c.familyName && c.name)) {
      return { literal: c.name ?? '' }
    }
    return { family: c.familyName ?? '', given: c.givenName ?? '' }
  })
}

export function isDataCiteDoi(doi: string): boolean {
  const prefixes = [
    '10.5281/', '10.5282/', '10.48550/', '10.6084/', '10.5066/', '10.5061/',
    '10.17632/', '10.7910/', '10.5281/zenodo', '10.5072/', '10.15468/',
    '10.14454/', '10.22002/', '10.4121/', '10.25384/', '10.17605/',
    '10.24433/', '10.25430/', '10.5255/', '10.23728/', '10.25495/'
  ]
  return prefixes.some((p) => doi.startsWith(p))
}

export async function resolveDataCiteDoi(doi: string): Promise<CslItem | null> {
  try {
    const response = await fetchWithPolicy(`${DATACITE_API}/${encodeURIComponent(doi)}`, {
      headers: { 'Accept': 'application/json' }
    })

    if (!response.ok) return null

    const data = await readJsonResponse<{ data: { attributes: DataCiteAttributes } }>(response)
    const attr = data.data.attributes

    const publisherName = typeof attr.publisher === 'string' ? attr.publisher : attr.publisher?.name

    const item: CslItem = {
      id: `datacite-${doi.replace(/[^a-zA-Z0-9]/g, '-')}`,
      type: mapDataCiteType(attr.types?.resourceTypeGeneral),
      title: attr.titles?.[0]?.title,
      author: mapCreators(attr.creators),
      DOI: attr.doi,
      URL: attr.url,
      publisher: publisherName,
      version: attr.version,
      abstract: attr.descriptions?.[0]?.description,
      issued: attr.publicationYear ? { 'date-parts': [[attr.publicationYear]] } : undefined,
      _sourceFormat: 'doi',
      _parseConfidence: 1.0
    }

    if (attr.container) {
      if (attr.container.title) item['container-title'] = attr.container.title
      if (attr.container.volume) item.volume = attr.container.volume
      if (attr.container.issue) item.issue = attr.container.issue
      if (attr.container.firstPage) {
        item.page = attr.container.lastPage
          ? `${attr.container.firstPage}-${attr.container.lastPage}`
          : attr.container.firstPage
      }
    }

    if (attr.types?.resourceType) {
      item.genre = attr.types.resourceType
    }

    return item
  } catch {
    return null
  }
}

export async function searchDataCite(
  query: string,
  resourceType?: string,
  rows = 5
): Promise<CslItem[]> {
  try {
    let url = `${DATACITE_API}?query=${encodeURIComponent(query)}&page[size]=${rows}`
    if (resourceType) {
      url += `&resource-type-id=${encodeURIComponent(resourceType)}`
    }

    const response = await fetchWithPolicy(url, {
      headers: { 'Accept': 'application/json' }
    })

    if (!response.ok) return []

    const data = await readJsonResponse<{ data: { attributes: DataCiteAttributes }[] }>(response)
    const results: CslItem[] = []

    for (const entry of data.data) {
      const attr = entry.attributes
      const publisherName = typeof attr.publisher === 'string' ? attr.publisher : attr.publisher?.name

      results.push({
        id: `datacite-${attr.doi.replace(/[^a-zA-Z0-9]/g, '-')}`,
        type: mapDataCiteType(attr.types?.resourceTypeGeneral),
        title: attr.titles?.[0]?.title,
        author: mapCreators(attr.creators),
        DOI: attr.doi,
        URL: attr.url,
        publisher: publisherName,
        version: attr.version,
        issued: attr.publicationYear ? { 'date-parts': [[attr.publicationYear]] } : undefined,
        genre: attr.types?.resourceType,
        _sourceFormat: 'doi',
        _parseConfidence: 1.0
      })
    }

    return results
  } catch {
    return []
  }
}
