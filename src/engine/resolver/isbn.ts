import type { CslItem, CslName } from '../types'
import { fetchWithPolicy, readJsonResponse } from '../network/http'

const OPEN_LIBRARY_API = 'https://openlibrary.org/api/books'

interface OpenLibraryBook {
  title: string
  authors?: { name: string }[]
  publishers?: { name: string }[]
  publish_date?: string
  number_of_pages?: number
  publish_places?: { name: string }[]
  subjects?: { name: string }[]
  isbn_13?: string[]
  isbn_10?: string[]
}

export async function resolveIsbn(isbn: string): Promise<CslItem | null> {
  try {
    const url = `${OPEN_LIBRARY_API}?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
    const response = await fetchWithPolicy(url)
    if (!response.ok) return null

    const data = await readJsonResponse<Record<string, OpenLibraryBook>>(response)
    const key = `ISBN:${isbn}`
    const book = data[key]
    if (!book) return null

    const authors: CslName[] = (book.authors ?? []).map((a) => {
      const parts = a.name.split(' ')
      const family = parts.pop() ?? ''
      const given = parts.join(' ')
      return { family, given }
    })

    const yearMatch = book.publish_date?.match(/(\d{4})/)
    const year = yearMatch ? parseInt(yearMatch[1], 10) : undefined

    const item: CslItem = {
      id: `isbn-${isbn}`,
      type: 'book',
      title: book.title,
      author: authors,
      publisher: book.publishers?.[0]?.name,
      'publisher-place': book.publish_places?.[0]?.name,
      'number-of-pages': book.number_of_pages?.toString(),
      ISBN: isbn,
      issued: year ? { 'date-parts': [[year]] } : undefined,
      _sourceFormat: 'isbn',
      _parseConfidence: 1.0
    }

    return item
  } catch {
    return null
  }
}
