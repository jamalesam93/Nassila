import type { CslItem } from '../types'

export type LegislationCatalogueProvider = 'eli' | 'us_federal' | 'uk_legislation' | 'official_catalogue'

export interface LegislationCatalogueIdentity {
  provider: LegislationCatalogueProvider
  title: string
  number?: string
  authority?: string
  canonicalUrl: string
  issuedYear?: number
}

const US_FEDERAL_HOSTS = [
  'congress.gov',
  'govinfo.gov',
  'uscode.house.gov',
  'www.govinfo.gov',
  'www.congress.gov'
]

const UK_LEGISLATION_HOST = 'legislation.gov.uk'

const OFFICIAL_CATALOGUE_SUFFIXES = ['.gov', '.gov.uk', '.parliament.uk', '.europa.eu']

export function isLegislationCatalogueHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (US_FEDERAL_HOSTS.includes(host)) return true
  if (host === UK_LEGISLATION_HOST || host.endsWith(`.${UK_LEGISLATION_HOST}`)) return true
  if (host.endsWith('europa.eu')) return true
  return OFFICIAL_CATALOGUE_SUFFIXES.some((suffix) => host.endsWith(suffix))
}

export function legislationItemFromIdentity(identity: LegislationCatalogueIdentity): CslItem {
  const year = identity.issuedYear
  return {
    id: `${identity.provider}-${hashId(identity.canonicalUrl)}`,
    type: 'legislation',
    title: identity.title,
    number: identity.number,
    authority: identity.authority,
    publisher: identity.authority,
    URL: identity.canonicalUrl,
    issued: year ? { 'date-parts': [[year]] } : undefined
  }
}

export function parseLegislationCatalogueUrl(rawUrl: string): LegislationCatalogueIdentity | null {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }

  const host = url.hostname.toLowerCase()
  if (host.endsWith('europa.eu')) {
    return parseEliFromUrl(url)
  }
  if (US_FEDERAL_HOSTS.includes(host)) {
    return parseUsFederalUrl(url)
  }
  if (host === UK_LEGISLATION_HOST || host.endsWith(`.${UK_LEGISLATION_HOST}`)) {
    return parseUkLegislationUrl(url)
  }
  if (OFFICIAL_CATALOGUE_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    return parseGenericOfficialCatalogueUrl(url)
  }
  return null
}

export function parseUsPublicLawTitle(query: string): LegislationCatalogueIdentity | null {
  const pl = query.match(/\bpublic\s+law\s+(\d{3})-(\d+)\b/i)
  if (pl) {
    const congress = pl[1]
    const law = pl[2]
    return {
      provider: 'us_federal',
      title: `Public Law ${congress}-${law}`,
      number: `${congress}-${law}`,
      authority: 'United States Congress',
      canonicalUrl: `https://www.congress.gov/public-law/${congress}th-congress/${law}`,
      issuedYear: undefined
    }
  }

  const usc = query.match(/\b(\d+)\s+U\.?S\.?C\.?\s*§?\s*(\d+[a-z]?)/i)
  if (usc) {
    const title = usc[1]
    const section = usc[2]
    return {
      provider: 'us_federal',
      title: `${title} U.S.C. § ${section}`,
      number: `${title} USC ${section}`,
      authority: 'United States Code',
      canonicalUrl: `https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title${title}-section${section}`,
      issuedYear: undefined
    }
  }

  return null
}

export function parseUkStatuteTitle(query: string): LegislationCatalogueIdentity | null {
  const act = query.match(/\b(?:UK|U\.?K\.?)\s+(?:Act|Statute)\s+(\d{4})\s*(?:c\.?|chapter)?\s*(\d+)\b/i)
  if (!act) return null
  const year = act[1]
  const chapter = act[2]
  return {
    provider: 'uk_legislation',
    title: `UK Act ${year} c. ${chapter}`,
    number: `${year} c. ${chapter}`,
    authority: 'UK Parliament',
    canonicalUrl: `https://www.legislation.gov.uk/ukpga/${year}/${chapter}`,
    issuedYear: parseInt(year, 10)
  }
}

/** Merge statute numbers split across plain-text lines (e.g. `2024` + `/1689`). */
export function mergeSplitStatuteNumberLines(lines: string[]): string[] {
  if (lines.length < 2) return lines
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const current = lines[i]
    const next = lines[i + 1]
    if (
      next &&
      /\b(?:regulation|act|statute|directive|decision|law)\b/i.test(current) &&
      /\b(?:\(?EU\)?|\(?UK\)?|\(?US\)?)?\s*\d{4}\s*$/i.test(current) &&
      /^\s*\/\s*\d+\b/.test(next)
    ) {
      out.push(`${current.replace(/\s+$/, '')}${next.trimStart()}`)
      i += 2
      continue
    }
    out.push(current)
    i += 1
  }
  return out
}

function parseEliFromUrl(url: URL): LegislationCatalogueIdentity | null {
  const match = url.pathname.match(/\/eli\/(reg|dir|dec)\/(\d{4})\/(\d+)/i)
  if (!match) return null
  const actType = match[1].toLowerCase()
  const year = match[2]
  const number = match[3]
  const label = actType === 'reg' ? 'Regulation' : actType === 'dir' ? 'Directive' : 'Decision'
  return {
    provider: 'eli',
    title: `${label} (EU) ${year}/${number}`,
    number: `${year}/${number}`,
    authority: 'European Union',
    canonicalUrl: `https://eur-lex.europa.eu/eli/${actType}/${year}/${number}/oj`,
    issuedYear: parseInt(year, 10)
  }
}

function parseUsFederalUrl(url: URL): LegislationCatalogueIdentity | null {
  const host = url.hostname.toLowerCase()
  const path = url.pathname

  const publicLaw = path.match(/\/public-law\/(\d+)(?:th|st|nd|rd)?-congress\/(\d+)/i)
  if (publicLaw) {
    const congress = publicLaw[1]
    const law = publicLaw[2]
    return {
      provider: 'us_federal',
      title: `Public Law ${congress}-${law}`,
      number: `${congress}-${law}`,
      authority: 'United States Congress',
      canonicalUrl: url.toString(),
      issuedYear: undefined
    }
  }

  const plawPkg = path.match(/\/content\/pkg\/PLAW-(\d+)publ(\d+)/i)
  if (plawPkg) {
    const congress = plawPkg[1]
    const law = plawPkg[2]
    return {
      provider: 'us_federal',
      title: `Public Law ${congress}-${law}`,
      number: `${congress}-${law}`,
      authority: 'United States Congress',
      canonicalUrl: url.toString(),
      issuedYear: undefined
    }
  }

  const bill = path.match(/\/bill\/(\d+)(?:th|st|nd|rd)?-congress\/(house|senate)-bill\/(\d+)/i)
  if (bill) {
    const congress = bill[1]
    const chamber = bill[2]
    const billNo = bill[3]
    return {
      provider: 'us_federal',
      title: `${chamber === 'house' ? 'H.R.' : 'S.'} ${billNo} (${congress}th Congress)`,
      number: `${congress}-${chamber}-${billNo}`,
      authority: 'United States Congress',
      canonicalUrl: url.toString(),
      issuedYear: undefined
    }
  }

  const granule = url.searchParams.get('req')?.match(/USC-prelim-title(\d+)-section(\d+[a-z]?)/i)
  if (granule && host.includes('uscode.house.gov')) {
    const title = granule[1]
    const section = granule[2]
    return {
      provider: 'us_federal',
      title: `${title} U.S.C. § ${section}`,
      number: `${title} USC ${section}`,
      authority: 'United States Code',
      canonicalUrl: url.toString(),
      issuedYear: undefined
    }
  }

  if (host.includes('govinfo.gov') || host.includes('congress.gov')) {
    return {
      provider: 'official_catalogue',
      title: `US federal document (${host})`,
      authority: 'United States Government',
      canonicalUrl: url.toString(),
      issuedYear: undefined
    }
  }

  return null
}

function parseUkLegislationUrl(url: URL): LegislationCatalogueIdentity | null {
  const match = url.pathname.match(
    /\/(ukpga|uksi|ukla|asp|anaw|mwa|nia|aosp|aep|aip|apni|mnia|nisi)\/(\d{4})\/(\d+)/i
  )
  if (!match) return null
  const kind = match[1].toLowerCase()
  const year = match[2]
  const number = match[3]
  const kindLabel =
    kind === 'ukpga' ? 'Act' : kind === 'uksi' ? 'Statutory Instrument' : 'Legislation'
  return {
    provider: 'uk_legislation',
    title: `UK ${kindLabel} ${year} No. ${number}`,
    number: `${year} No. ${number}`,
    authority: 'UK Parliament',
    canonicalUrl: url.toString(),
    issuedYear: parseInt(year, 10)
  }
}

function parseGenericOfficialCatalogueUrl(url: URL): LegislationCatalogueIdentity | null {
  const host = url.hostname.toLowerCase()
  const pathLabel = url.pathname.replace(/\//g, ' ').replace(/\s+/g, ' ').trim()
  return {
    provider: 'official_catalogue',
    title: pathLabel ? `Official document — ${pathLabel.slice(0, 120)}` : `Official document (${host})`,
    authority: host,
    canonicalUrl: url.toString(),
    issuedYear: undefined
  }
}

function hashId(value: string): string {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash.toString(16)
}
