// Bundled CSL style definitions for common citation styles.
// Full styles are loaded from the CSL repository; these are minimal working versions.

export const BUNDLED_STYLES: Record<string, string> = {
  'apa-7th': `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" class="in-text" version="1.0" demote-non-dropping-particle="never">
  <info><title>APA 7th Edition</title><id>apa-7th</id></info>
  <macro name="author"><names variable="author"><name and="symbol" delimiter=", " delimiter-precedes-last="contextual" initialize-with=". " name-as-sort-order="first"/><et-al font-style="italic"/><substitute><names variable="editor"/><text variable="title"/></substitute></names></macro>
  <macro name="year"><group prefix="(" suffix=")"><date variable="issued"><date-part name="year"/></date></group></macro>
  <macro name="title"><choose><if type="article-journal chapter paper-conference" match="any"><text variable="title"/></if><else><text variable="title" font-style="italic"/></else></choose></macro>
  <macro name="container"><text variable="container-title" font-style="italic"/></macro>
  <macro name="locators"><group><text variable="volume" font-style="italic"/><text variable="issue" prefix="(" suffix=")"/></group></macro>
  <citation et-al-min="3" et-al-use-first="1" disambiguate-add-year-suffix="true"><sort><key macro="author"/><key macro="year"/></sort><layout prefix="(" suffix=")" delimiter="; "><group delimiter=", "><text macro="author"/><text macro="year"/></group></layout></citation>
  <bibliography hanging-indent="true" et-al-min="21" et-al-use-first="19" entry-spacing="0" line-spacing="2">
    <sort><key macro="author"/><key macro="year"/></sort>
    <layout suffix=".">
      <group delimiter=" ">
        <text macro="author" suffix="."/>
        <text macro="year"/>
        <text macro="title" suffix="."/>
        <text macro="container" suffix=","/>
        <text macro="locators" suffix=","/>
        <text variable="page"/>
      </group>
    </layout>
  </bibliography>
</style>`,

  'ieee': `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" class="in-text" version="1.0">
  <info><title>IEEE</title><id>ieee</id></info>
  <macro name="author"><names variable="author"><name initialize-with=". " delimiter=", " and="text"/></names></macro>
  <macro name="title"><choose><if type="article-journal" match="any"><text variable="title" quotes="true"/></if><else><text variable="title" font-style="italic"/></else></choose></macro>
  <macro name="container"><text variable="container-title" font-style="italic" form="short"/></macro>
  <macro name="locators"><group delimiter=", "><group><text term="volume" form="short" suffix=" "/><text variable="volume"/></group><group><text term="issue" form="short" suffix=" "/><text variable="issue"/></group><group><text term="page" form="short" suffix=" "/><text variable="page"/></group></group></macro>
  <macro name="date"><date variable="issued"><date-part name="month" form="short" suffix=" "/><date-part name="year"/></date></macro>
  <citation collapse="citation-number"><sort><key variable="citation-number"/></sort><layout prefix="[" suffix="]" delimiter="], ["><text variable="citation-number"/></layout></citation>
  <bibliography entry-spacing="0" second-field-align="flush">
    <sort><key variable="citation-number"/></sort>
    <layout suffix=".">
      <text variable="citation-number" prefix="[" suffix="]"/>
      <group delimiter=", ">
        <text macro="author"/>
        <text macro="title"/>
        <text macro="container"/>
        <text macro="locators"/>
        <text macro="date"/>
      </group>
    </layout>
  </bibliography>
</style>`,

  'vancouver': `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" class="in-text" version="1.0">
  <info><title>Vancouver</title><id>vancouver</id></info>
  <macro name="author"><names variable="author"><name sort-separator=" " initialize-with="" name-as-sort-order="all" delimiter=", " delimiter-precedes-last="always"/></names></macro>
  <macro name="title"><text variable="title"/></macro>
  <macro name="container"><text variable="container-title" form="short" strip-periods="true"/></macro>
  <macro name="date"><date variable="issued"><date-part name="year"/></date></macro>
  <citation collapse="citation-number"><sort><key variable="citation-number"/></sort><layout delimiter="," vertical-align="sup"><text variable="citation-number"/></layout></citation>
  <bibliography et-al-min="7" et-al-use-first="6" second-field-align="flush">
    <sort><key variable="citation-number"/></sort>
    <layout suffix=".">
      <text variable="citation-number" suffix=". "/>
      <group delimiter=". ">
        <text macro="author"/>
        <text macro="title"/>
        <group delimiter=". ">
          <text macro="container"/>
          <group delimiter=";">
            <text macro="date"/>
            <group><text variable="volume"/><text variable="issue" prefix="(" suffix=")"/></group>
          </group>
          <text variable="page" prefix=":"/>
        </group>
      </group>
    </layout>
  </bibliography>
</style>`,

  'chicago-author-date': `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" class="in-text" version="1.0">
  <info><title>Chicago Author-Date (17th ed.)</title><id>chicago-author-date</id></info>
  <macro name="author"><names variable="author"><name and="text" delimiter=", " delimiter-precedes-last="contextual" name-as-sort-order="first"/></names></macro>
  <macro name="year"><date variable="issued"><date-part name="year"/></date></macro>
  <macro name="title"><choose><if type="article-journal chapter" match="any"><text variable="title" quotes="true"/></if><else><text variable="title" font-style="italic"/></else></choose></macro>
  <macro name="container"><text variable="container-title" font-style="italic"/></macro>
  <citation et-al-min="4" et-al-use-first="1" disambiguate-add-year-suffix="true"><sort><key macro="author"/><key macro="year"/></sort><layout prefix="(" suffix=")" delimiter="; "><group delimiter=", "><text macro="author"/><text macro="year"/></group></layout></citation>
  <bibliography hanging-indent="true" et-al-min="11" et-al-use-first="7" entry-spacing="0">
    <sort><key macro="author"/><key macro="year"/></sort>
    <layout suffix=".">
      <group delimiter=". ">
        <text macro="author"/>
        <text macro="year"/>
        <text macro="title"/>
        <text macro="container"/>
      </group>
      <group prefix=" "><text variable="volume"/><text variable="issue" prefix=" (" suffix=")"/><text variable="page" prefix=": "/></group>
    </layout>
  </bibliography>
</style>`,

  'harvard': `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" class="in-text" version="1.0">
  <info><title>Harvard</title><id>harvard</id></info>
  <macro name="author"><names variable="author"><name and="text" delimiter=", " delimiter-precedes-last="never" initialize-with="." name-as-sort-order="first"/></names></macro>
  <macro name="year"><date variable="issued" prefix="(" suffix=")"><date-part name="year"/></date></macro>
  <macro name="title"><text variable="title" font-style="italic"/></macro>
  <citation et-al-min="4" et-al-use-first="1"><sort><key macro="author"/><key macro="year"/></sort><layout prefix="(" suffix=")" delimiter="; "><group delimiter=" "><text macro="author"/><text macro="year"/></group></layout></citation>
  <bibliography hanging-indent="true">
    <sort><key macro="author"/><key macro="year"/></sort>
    <layout suffix=".">
      <group delimiter=" "><text macro="author"/><text macro="year"/><text macro="title" suffix=","/><text variable="container-title" font-style="italic" suffix=","/><group><text variable="volume"/><text variable="issue" prefix="(" suffix=")"/></group><text variable="page" prefix="pp. "/></group>
    </layout>
  </bibliography>
</style>`,

  'mla-9th': `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" class="in-text" version="1.0">
  <info><title>MLA 9th Edition</title><id>mla-9th</id></info>
  <macro name="author"><names variable="author"><name name-as-sort-order="first" and="text" delimiter=", " delimiter-precedes-last="always"/></names></macro>
  <macro name="title"><choose><if type="article-journal chapter" match="any"><text variable="title" quotes="true"/></if><else><text variable="title" font-style="italic"/></else></choose></macro>
  <macro name="container"><text variable="container-title" font-style="italic"/></macro>
  <citation><layout prefix="(" suffix=")" delimiter="; "><group delimiter=" "><names variable="author"><name form="short" and="text" delimiter=", "/></names><text variable="page"/></group></layout></citation>
  <bibliography hanging-indent="true" entry-spacing="0" line-spacing="2">
    <sort><key macro="author"/></sort>
    <layout suffix=".">
      <group delimiter=". ">
        <text macro="author"/>
        <text macro="title"/>
        <text macro="container"/>
      </group>
      <group prefix=", "><text term="volume" form="short" suffix=" "/><text variable="volume"/><text variable="issue" prefix=", " form="short" suffix=" "/></group>
      <date variable="issued" prefix=", "><date-part name="year"/></date>
      <text variable="page" prefix=", pp. "/>
    </layout>
  </bibliography>
</style>`,

  'nature': `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" class="in-text" version="1.0">
  <info><title>Nature</title><id>nature</id></info>
  <macro name="author"><names variable="author"><name sort-separator=", " initialize-with=". " and="symbol" delimiter=", " delimiter-precedes-last="never"/></names></macro>
  <macro name="title"><text variable="title"/></macro>
  <macro name="container"><text variable="container-title" font-style="italic" form="short"/></macro>
  <macro name="date"><date variable="issued" prefix="(" suffix=")"><date-part name="year"/></date></macro>
  <citation collapse="citation-number"><sort><key variable="citation-number"/></sort><layout vertical-align="sup" delimiter=","><text variable="citation-number"/></layout></citation>
  <bibliography et-al-min="6" et-al-use-first="1" second-field-align="flush">
    <sort><key variable="citation-number"/></sort>
    <layout suffix=".">
      <text variable="citation-number" suffix=". "/>
      <group delimiter=" ">
        <text macro="author"/>
        <text macro="title" suffix="."/>
        <text macro="container"/>
        <group font-weight="bold"><text variable="volume"/></group>
        <text variable="page" prefix=", "/>
        <text macro="date"/>
      </group>
    </layout>
  </bibliography>
</style>`
}

import { EXTENDED_STYLES } from './styles-extended'

const ALL_STYLES: Record<string, string> = {
  ...BUNDLED_STYLES,
  ...EXTENDED_STYLES
}

export function getStyleXml(styleId: string): string | null {
  return ALL_STYLES[styleId] ?? null
}

export function listBundledStyles(): { id: string; name: string }[] {
  return [
    { id: 'apa-7th', name: 'APA 7th Edition' },
    { id: 'apa-6th', name: 'APA 6th Edition' },
    { id: 'ama-11th', name: 'American Medical Association (AMA) 11th Edition' },
    { id: 'acs', name: 'American Chemical Society (ACS)' },
    { id: 'aps', name: 'American Physical Society (APS)' },
    { id: 'asa', name: 'American Sociological Association (ASA) 6th Edition' },
    { id: 'acm', name: 'ACM (Association for Computing Machinery)' },
    { id: 'annual-reviews', name: 'Annual Reviews' },
    { id: 'bluebook', name: 'Bluebook (Legal Citation, 21st ed.)' },
    { id: 'bmj', name: 'BMJ (British Medical Journal)' },
    { id: 'cell', name: 'Cell' },
    { id: 'chicago-author-date', name: 'Chicago Manual of Style (Author-Date, 17th ed.)' },
    { id: 'chicago-note', name: 'Chicago Manual of Style (Notes-Bibliography, 17th ed.)' },
    { id: 'cse-name-year', name: 'Council of Science Editors (CSE) - Name-Year' },
    { id: 'elsevier-harvard', name: 'Elsevier - Harvard (With Titles)' },
    { id: 'harvard', name: 'Harvard' },
    { id: 'ieee', name: 'IEEE' },
    { id: 'mla-9th', name: 'MLA 9th Edition' },
    { id: 'nature', name: 'Nature' },
    { id: 'plos', name: 'PLOS (Public Library of Science)' },
    { id: 'rsc', name: 'Royal Society of Chemistry (RSC)' },
    { id: 'science', name: 'Science (AAAS)' },
    { id: 'springer-basic-author-date', name: 'Springer - Basic (Author-Date)' },
    { id: 'turabian-author-date', name: 'Turabian 9th Edition (Author-Date)' },
    { id: 'vancouver', name: 'Vancouver' }
  ]
}
