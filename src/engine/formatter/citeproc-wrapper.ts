import CSL from 'citeproc'
import type { CslItem } from '../types'

export interface CiteprocEngine {
  updateItems: (ids: string[]) => void
  makeBibliography: () => [BibParams, string[]]
  previewCitationCluster: (
    citation: CiteprocCitation,
    citationsPre: [string, number][],
    citationsPost: [string, number][],
    format: string
  ) => string
}

interface BibParams {
  bibstart: string
  bibend: string
  entry_ids?: string[][]
  [key: string]: unknown
}

interface CiteprocCitation {
  citationItems: { id: string }[]
  properties: { noteIndex: number }
}

export function createCiteprocEngine(
  items: CslItem[],
  styleXml: string,
  localeXml: string
): CiteprocEngine {
  const itemMap = new Map<string, CslItem>()
  for (const item of items) {
    itemMap.set(item.id, item)
  }

  const sys = {
    retrieveLocale: () => localeXml,
    retrieveItem: (id: string) => {
      const item = itemMap.get(id)
      if (!item) throw new Error(`Item not found: ${id}`)
      return item
    }
  }

  return new CSL.Engine(sys, styleXml)
}

export function getDefaultLocale(): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<locale xmlns="http://purl.org/net/xbiblio/csl" version="1.0" xml:lang="en-US">
  <info>
    <rights license="http://creativecommons.org/licenses/by-sa/3.0/">This work is licensed under a Creative Commons Attribution-ShareAlike 3.0 License</rights>
    <updated>2012-07-04T23:31:02+00:00</updated>
  </info>
  <style-options punctuation-in-quote="true"/>
  <date form="text">
    <date-part name="month" suffix=" "/>
    <date-part name="day" suffix=", "/>
    <date-part name="year"/>
  </date>
  <date form="numeric">
    <date-part name="month" form="numeric-leading-zeros" suffix="/"/>
    <date-part name="day" form="numeric-leading-zeros" suffix="/"/>
    <date-part name="year"/>
  </date>
  <terms>
    <term name="accessed">accessed</term>
    <term name="and">and</term>
    <term name="and others">and others</term>
    <term name="anonymous">anonymous</term>
    <term name="anonymous" form="short">anon.</term>
    <term name="at">at</term>
    <term name="available at">available at</term>
    <term name="by">by</term>
    <term name="circa">circa</term>
    <term name="circa" form="short">c.</term>
    <term name="cited">cited</term>
    <term name="edition">
      <single>edition</single>
      <multiple>editions</multiple>
    </term>
    <term name="edition" form="short">ed.</term>
    <term name="et-al">et al.</term>
    <term name="forthcoming">forthcoming</term>
    <term name="from">from</term>
    <term name="ibid">ibid.</term>
    <term name="in">in</term>
    <term name="in press">in press</term>
    <term name="internet">internet</term>
    <term name="interview">interview</term>
    <term name="letter">letter</term>
    <term name="no date">no date</term>
    <term name="no date" form="short">n.d.</term>
    <term name="online">online</term>
    <term name="presented at">presented at the</term>
    <term name="reference">
      <single>reference</single>
      <multiple>references</multiple>
    </term>
    <term name="reference" form="short">
      <single>ref.</single>
      <multiple>refs.</multiple>
    </term>
    <term name="retrieved">retrieved</term>
    <term name="scale">scale</term>
    <term name="version">version</term>
    <term name="page" form="short">
      <single>p.</single>
      <multiple>pp.</multiple>
    </term>
    <term name="volume" form="short">
      <single>vol.</single>
      <multiple>vols.</multiple>
    </term>
    <term name="issue" form="short">no.</term>
    <term name="chapter-number" form="short">chap.</term>
  </terms>
</locale>`
}
