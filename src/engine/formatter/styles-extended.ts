export const EXTENDED_STYLES: Record<string, string> = {

  'ama-11th': `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" class="in-text" version="1.0">
  <info><title>American Medical Association (AMA) 11th Edition</title><id>ama-11th</id></info>
  <macro name="author"><names variable="author"><name sort-separator=" " initialize-with="" name-as-sort-order="all" delimiter=", " delimiter-precedes-last="always"/></names></macro>
  <macro name="title"><text variable="title"/></macro>
  <macro name="container"><text variable="container-title" font-style="italic" form="short" strip-periods="true"/></macro>
  <macro name="date"><date variable="issued"><date-part name="year"/></date></macro>
  <citation collapse="citation-number"><sort><key variable="citation-number"/></sort><layout delimiter="," vertical-align="sup"><text variable="citation-number"/></layout></citation>
  <bibliography et-al-min="7" et-al-use-first="3" second-field-align="flush">
    <sort><key variable="citation-number"/></sort>
    <layout suffix=".">
      <text variable="citation-number" suffix=". "/>
      <group delimiter=". ">
        <text macro="author"/>
        <text macro="title"/>
        <group>
          <text macro="container"/>
          <group prefix=". "><text macro="date"/></group>
          <group prefix=";"><text variable="volume"/><text variable="issue" prefix="(" suffix=")"/></group>
          <text variable="page" prefix=":"/>
        </group>
      </group>
    </layout>
  </bibliography>
</style>`,

  'bmj': `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" class="in-text" version="1.0">
  <info><title>BMJ (British Medical Journal)</title><id>bmj</id></info>
  <macro name="author"><names variable="author"><name sort-separator=" " initialize-with="" name-as-sort-order="all" delimiter=", " delimiter-precedes-last="always"/></names></macro>
  <macro name="title"><text variable="title"/></macro>
  <macro name="container"><text variable="container-title" font-style="italic" form="short"/></macro>
  <macro name="date"><date variable="issued"><date-part name="year"/></date></macro>
  <citation collapse="citation-number"><sort><key variable="citation-number"/></sort><layout delimiter=" " vertical-align="sup"><text variable="citation-number"/></layout></citation>
  <bibliography et-al-min="4" et-al-use-first="3" second-field-align="flush">
    <sort><key variable="citation-number"/></sort>
    <layout suffix=".">
      <text variable="citation-number" suffix=" "/>
      <group delimiter=" ">
        <text macro="author" suffix="."/>
        <text macro="title" suffix="."/>
        <text macro="container"/>
        <text macro="date"/>
        <group prefix=";"><text variable="volume"/></group>
        <text variable="page" prefix=":"/>
      </group>
    </layout>
  </bibliography>
</style>`,

  'acs': `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" class="in-text" version="1.0">
  <info><title>American Chemical Society (ACS)</title><id>acs</id></info>
  <macro name="author"><names variable="author"><name initialize-with=". " delimiter="; " name-as-sort-order="all" delimiter-precedes-last="always"/></names></macro>
  <macro name="title"><text variable="title"/></macro>
  <macro name="container"><text variable="container-title" font-style="italic" form="short"/></macro>
  <macro name="date"><date variable="issued" font-weight="bold"><date-part name="year"/></date></macro>
  <citation collapse="citation-number"><sort><key variable="citation-number"/></sort><layout prefix="(" suffix=")" delimiter=", " vertical-align="sup"><text variable="citation-number"/></layout></citation>
  <bibliography second-field-align="flush" entry-spacing="0">
    <sort><key variable="citation-number"/></sort>
    <layout suffix=".">
      <text variable="citation-number" prefix="(" suffix=") "/>
      <group delimiter=" ">
        <text macro="author"/>
        <text macro="title" suffix="."/>
        <text macro="container"/>
        <text macro="date" suffix=","/>
        <group font-style="italic"><text variable="volume"/></group>
        <text variable="issue" prefix="(" suffix="),"/>
        <text variable="page"/>
      </group>
    </layout>
  </bibliography>
</style>`,

  'rsc': `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" class="in-text" version="1.0">
  <info><title>Royal Society of Chemistry (RSC)</title><id>rsc</id></info>
  <macro name="author"><names variable="author"><name initialize-with=". " delimiter=", " and="text" name-as-sort-order="first"/></names></macro>
  <macro name="title"><text variable="title"/></macro>
  <macro name="container"><text variable="container-title" font-style="italic"/></macro>
  <macro name="date"><date variable="issued"><date-part name="year"/></date></macro>
  <citation collapse="citation-number"><sort><key variable="citation-number"/></sort><layout vertical-align="sup" delimiter=","><text variable="citation-number"/></layout></citation>
  <bibliography second-field-align="flush">
    <sort><key variable="citation-number"/></sort>
    <layout suffix=".">
      <text variable="citation-number" suffix=" "/>
      <group delimiter=", ">
        <text macro="author"/>
        <text macro="container"/>
        <text macro="date"/>
        <group font-weight="bold"><text variable="volume"/></group>
        <text variable="page"/>
      </group>
    </layout>
  </bibliography>
</style>`,

  'cell': `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" class="in-text" version="1.0">
  <info><title>Cell</title><id>cell</id></info>
  <macro name="author"><names variable="author"><name initialize-with="." delimiter=", " and="text" name-as-sort-order="first"/></names></macro>
  <macro name="year"><date variable="issued" prefix="(" suffix=")"><date-part name="year"/></date></macro>
  <macro name="title"><text variable="title"/></macro>
  <macro name="container"><text variable="container-title" font-style="italic"/></macro>
  <citation et-al-min="3" et-al-use-first="1"><sort><key macro="author"/><key macro="year"/></sort><layout prefix="(" suffix=")" delimiter="; "><group delimiter=", "><text macro="author"/><text macro="year"/></group></layout></citation>
  <bibliography hanging-indent="true" et-al-min="11" et-al-use-first="10">
    <sort><key macro="author"/><key macro="year"/></sort>
    <layout suffix=".">
      <group delimiter=" ">
        <text macro="author"/>
        <text macro="year" suffix="."/>
        <text macro="title" suffix="."/>
        <text macro="container"/>
        <group font-style="italic"><text variable="volume"/></group>
        <text variable="page" prefix=", "/>
      </group>
    </layout>
  </bibliography>
</style>`,

  'science': `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" class="in-text" version="1.0">
  <info><title>Science (AAAS)</title><id>science</id></info>
  <macro name="author"><names variable="author"><name initialize-with=". " delimiter=", " name-as-sort-order="all"/></names></macro>
  <macro name="title"><text variable="title"/></macro>
  <macro name="container"><text variable="container-title" font-style="italic" form="short"/></macro>
  <macro name="date"><date variable="issued" prefix="(" suffix=")"><date-part name="year"/></date></macro>
  <citation collapse="citation-number"><sort><key variable="citation-number"/></sort><layout prefix="(" suffix=")" delimiter=", "><text variable="citation-number" font-style="italic"/></layout></citation>
  <bibliography et-al-min="6" et-al-use-first="1" second-field-align="flush">
    <sort><key variable="citation-number"/></sort>
    <layout suffix=".">
      <text variable="citation-number" suffix=". "/>
      <group delimiter=", ">
        <text macro="author"/>
        <text macro="title"/>
        <text macro="container"/>
        <group font-weight="bold"><text variable="volume"/></group>
        <text variable="page"/>
        <text macro="date"/>
      </group>
    </layout>
  </bibliography>
</style>`,

  'plos': `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" class="in-text" version="1.0">
  <info><title>PLOS (Public Library of Science)</title><id>plos</id></info>
  <macro name="author"><names variable="author"><name name-as-sort-order="all" sort-separator=" " initialize-with="" delimiter=", " delimiter-precedes-last="always"/></names></macro>
  <macro name="title"><text variable="title"/></macro>
  <macro name="container"><text variable="container-title" font-style="italic"/></macro>
  <macro name="date"><date variable="issued"><date-part name="year"/></date></macro>
  <citation collapse="citation-number"><sort><key variable="citation-number"/></sort><layout prefix="[" suffix="]" delimiter=","><text variable="citation-number"/></layout></citation>
  <bibliography et-al-min="7" et-al-use-first="6" second-field-align="flush">
    <sort><key variable="citation-number"/></sort>
    <layout suffix=".">
      <text variable="citation-number" suffix=". "/>
      <group delimiter=" ">
        <text macro="author" suffix="."/>
        <text macro="title" suffix="."/>
        <text macro="container" suffix="."/>
        <text macro="date" suffix=";"/>
        <text variable="volume"/>
        <text variable="issue" prefix="(" suffix=")"/>
        <text variable="page" prefix=": "/>
      </group>
    </layout>
  </bibliography>
</style>`,

  'acm': `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" class="in-text" version="1.0">
  <info><title>ACM (Association for Computing Machinery)</title><id>acm</id></info>
  <macro name="author"><names variable="author"><name and="text" delimiter=", " initialize-with=". "/></names></macro>
  <macro name="year"><date variable="issued"><date-part name="year"/></date></macro>
  <macro name="title"><text variable="title"/></macro>
  <macro name="container"><text variable="container-title" font-style="italic"/></macro>
  <citation collapse="citation-number"><sort><key variable="citation-number"/></sort><layout prefix="[" suffix="]" delimiter=", "><text variable="citation-number"/></layout></citation>
  <bibliography hanging-indent="true" second-field-align="flush">
    <sort><key variable="citation-number"/></sort>
    <layout suffix=".">
      <text variable="citation-number" prefix="[" suffix="] "/>
      <group delimiter=". ">
        <text macro="author"/>
        <text macro="year"/>
        <text macro="title"/>
        <group delimiter=" "><text macro="container"/><group><text variable="volume" font-style="italic"/><text variable="issue" prefix=", " suffix=" "/></group><text macro="year" prefix="(" suffix=")"/><text variable="page" prefix=", "/></group>
      </group>
    </layout>
  </bibliography>
</style>`,

  'aps': `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" class="in-text" version="1.0">
  <info><title>American Physical Society (APS)</title><id>aps</id></info>
  <macro name="author"><names variable="author"><name initialize-with=". " delimiter=", " and="text"/></names></macro>
  <macro name="title"><text variable="title"/></macro>
  <macro name="container"><text variable="container-title" form="short"/></macro>
  <macro name="date"><date variable="issued" prefix="(" suffix=")"><date-part name="year"/></date></macro>
  <citation collapse="citation-number"><sort><key variable="citation-number"/></sort><layout prefix="[" suffix="]" delimiter=","><text variable="citation-number"/></layout></citation>
  <bibliography second-field-align="flush">
    <sort><key variable="citation-number"/></sort>
    <layout suffix=".">
      <text variable="citation-number" prefix="[" suffix="] "/>
      <group delimiter=", ">
        <text macro="author"/>
        <text macro="container"/>
        <group font-weight="bold"><text variable="volume"/></group>
        <text variable="page"/>
        <text macro="date"/>
      </group>
    </layout>
  </bibliography>
</style>`,

  'elsevier-harvard': `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" class="in-text" version="1.0">
  <info><title>Elsevier - Harvard (With Titles)</title><id>elsevier-harvard</id></info>
  <macro name="author"><names variable="author"><name and="text" delimiter=", " initialize-with="." name-as-sort-order="first"/></names></macro>
  <macro name="year"><date variable="issued"><date-part name="year"/></date></macro>
  <macro name="title"><text variable="title"/></macro>
  <macro name="container"><text variable="container-title" font-style="italic"/></macro>
  <citation et-al-min="3" et-al-use-first="1"><sort><key macro="author"/><key macro="year"/></sort><layout prefix="(" suffix=")" delimiter="; "><group delimiter=", "><text macro="author"/><text macro="year"/></group></layout></citation>
  <bibliography hanging-indent="true">
    <sort><key macro="author"/><key macro="year"/></sort>
    <layout suffix=".">
      <group delimiter=", ">
        <text macro="author"/>
        <text macro="year"/>
        <text macro="title"/>
        <text macro="container"/>
        <text variable="volume"/>
        <text variable="page" prefix="pp. "/>
      </group>
    </layout>
  </bibliography>
</style>`,

  'springer-basic-author-date': `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" class="in-text" version="1.0">
  <info><title>Springer - Basic (Author-Date)</title><id>springer-basic-author-date</id></info>
  <macro name="author"><names variable="author"><name and="text" delimiter=", " initialize-with="" name-as-sort-order="all"/></names></macro>
  <macro name="year"><date variable="issued" prefix="(" suffix=")"><date-part name="year"/></date></macro>
  <macro name="title"><text variable="title"/></macro>
  <macro name="container"><text variable="container-title" font-style="italic"/></macro>
  <citation et-al-min="3" et-al-use-first="1"><sort><key macro="author"/><key macro="year"/></sort><layout prefix="(" suffix=")" delimiter="; "><group delimiter=" "><text macro="author"/><text macro="year"/></group></layout></citation>
  <bibliography hanging-indent="true">
    <sort><key macro="author"/><key macro="year"/></sort>
    <layout suffix=".">
      <group delimiter=" ">
        <text macro="author"/>
        <text macro="year"/>
        <text macro="title" suffix="."/>
        <text macro="container"/>
        <text variable="volume" prefix=" "/>
        <text variable="page" prefix=":"/>
      </group>
    </layout>
  </bibliography>
</style>`,

  'chicago-note': `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" class="note" version="1.0">
  <info><title>Chicago Manual of Style (Notes-Bibliography, 17th ed.)</title><id>chicago-note</id></info>
  <macro name="author"><names variable="author"><name and="text" delimiter=", "/></names></macro>
  <macro name="title"><choose><if type="article-journal chapter" match="any"><text variable="title" quotes="true"/></if><else><text variable="title" font-style="italic"/></else></choose></macro>
  <macro name="container"><text variable="container-title" font-style="italic"/></macro>
  <macro name="date"><date variable="issued"><date-part name="year"/></date></macro>
  <citation><layout suffix="." delimiter="; "><group delimiter=", "><text macro="author"/><text macro="title"/><text macro="container"/><group><text variable="volume"/><text variable="issue" prefix=", no. "/></group><text macro="date"/><text variable="page"/></group></layout></citation>
  <bibliography hanging-indent="true">
    <sort><key macro="author"/><key macro="date"/></sort>
    <layout suffix=".">
      <group delimiter=". ">
        <text macro="author"/>
        <text macro="title"/>
        <text macro="container"/>
      </group>
      <group prefix=" "><text variable="volume"/><text variable="issue" prefix=", no. "/></group>
      <text macro="date" prefix=" (" suffix=")"/>
      <text variable="page" prefix=": "/>
    </layout>
  </bibliography>
</style>`,

  'asa': `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" class="in-text" version="1.0">
  <info><title>American Sociological Association (ASA) 6th Edition</title><id>asa</id></info>
  <macro name="author"><names variable="author"><name and="text" delimiter=", " name-as-sort-order="first"/></names></macro>
  <macro name="year"><date variable="issued"><date-part name="year"/></date></macro>
  <macro name="title"><text variable="title"/></macro>
  <macro name="container"><text variable="container-title" font-style="italic"/></macro>
  <citation et-al-min="4" et-al-use-first="1"><sort><key macro="author"/><key macro="year"/></sort><layout prefix="(" suffix=")" delimiter="; "><group delimiter=" "><text macro="author"/><text macro="year"/></group></layout></citation>
  <bibliography hanging-indent="true">
    <sort><key macro="author"/><key macro="year"/></sort>
    <layout suffix=".">
      <group delimiter=". ">
        <text macro="author"/>
        <text macro="year"/>
        <text macro="title" quotes="true"/>
        <group><text macro="container"/><group prefix=" "><text variable="volume"/><text variable="issue" prefix="(" suffix=")"/></group><text variable="page" prefix=":"/></group>
      </group>
    </layout>
  </bibliography>
</style>`,

  'bluebook': `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" class="note" version="1.0">
  <info><title>Bluebook (Legal Citation, 21st ed.)</title><id>bluebook</id></info>
  <macro name="author"><names variable="author"><name delimiter=", " and="symbol"/></names></macro>
  <macro name="title"><text variable="title" font-style="italic"/></macro>
  <macro name="container"><text variable="container-title" font-variant="small-caps"/></macro>
  <macro name="date"><date variable="issued" prefix="(" suffix=")"><date-part name="year"/></date></macro>
  <citation><layout suffix="." delimiter="; "><group delimiter=", ">
    <text macro="author"/><text macro="title"/><group><text variable="volume" suffix=" "/><text macro="container"/><text variable="page" prefix=" "/></group><text macro="date"/></group></layout></citation>
  <bibliography hanging-indent="true">
    <sort><key macro="author"/></sort>
    <layout suffix=".">
      <group delimiter=", ">
        <text macro="author"/>
        <text macro="title"/>
        <group><text variable="volume" suffix=" "/><text macro="container"/><text variable="page" prefix=" "/></group>
        <text macro="date"/>
      </group>
    </layout>
  </bibliography>
</style>`,

  'turabian-author-date': `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" class="in-text" version="1.0">
  <info><title>Turabian 9th Edition (Author-Date)</title><id>turabian-author-date</id></info>
  <macro name="author"><names variable="author"><name and="text" delimiter=", " name-as-sort-order="first"/></names></macro>
  <macro name="year"><date variable="issued"><date-part name="year"/></date></macro>
  <macro name="title"><choose><if type="article-journal chapter" match="any"><text variable="title" quotes="true"/></if><else><text variable="title" font-style="italic"/></else></choose></macro>
  <macro name="container"><text variable="container-title" font-style="italic"/></macro>
  <citation et-al-min="4" et-al-use-first="1"><sort><key macro="author"/><key macro="year"/></sort><layout prefix="(" suffix=")" delimiter="; "><group delimiter=", "><text macro="author"/><text macro="year"/></group></layout></citation>
  <bibliography hanging-indent="true">
    <sort><key macro="author"/><key macro="year"/></sort>
    <layout suffix=".">
      <group delimiter=". ">
        <text macro="author"/>
        <text macro="year"/>
        <text macro="title"/>
        <text macro="container"/>
      </group>
      <group prefix=" "><text variable="volume"/><text variable="issue" prefix=", no. "/></group>
      <text variable="page" prefix=": "/>
    </layout>
  </bibliography>
</style>`,

  'apa-6th': `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" class="in-text" version="1.0">
  <info><title>APA 6th Edition</title><id>apa-6th</id></info>
  <macro name="author"><names variable="author"><name and="symbol" delimiter=", " delimiter-precedes-last="contextual" initialize-with=". " name-as-sort-order="first"/><et-al font-style="italic"/></names></macro>
  <macro name="year"><group prefix="(" suffix=")"><date variable="issued"><date-part name="year"/></date></group></macro>
  <macro name="title"><choose><if type="article-journal chapter" match="any"><text variable="title"/></if><else><text variable="title" font-style="italic"/></else></choose></macro>
  <macro name="container"><text variable="container-title" font-style="italic"/></macro>
  <citation et-al-min="6" et-al-use-first="1" disambiguate-add-year-suffix="true"><sort><key macro="author"/><key macro="year"/></sort><layout prefix="(" suffix=")" delimiter="; "><group delimiter=", "><text macro="author"/><text macro="year"/></group></layout></citation>
  <bibliography hanging-indent="true" et-al-min="8" et-al-use-first="6" entry-spacing="0" line-spacing="2">
    <sort><key macro="author"/><key macro="year"/></sort>
    <layout suffix=".">
      <group delimiter=" ">
        <text macro="author" suffix="."/>
        <text macro="year"/>
        <text macro="title" suffix="."/>
        <text macro="container" suffix=","/>
        <group font-style="italic"><text variable="volume"/></group>
        <text variable="issue" prefix="(" suffix="),"/>
        <text variable="page"/>
      </group>
    </layout>
  </bibliography>
</style>`,

  'cse-name-year': `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" class="in-text" version="1.0">
  <info><title>CSE - Council of Science Editors (Name-Year)</title><id>cse-name-year</id></info>
  <macro name="author"><names variable="author"><name sort-separator=" " initialize-with="" name-as-sort-order="all" delimiter=", " delimiter-precedes-last="always"/></names></macro>
  <macro name="year"><date variable="issued"><date-part name="year"/></date></macro>
  <macro name="title"><text variable="title"/></macro>
  <macro name="container"><text variable="container-title" form="short" strip-periods="true"/></macro>
  <citation et-al-min="3" et-al-use-first="1"><sort><key macro="author"/><key macro="year"/></sort><layout prefix="(" suffix=")" delimiter="; "><group delimiter=" "><text macro="author"/><text macro="year"/></group></layout></citation>
  <bibliography hanging-indent="true">
    <sort><key macro="author"/><key macro="year"/></sort>
    <layout suffix=".">
      <group delimiter=". ">
        <text macro="author"/>
        <text macro="year"/>
        <text macro="title"/>
        <group><text macro="container"/><text variable="volume" prefix=". "/><text variable="issue" prefix="(" suffix=")"/><text variable="page" prefix=":"/></group>
      </group>
    </layout>
  </bibliography>
</style>`,

  'annual-reviews': `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" class="in-text" version="1.0">
  <info><title>Annual Reviews</title><id>annual-reviews</id></info>
  <macro name="author"><names variable="author"><name initialize-with="" name-as-sort-order="all" sort-separator=" " delimiter=", " delimiter-precedes-last="always"/></names></macro>
  <macro name="year"><date variable="issued"><date-part name="year"/></date></macro>
  <macro name="title"><text variable="title"/></macro>
  <macro name="container"><text variable="container-title" font-style="italic" form="short"/></macro>
  <citation collapse="citation-number"><sort><key variable="citation-number"/></sort><layout prefix="(" suffix=")" delimiter=", "><text variable="citation-number"/></layout></citation>
  <bibliography second-field-align="flush" et-al-min="7" et-al-use-first="6">
    <sort><key variable="citation-number"/></sort>
    <layout suffix=".">
      <text variable="citation-number" suffix=". "/>
      <group delimiter=" ">
        <text macro="author" suffix="."/>
        <text macro="year" suffix="."/>
        <text macro="title" suffix="."/>
        <text macro="container"/>
        <text variable="volume" font-style="italic" suffix=":"/>
        <text variable="page"/>
      </group>
    </layout>
  </bibliography>
</style>`
}
