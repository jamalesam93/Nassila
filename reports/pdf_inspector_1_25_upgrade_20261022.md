# pdf-inspector 1.17.0 → 1.25.2 — upgrade evidence (Maktab native tier)

**Date:** 2026-10-22 · **Scope:** Phase 1 of the approved OCR plan
**Package:** `@firecrawl/pdf-inspector` exactly `1.25.2` (npm latest; OCR models unchanged — PP-OCRv6 Small, `oar-ocr-v0.7.0`, PDFium `native-v7988`, ORT 1.27.0 per upstream `docs/ocr-runtime.md`)
**WASM:** unchanged, still pinned at `@firecrawl/pdf-inspector-wasm@0.1.3`

## What changed in the app

- **Routing** (`src/engine/maktab/native-pdf-inspector.ts`): `classifyPdf` runs first. When no page needs OCR, extraction goes through `processPdfAsync` (no PDFium/ONNX/model load, libuv pool). `processPdfWithOcr` runs only for documents with routed pages.
- **Signals** (`NativePdfSignals`): `cmapGaps` + `cmapGapRatio`, `hasEncodingIssues`, 1-indexed `pagesNeedingOcr`, `pagesWithInvisibleTextLayer` (from `ocrReasonsByPage`), `documentInfo`.
- **Warnings** (`src/engine/maktab/ocr/post-process.ts`): `cmapGapRatio > 0.02` → `TEXT_LAYER_INCOMPLETE_WARNING`; any invisible text layer → `INVISIBLE_TEXT_LAYER_WARNING`. Both set `needsReview` and escalate to tier B. The `في`/`يف` whole-document regex now only runs on the pdf.js tier.
- **Docs:** `docs/MAKTAB_OCR.md` (A0 row + signals section), `resources/pdf-inspector/README.md`, `CHANGELOG.md`; probe now reports `version`, `processPdfAsync`, and the real `pp-ocrv6-small` model path.

## Gate results

| Gate | Result |
|---|---|
| `npm run typecheck` | pass |
| `npm run lint` | pass |
| OCR/Maktab regression subset (9 files) | **72/72 pass** (incl. 26 golden fixtures) |
| Full suite | **634 pass**, 1 failure: `manuscript-audit-run-isolation` timed out under load; **passes in isolation** (606 ms) → pre-existing flake |
| `npm run probe:native-pdf-inspector` (Electron) | exit 0 — `classifyPdf=true`, `processPdfWithOcr=true`, `processPdfAsync=true`, model dir missing as expected |
| New tests | `tests/unit/pdf-inspector-signals.test.ts` — 7 tests (ratio gate, mapping, both routing paths, warning propagation, needsReview) |

## Real-PDF A/B (1.17.0 vs 1.25.2, same bytes)

Corpus: `NassilaT/training/cache/oa_fulltext/pdfs`, first 20 PDFs (Latin OA articles; 1 book of 802 pages). Metric: word-set Jaccard after stripping markdown 1.18+ adds (sub/sup tags, emphasis, links, table pipes).

- Parsed: **20/20 on both versions**, no exceptions.
- **Mean word Jaccard 0.9593**; 15 of 20 at ≥ 0.94.
- **Unmapped ToUnicode codes reported by 1.25.2: 0** (English corpus; the Arabic signal path is untested until the real holdout exists).
- Timing: 1.25.2 is roughly **8–15 % slower** on this corpus (802 pages: 13.9 s → 15.0 s).

Where the text actually differs, it is the intended 1.18–1.25 behaviour, not lost content:

- Sub/superscripts now emit `<sub>`/`<sup>` (`k<sub>x</sub>`, `DMol³`), which changes tokenisation (the main source of Jaccard < 1.0).
- Tables are emitted as markdown pipe tables where 1.17 flattened them (`014` R manual: 37.6 k → 39.3 k words, TOC + tables recovered).
- Running page headers are dropped (`NIH-PA Author Manuscript` no longer fused into article headings).

Full per-file table: `ab-report.md` (workspace `ocr-ab/`).

## Indra feasibility probe (Phase 3 input)

All five core graphs load in the `onnxruntime-node@1.29.0` Nassila already ships — no Python required for a future port:

| model | inputs | outputs |
|---|---|---|
| `det.onnx` | `x` | `out` |
| `rec_rtl.onnx` | `x`, `widths` | `ids`, `conf`, `lengths`, `blank`, `topv`, `topi` |
| `orient.onnx` | `x` | `p` |
| `script.onnx` | `x`, `widths` | `p` |
| `order.onnx` | `feats`, `mask` | `a`, `cls`, `same`, `tab` |

`rec_rtl` is a PP-OCR-style CTC recognizer with a `widths` input, i.e. the same preprocessing shape as the PP-OCRv5 runner already in `ppu-paddle-ocr`. Porting remains plausible; quality is still unmeasured.

## Residual risks

- npm 1.25.2 predates upstream PR **#618** (cmap-less core-Windows subsets: U+FFFD between words → pages wrongly OCR'd). Re-evaluate at 1.25.3; do not vendor a git build.
- The 2 % `cmapGapRatio` gate is provisional — calibrate on real Arabic/scanned corpora.
- No real Arabic or badly-encoded corpus exists in the repo yet, so the RTL/ToUnicode fixes are verified only by upstream changelog + targeted unit tests, not by real files.
- 1.25.2 costs ~8–15 % extraction time; the text fast path adds one cheap `classifyPdf` call per document.
