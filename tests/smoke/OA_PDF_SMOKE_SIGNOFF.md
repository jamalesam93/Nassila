# OA-PDF Masdar-lite smoke sign-off

- **Date:** 2026-07-01T18:13:03.839Z
- **App target:** 1.2.0 Masdar-lite
- **Mode:** offline + live
- **Result:** PASS

## Checks

- [x] OA PDF bytes → `fullTextFromOaPdfBytes` → `full_text_oa_unpaywall`
- [x] Maktab `extractFromPdf` (pdf.js tier A) on fixture PDF
- [x] Grounding excerpt selection + deterministic passage alignment
- [x] Mock supported claim with verbatim quote → L3 pass
- [x] Live arXiv PDF fetch + extract (network)

## Not covered (manual before ship)

- Full manuscript audit in Electron with Unpaywall email + Sanad LLM
- Scanned PDF OCR tier B (Tesseract) on hardware

Re-run: `node scripts/smoke-oa-pdf-audit.mjs` or `npm test -- tests/smoke/oa-pdf-masdar-lite.smoke.test.ts`
