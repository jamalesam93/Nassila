/**
 * Programmatic DOCX builder for Maktab Route C golden fixtures.
 * Builds minimal valid OOXML packages (zip) in memory with jszip so tests need
 * no committed binary assets. Headings use real Word styles (Heading1..6),
 * which mammoth maps to h1..h6 so `extractStructuredDocx` can surface them.
 */

import JSZip from 'jszip'

export type DocxHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export interface DocxParagraph {
  text: string
  heading?: DocxHeadingLevel
}

export interface DocxList {
  items: string[]
}

export interface DocxTable {
  rows: string[][]
}

export type DocxBlock = DocxParagraph | DocxList | DocxTable

function xmlEscape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function paragraphXml(block: DocxParagraph): string {
  const pPr = block.heading
    ? `<w:pPr><w:pStyle w:val="Heading${block.heading}"/></w:pPr>`
    : ''
  return `<w:p>${pPr}<w:r><w:t xml:space="preserve">${xmlEscape(block.text)}</w:t></w:r></w:p>`
}

function listXml(list: DocxList): string {
  return list.items
    .map(
      (item) =>
        `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>` +
        `<w:r><w:t xml:space="preserve">${xmlEscape(item)}</w:t></w:r></w:p>`
    )
    .join('')
}

function tableXml(table: DocxTable): string {
  const rows = table.rows
    .map(
      (cells) =>
        `<w:tr>${cells
          .map(
            (cell) =>
              `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>` +
              `<w:p><w:r><w:t xml:space="preserve">${xmlEscape(cell)}</w:t></w:r></w:p></w:tc>`
          )
          .join('')}</w:tr>`
    )
    .join('')
  return `<w:tbl>${rows}</w:tbl>`
}

function blocksToBodyXml(blocks: DocxBlock[]): string {
  return blocks
    .map((block) => {
      if ('rows' in block) return tableXml(block)
      if ('items' in block) return listXml(block)
      return paragraphXml(block)
    })
    .join('')
}

function stylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="Heading 1"/><w:basedOn w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="Heading 2"/><w:basedOn w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="Heading 3"/><w:basedOn w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading4"><w:name w:val="Heading 4"/><w:basedOn w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading5"><w:name w:val="Heading 5"/><w:basedOn w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading6"><w:name w:val="Heading 6"/><w:basedOn w:val="Normal"/></w:style>
</w:styles>`
}

/** Build a minimal valid .docx package as an ArrayBuffer. */
export async function buildDocxFixture(blocks: DocxBlock[]): Promise<ArrayBuffer> {
  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`
  )
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="word/styles.xml"/>
</Relationships>`
  )
  zip.file(
    'word/_rels/document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
  )
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
${blocksToBodyXml(blocks)}
</w:body></w:document>`
  )
  zip.file('word/styles.xml', stylesXml())
  return zip.generateAsync({ type: 'arraybuffer' })
}

/** Standard IMRAD + references fixture exercising headings, lists, and a table. */
export async function buildImradDocxFixture(): Promise<ArrayBuffer> {
  return buildDocxFixture([
    { text: 'Antimicrobial Resistance Surveillance', heading: 1 },
    { text: 'Introduction', heading: 2 },
    { text: 'This study examines antimicrobial resistance across five tertiary care hospitals.' },
    { text: 'Methods', heading: 2 },
    { text: 'We analyzed registry records from 2019 to 2024 using standard surveillance definitions.' },
    { items: ['Registry extraction', 'Manual chart review'] },
    {
      rows: [
        ['Site', 'Isolates', 'Resistance'],
        ['Hospital A', '1204', '38%']
      ]
    },
    { text: 'Results', heading: 2 },
    { text: 'Resistance rates increased among Gram-negative isolates during the study period.' },
    { text: 'References', heading: 1 },
    { text: '1. Smith J, Jones A. Antimicrobial resistance surveillance. Lancet 2024;45:120-130.' },
    { text: '2. Doe R. Hospital stewardship programs. N Engl J Med 2023;89:45-52.' }
  ])
}
