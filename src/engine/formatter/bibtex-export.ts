import type { CslItem } from '../types'

function mapCslTypeToBibtexType(type?: string): string {
  switch (type) {
    case 'article-journal':
    case 'article':
    case 'article-magazine':
    case 'article-newspaper':
      return 'article'
    case 'book':
      return 'book'
    case 'chapter':
      return 'incollection'
    case 'paper-conference':
      return 'inproceedings'
    case 'thesis':
      return 'phdthesis'
    case 'report':
      return 'techreport'
    case 'dataset':
    case 'software':
      return 'misc'
    default:
      return 'misc'
  }
}

function sanitizeCiteKey(item: CslItem, index: number): string {
  if (item.id && /^[a-zA-Z0-9_-]+$/.test(item.id)) return item.id
  const author = item.author?.[0]?.family ?? item.author?.[0]?.literal ?? 'ref'
  const year = item.issued?.['date-parts']?.[0]?.[0] ?? ''
  const cleanAuthor = author.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
  return `${cleanAuthor}${year}_${index + 1}`
}

function escapeBibtexValue(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/([&%#$_])/g, '\\$1')
    .replace(/[{}]/g, '')
}

export function formatBibtex(items: CslItem[]): string {
  const entries: string[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const bibType = mapCslTypeToBibtexType(item.type)
    const citeKey = sanitizeCiteKey(item, i)
    const fields: string[] = []

    // Title
    if (item.title?.trim()) {
      fields.push(`  title = {${escapeBibtexValue(item.title.trim())}}`)
    }

    // Author
    if (Array.isArray(item.author) && item.author.length > 0) {
      const authors = item.author
        .map((a) => {
          if (a.literal?.trim()) return escapeBibtexValue(a.literal.trim())
          if (a.family?.trim()) {
            const given = a.given?.trim()
            return `${escapeBibtexValue(a.family.trim())}${given ? ', ' + escapeBibtexValue(given) : ''}`
          }
          return ''
        })
        .filter(Boolean)
        .join(' and ')
      if (authors) {
        fields.push(`  author = {${authors}}`)
      }
    }

    // Journal / Booktitle
    if (item['container-title']?.trim()) {
      const container = escapeBibtexValue(item['container-title'].trim())
      if (bibType === 'incollection' || bibType === 'inproceedings') {
        fields.push(`  booktitle = {${container}}`)
      } else {
        fields.push(`  journal = {${container}}`)
      }
    }

    // Year
    const year = item.issued?.['date-parts']?.[0]?.[0]
    if (year != null) {
      fields.push(`  year = {${year}}`)
    } else if (item.issued?.raw?.trim()) {
      fields.push(`  year = {${escapeBibtexValue(item.issued.raw.trim())}}`)
    }

    // Volume & Number (Issue)
    if (item.volume?.trim()) fields.push(`  volume = {${escapeBibtexValue(item.volume.trim())}}`)
    if (item.issue?.trim()) fields.push(`  number = {${escapeBibtexValue(item.issue.trim())}}`)

    // Pages
    if (item.page?.trim()) fields.push(`  pages = {${escapeBibtexValue(item.page.trim().replace(/--/g, '-').replace(/-/g, '--'))}}`)

    // Publisher & Address
    if (item.publisher?.trim()) fields.push(`  publisher = {${escapeBibtexValue(item.publisher.trim())}}`)
    if (item['publisher-place']?.trim()) fields.push(`  address = {${escapeBibtexValue(item['publisher-place'].trim())}}`)

    // DOI
    if (item.DOI?.trim()) {
      const cleanedDoi = item.DOI.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '').trim()
      fields.push(`  doi = {${escapeBibtexValue(cleanedDoi)}}`)
    }

    // URL
    if (item.URL?.trim()) fields.push(`  url = {${escapeBibtexValue(item.URL.trim())}}`)

    entries.push(`@${bibType}{${citeKey},\n${fields.join(',\n')}\n}`)
  }

  return entries.join('\n\n') + '\n'
}
