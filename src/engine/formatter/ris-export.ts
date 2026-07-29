import type { CslItem } from '../types'

function mapCslTypeToRisType(type?: string): string {
  switch (type) {
    case 'article-journal':
    case 'article':
      return 'JOUR'
    case 'article-magazine':
      return 'MGZN'
    case 'article-newspaper':
      return 'NEWS'
    case 'book':
      return 'BOOK'
    case 'chapter':
      return 'CHAP'
    case 'paper-conference':
      return 'CPAPER'
    case 'thesis':
      return 'THES'
    case 'report':
      return 'RPRT'
    case 'dataset':
      return 'DATA'
    case 'software':
      return 'COMP'
    case 'webpage':
    case 'post-weblog':
      return 'ELEC'
    case 'legislation':
    case 'bill':
      return 'STAT'
    case 'legal_case':
      return 'CASE'
    case 'patent':
      return 'PAT'
    default:
      return 'GEN'
  }
}

function cleanString(val: string | undefined): string | undefined {
  if (!val) return undefined
  const s = val.trim()
  return s.length > 0 ? s : undefined
}

export function formatRis(items: CslItem[]): string {
  const records: string[] = []

  for (const item of items) {
    const lines: string[] = []
    const risType = mapCslTypeToRisType(item.type)
    lines.push(`TY  - ${risType}`)

    // Title
    const title = cleanString(item.title)
    if (title) {
      lines.push(`TI  - ${title}`)
      lines.push(`T1  - ${title}`)
    }

    // Authors
    if (Array.isArray(item.author)) {
      for (const author of item.author) {
        if (author.literal?.trim()) {
          lines.push(`AU  - ${author.literal.trim()}`)
        } else if (author.family?.trim()) {
          const given = author.given?.trim()
          lines.push(`AU  - ${author.family.trim()}${given ? `, ${given}` : ''}`)
        }
      }
    }

    // Editors
    if (Array.isArray(item.editor)) {
      for (const editor of item.editor) {
        if (editor.literal?.trim()) {
          lines.push(`ED  - ${editor.literal.trim()}`)
        } else if (editor.family?.trim()) {
          const given = editor.given?.trim()
          lines.push(`ED  - ${editor.family.trim()}${given ? `, ${given}` : ''}`)
        }
      }
    }

    // Container title (Journal / Book title)
    const containerTitle = cleanString(item['container-title'])
    if (containerTitle) {
      lines.push(`JO  - ${containerTitle}`)
      lines.push(`JF  - ${containerTitle}`)
      lines.push(`T2  - ${containerTitle}`)
    }

    // Year / Issued Date
    const year = item.issued?.['date-parts']?.[0]?.[0]
    if (year != null) {
      const month = item.issued?.['date-parts']?.[0]?.[1]
      const day = item.issued?.['date-parts']?.[0]?.[2]
      if (month != null && day != null) {
        const mStr = String(month).padStart(2, '0')
        const dStr = String(day).padStart(2, '0')
        lines.push(`PY  - ${year}/${mStr}/${dStr}/`)
        lines.push(`Y1  - ${year}/${mStr}/${dStr}/`)
      } else {
        lines.push(`PY  - ${year}`)
        lines.push(`Y1  - ${year}`)
      }
    } else if (item.issued?.raw?.trim()) {
      lines.push(`PY  - ${item.issued.raw.trim()}`)
    }

    // Volume & Issue
    const volume = cleanString(item.volume)
    if (volume) lines.push(`VL  - ${volume}`)

    const issue = cleanString(item.issue)
    if (issue) lines.push(`IS  - ${issue}`)

    // Pages
    const page = cleanString(item.page)
    if (page) {
      const parts = page.split(/[-–—]/).map((p) => p.trim())
      if (parts.length >= 2 && parts[0] && parts[1]) {
        lines.push(`SP  - ${parts[0]}`)
        lines.push(`EP  - ${parts[1]}`)
      } else if (parts[0]) {
        lines.push(`SP  - ${parts[0]}`)
      }
    }

    // Publisher & Place
    const publisher = cleanString(item.publisher)
    if (publisher) lines.push(`PB  - ${publisher}`)

    const place = cleanString(item['publisher-place'])
    if (place) lines.push(`CY  - ${place}`)

    // DOI
    const doi = cleanString(item.DOI)
    if (doi) {
      const cleanedDoi = doi
        .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
        .replace(/^doi:\s*/i, '')
        .trim()
      lines.push(`DO  - ${cleanedDoi}`)
    }

    // URL
    const url = cleanString(item.URL)
    if (url) lines.push(`UR  - ${url}`)

    // Abstract
    const abstract = cleanString(item.abstract)
    if (abstract) lines.push(`AB  - ${abstract}`)

    // ISSN / ISBN
    const issn = cleanString(item.ISSN)
    if (issn) lines.push(`SN  - ${issn}`)
    const isbn = cleanString(item.ISBN)
    if (isbn && !issn) lines.push(`SN  - ${isbn}`)

    // Language
    const language = cleanString(item.language)
    if (language) lines.push(`LA  - ${language}`)

    // End of Record
    lines.push('ER  - ')
    records.push(lines.join('\n'))
  }

  return records.join('\n\n') + '\n'
}
