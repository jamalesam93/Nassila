# Maktab OCR — offline extraction plan

**Worker:** Maktab (مكتب) · **Task:** `doc_extract` (LLM facet planned)  
**Policy:** on-device only for v1 / 2.0 scaffolding; cloud optional later.  
**Languages:** English and French via Tesseract (`eng`, `fra`) and native PP-OCRv6 Small when routed. Arabic PDF OCR remains **deferred** behind an adapter seam (prefer DOCX); Tesseract `ara` is not enabled.

---

## Role in Ouroboros

Maktab is the **first deterministic stage** after upload. It produces canonical text for:

- manuscript segmentation (`segments.ts`)
- in-text citation parsing (`intext.ts`)
- bibliography block detection

**Masdar** reuses the same extraction module for cited OA PDFs (1.2.0 Masdar-lite and beyond).

```
Upload PDF/DOCX
    → Maktab.extractFromPdf
         (native pdf-inspector → WASM → pdf.js | tier B: Tesseract)
    → segments + cites
    → Masdar (source PDFs, same extract API)
    → Sanad grounding
```

Operator map: NassilaT [`training/OUROBOROS_OPERATOR_MAP.md`](../../NassilaT/training/OUROBOROS_OPERATOR_MAP.md) § Maktab OCR.  
**2.0 execution:** NassilaT [`2.0_OPERATOR_INDEX.md`](../../NassilaT/training/2.0_OPERATOR_INDEX.md) · packaged smoke [`PACKAGED_OCR_SMOKE.md`](./PACKAGED_OCR_SMOKE.md) · Arabic [`ARABIC_OCR_ADAPTER.md`](./ARABIC_OCR_ADAPTER.md)

---

## Firecrawl-first extraction (2.0 scaffolding)

| Tier | Engine | When | Status |
|------|--------|------|--------|
| **A0 — native** | `@firecrawl/pdf-inspector@1.17.0` (`classifyPdf` / `processPdfWithOcr`, `mode: Auto`, `offline: true`) | Main process; napi + optional PP-OCRv6 Small cache | **Scaffolding** — soft-load; degrades when DLL/model missing |
| **A1 — WASM** | `@firecrawl/pdf-inspector-wasm@0.1.3` | PDF has extractable glyphs; native unavailable | **Live** — **pinned at 0.1.3** (1.14+ WASM breaks `processPdf` options in `pdf-inspector-extract.ts`) |
| **A2 — pdf.js** | `pdfjs-dist` via `pdf-extract.ts` | Native + WASM miss / pin `engine: 'pdfjs'` | **Live** |
| **B — OCR** | Tesseract.js (Apache-2.0) + Leptonica (BSD-2) | Scan / sparse Latin after tier A | **Live (O1)** |

**Mode** (`MaktabExtractionOptions.mode`):

- `auto` (default) — try tier A (native → WASM → pdf.js); escalate to B when A fails or warns “very little text” **and** the document is not Arabic-deferred
- `embedded_only` — tier A only (fast path)
- `ocr_preferred` — try tier A first; use OCR when A is sparse/empty **for Latin**; Arabic-heavy or character-reversed PDFs keep embedded text and warn to prefer DOCX

**Engine pin** (`engine?: 'native' | 'inspector' | 'pdfjs'`): test / emergency fallback. Default order still degrades gracefully.

OCR language packs for Tesseract are **`eng`/`fra` only**. Soft page budget for OCR is **200** pages (matches manuscript PDF extract).

---

## Nassila-owned module (code)

| Path | Role |
|------|------|
| [`src/engine/maktab/extract.ts`](../src/engine/maktab/extract.ts) | Public entry: `extractFromPdf` |
| [`src/engine/maktab/types.ts`](../src/engine/maktab/types.ts) | `MaktabExtractionResult`, languages, tiers |
| [`src/engine/maktab/native-pdf-inspector.ts`](../src/engine/maktab/native-pdf-inspector.ts) | Soft-load napi + map provenance (`engineId`, confidence, pagesRoutedToOcr, pagesWithTables) |
| [`src/engine/maktab/native-backend.ts`](../src/engine/maktab/native-backend.ts) | Injectable native backend (IPC / main) |
| [`src/engine/maktab/ocr/`](../src/engine/maktab/ocr/) | OCR backend + Arabic adapter seam + post-process |
| [`src/engine/maktab/anydoc-docx.ts`](../src/engine/maktab/anydoc-docx.ts) | Optional `@firecrawl/anydoc` DOCX parity (fixture compare; mammoth default) |
| [`src/engine/manuscript/pdf-inspector-extract.ts`](../src/engine/manuscript/pdf-inspector-extract.ts) | Tier A1 WASM (`@firecrawl/pdf-inspector-wasm@0.1.3`) |
| [`src/engine/manuscript/pdf-extract.ts`](../src/engine/manuscript/pdf-extract.ts) | Tier A orchestrator (native → WASM → pdf.js) |
| [`src/main/maktab/native-pdf-inspector.ts`](../src/main/maktab/native-pdf-inspector.ts) | Model-dir resolution + main backend registration |
| IPC | `maktab:nativeAvailable`, `maktab:nativeClassify`, `maktab:nativeExtract` (+ existing Tesseract channels) |

DOCX ingest: mammoth Route C default; `engine: 'anydoc'` for optional native comparison only.

---

## Arabic recognizer adapter

[`src/engine/maktab/ocr/arabic-adapter.ts`](../src/engine/maktab/ocr/arabic-adapter.ts) defines `ArabicRecognizerAdapter` with `unavailableArabicAdapter` as default.

**Planned:** PP-OCRv5 Arabic (or equivalent) weights behind this adapter.  
**Not:** drop-in files into the PP-OCRv6 Small directory used by native pdf-inspector selective OCR.  
**Not yet:** enabling Tesseract `ara` or lifting DOCX deferral.

---

## OCR backend (Tesseract) — O1 live

1. **Rasterize** PDF pages (~300 DPI quality / 200 DPI fast).
2. **Preprocess** — grayscale, deskew, denoise (Nassila-owned heuristics).
3. **Language packs** — `eng` / `fra` from official `tessdata_fast` under `resources/tesseract/`. **`ara` is not shipped** until the Arabic adapter lands; Arabic PDFs prefer DOCX.
4. **Recognize** — Tesseract.js runs in the **main process** through validated IPC.
5. **Post-process** — de-hyphenation, Unicode normalize, Arabic policy (conservative).
6. **Cache** — key = `sha256(file) + page + dpi + lang pack version`.

**Native packaging:** Main is mostly bundled (`externalizeDeps: false`) so portable builds ship `out/**` without the full `node_modules` tree. **`canvas`**, **`@firecrawl/pdf-inspector`**, and **`@firecrawl/anydoc`** are external — Node addons cannot be Rollup-bundled. `electron-builder.yml` includes and `asarUnpack`s those packages (and platform optional deps) so `.node` / companion DLLs load from a real filesystem path.

**Offline pdf-inspector models:** see [`resources/pdf-inspector/README.md`](../resources/pdf-inspector/README.md). Fetch with:

```bash
npm run ocr:pdf-inspector-runtime
```

PDFium + ONNX Runtime shared libraries are a separate operator step (`--runtime`); set `PDFIUM_LIB_PATH` / `ORT_DYLIB_PATH` when OCR pages are routed.

**Licensing:** Tesseract.js and the official Tesseract `tessdata_fast` files are Apache-2.0; Leptonica is BSD-2-Clause. PP-OCRv6 Small via oar-ocr is Apache-2.0. Pack source and license details are recorded in [`resources/tesseract/README.md`](../resources/tesseract/README.md) and [`resources/pdf-inspector/NOTICE`](../resources/pdf-inspector/NOTICE).

Install or refresh the pinned Tesseract language packs before packaging:

```bash
npm run ocr:langpacks
```

**Not in scope this scaffolding pass:** Shahid UI; enabling Arabic Tesseract; bumping app `package.json` to 2.0.0.

---

## Golden fixtures (shipped — v1.6.0 T1)

Deterministic, hand-built PDFs (no committed binaries) generated by
[`tests/fixtures/maktab-pdf-builder.ts`](../tests/fixtures/maktab-pdf-builder.ts):
minimal Type1 Helvetica pages and a Type0 Identity-H Arabic page, with computed
xref offsets so any malformation fails loudly at load time. The
`engine?: 'native' | 'inspector' | 'pdfjs'` pin in `extractManuscriptFromPdf` makes
per-engine assertions deterministic (and doubles as an emergency fallback).

**Unit golden suite** — `tests/unit/maktab-golden-fixtures.test.ts` (12 tests,
plain `npm test`, no Tesseract, node env):

| Fixture | Engine pinned | Assert |
|---------|---------------|--------|
| Embedded text (wrapped, >200 glyphs) | default (inspector) | tier A, no OCR, exact page boundaries |
| Multi-page embedded | pdfjs | contiguous `pageBoundaries` |
| Embedded, `ocr_preferred` | pdfjs | tier A kept, OCR spy never called |
| Sparse glyphs (`abc def`) + backend | pdfjs | escalates to tier B |
| Sparse glyphs, no backend | pdfjs | stays embedded, `needsReview` |
| Image-only page, no backend | default + pdfjs | `MaktabOcrUnavailableError` |
| Image-only page + backend | pdfjs | tier B mock path |
| Two-column (right column written first) | pdfjs + inspector | left column before right |
| References section | pdfjs | `findReferencesBoundary` + `segmentManuscriptText` |
| Arabic-dominant Type0 page | pdfjs | stays embedded, OCR never called |

Notes on engine reality, recorded for fixture maintainers:

- Both engines normalize RTL extraction to logical order, so generated PDFs
  cannot reproduce the character-reversed Arabic signature (`في → يف`); the
  reversal-warning → DOCX-deferral branch is covered at the unit level
  (`tests/unit/maktab-ocr-languages.test.ts`, `tests/unit/maktab-extract.test.ts`).
- Single-line fixtures truncate at the page width (glyph advance ~6pt at 12pt
  font); wrap text into lines or pdf.js reports the sparse warning.
- pdf.js rejects `CIDInit`-preamble ToUnicode CMaps in Node ("Unknown CMap
  name"), so fixtures use `WinAnsiEncoding` / Identity-H without ToUnicode.
- `standardFontDataUrl` warnings during extraction are harmless (rendering
  only); the OCR probe configures the path when it rasterizes.

**Tier-B content probe (real Tesseract, packaged CI only)** —
[`scripts/probe-ocr-golden.mjs`](../scripts/probe-ocr-golden.mjs) rasterizes
the same generated PDFs with pdf.js (300 dpi) and runs genuine
`eng.traineddata` OCR, asserting the golden markers (title, body phrase, year,
reference author) are recovered and the blank scan page stays short:

```bash
npm run probe:ocr:golden   # prints probe-ocr-golden=true; exit 0 on pass
```

Wired into the `.github/workflows/ci.yml` `package-windows` job after
`probe:ocr`; the Linux `verify` job stays untouched (no Tesseract).

**Native pdf-inspector soft-load probe** —
[`scripts/probe-native-pdf-inspector.mjs`](../scripts/probe-native-pdf-inspector.mjs)
checks that `@firecrawl/pdf-inspector` napi loads under Electron. Exit `2`
means soft-unavailable (missing DLL/model — expected until operator runtime
fetch). Exit `0` means classify/process entry points resolve; OCR pages still
need PDFium/ONNX + model cache:

```bash
npm run probe:native-pdf-inspector
```

---

## Extraction cache controls (shipped — v1.6.0 T2)

The source-artifact extraction cache lives in `userData/source-artifacts`
(`sourceArtifactCacheDirectory`), keyed **by PDF SHA-256 only**
(`sha256.json`, `CACHE_VERSION` 1) via
[`src/engine/manuscript/source-artifact-cache.ts`](../src/engine/manuscript/source-artifact-cache.ts).
Per-page OCR cache (`sha256 + page + dpi + lang pack`) stays **deferred**
— item 6 in the OCR backend list above describes that future key.

- **Engine** — `sourceArtifactCacheInfo(cacheDirectory)` → `{ count, bytes }`;
  `clearSourceArtifactCache(cacheDirectory)` → `{ clearedCount, freedBytes }`.
  Both only touch `[a-f0-9]{64}.json` files inside the pinned directory
  (never the directory itself or unrelated files).
- **IPC** — `maktab:extractionCacheInfo` / `maktab:clearExtractionCache` in
  `src/main/ipc-handlers.ts`; no renderer input, declared in
  `src/shared/ipc-policy.ts` (SEC-01 pinning).
- **UI** — Storage section (Settings → General tab,
  `src/renderer/components/settings/StorageSettings.tsx`) shows cached
  entry/file count and size, with a Clear button; labels EN/AR in
  `settings.storage.*`.
- **Review notice** — PDF imports flagged `needsReview` (sparse, reversed
  Arabic, low-confidence merge, Arabic-deferred) show a dismissible amber
  banner above the editor instead of a red error; `manuscriptAudit.reviewNeeded`.

---

## App versions (operator map alignment)

| Version | Maktab / OCR deliverable |
|---------|--------------------------|
| **1.2.0 / O1** | Tesseract.js backend (eng/fra) in main-process IPC; Masdar-lite reuses `extractFromPdf` for OA PDF bytes |
| **1.2.8 / O2** | Offline/bundled eng/fra language-pack policy, golden fixtures, provenance/cache UX, scan fallback, Enhanced OCR control, hardware smoke |
| **1.3.1** | Arabic Tesseract **deferred** — `ara` pack removed; Arabic PDFs prefer DOCX |
| **1.6.0** | OCR golden fixtures + CI probe; cache controls; needsReview banner |
| **2.0.0** | **MaktabOCR + Shahid** — Firecrawl native pdf-inspector + pretrained Arabic adapter (replaces deferred Tesseract `ara`) + table/figure evidence path (gated on Tier 3 + multimodal eval). **Scaffolding in-tree before the 2.0.0 version bump**; Shahid UI did **not** ship in 1.8.0. |
| **Tier 3** | Maktab LLM `doc_extract` facet + full-text eval corpus (M01 — only if deterministic baseline fails) |

---

## Related

- [`LOOP.md`](../LOOP.md) — engineering loop
- [`docs/OUROBOROS.md`](./OUROBOROS.md) — worker map
- [`patterns/ouroboros-registry.yaml`](../patterns/ouroboros-registry.yaml) — stage registry
