# Maktab OCR golden-fixtures sign-off (v1.6.0 T1)

- **Date:** 2026-08-04
- **App target:** 1.6.0 Maktab Loop (حلقة المخطوطة)
- **Mode:** offline (unit + local probe)
- **Result:** PASS

## Checks

- [x] Engine pin `engine?: 'inspector' | 'pdfjs'` on `extractManuscriptFromPdf`, threaded through `MaktabExtractionOptions` (`src/engine/manuscript/pdf-extract.ts`, `src/engine/maktab/extract.ts`)
- [x] Generated PDF fixtures (`tests/fixtures/maktab-pdf-builder.ts`) — embedded (multi-line >200 glyphs), sparse, two-column, references, image-only scan, Arabic Type0 Identity-H
- [x] Golden unit suite `tests/unit/maktab-golden-fixtures.test.ts` — **12/12 pass** on plain `npm test` (node env, no Tesseract)
- [x] Engine-dependence pinned per test: embedded (inspector), sparse/scan/references/Arabic/two-column (pdfjs), two-column also inspector
- [x] Tier-B routing contracts: sparse → OCR when backend, `needsReview` without; scan → `MaktabOcrUnavailableError` without backend; `ocr_preferred` keeps good embedded text
- [x] Arabic policy: Arabic-dominant page stays embedded, OCR spy never called (deferral branch covered by existing unit tests `maktab-ocr-languages` / `maktab-extract`)
- [x] Real-Tesseract content probe `scripts/probe-ocr-golden.mjs` — `probe-ocr-golden=true`, exit 0 (title/body/year/reference markers recovered at 300 dpi; blank scan page stays short)
- [x] CI wiring: `.github/workflows/ci.yml` `package-windows` runs `probe:ocr:golden` after `probe:ocr`; Linux `verify` untouched
- [x] `npm test` 447 pass, `npm run lint` clean, `npm run typecheck` clean

## Not covered (manual before ship)

- Packaged-app probe run on CI (job runs on merge; `resources/tesseract/eng.traineddata` present in repo)
- AR-language OCR content probe (deferred by policy — no ara Tesseract)

Re-run: `npm run probe:ocr:golden` or `npx vitest run tests/unit/maktab-golden-fixtures.test.ts`
