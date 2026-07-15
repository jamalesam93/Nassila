/**
 * Minimal single-page PDF with embedded Helvetica text (pdf.js tier A).
 * Used by OA-PDF Masdar-lite smoke tests — not a golden fixture.
 */
export function minimalOaPdfBuffer(): ArrayBuffer {
  const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 105>>stream
BT /F1 12 Tf 72 700 Td (Treatment improved survival outcomes in the cohort.) Tj ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000052 00000 n 
0000000101 00000 n 
0000000244 00000 n 
0000000401 00000 n 
trailer<</Size 6/Root 1 0 R>>
startxref
469
%%EOF`
  return new TextEncoder().encode(pdf).buffer
}

/** Manuscript passage that should align with the minimal OA PDF excerpt. */
export const SMOKE_PASSAGE =
  'Patients receiving the intervention showed improved survival outcomes compared with standard care.'

/** Known OA PDF URL for optional live network smoke (arXiv, stable). */
export const LIVE_OA_PDF_URL = 'https://arxiv.org/pdf/1706.03762.pdf'
