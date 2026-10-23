# Arabic OCR evaluation harness

In-repo version of the evaluation used for the 2026-10 Arabic OCR reports. It
scores Nassila's shipped Arabic recognizer (Paddle PP-OCRv5) against an optional
candidate (Indra OCR) on real PDFs, using each page's own text layer as the
reference where one exists.

## Quick start

```bash
npm run ocr:indra-fetch          # once: fetch Indra models + Python env (optional)
npm run eval:ocr:arabic -- all --corpus "E:\AR-Books-to-OCR"
```

Outputs land in `.eval-arabic-ocr/` (gitignored):

```
pages.json     page selection + gold text + raster paths
pages/*.png    200 dpi rasters
paddle.json    Paddle results
indra.json     Indra results (when the runtime is fetched)
report.md      metrics
```

## Commands

| command | purpose |
|---|---|
| `build` | scan a corpus, pick gold pages (clean Arabic text layer) and scan pages, rasterize |
| `run-paddle` | run `ppu-paddle-ocr` + `resources/arabic-ocr/` |
| `run-indra` | run the fetched Indra runtime |
| `score` | CER / 6-gram / agreement report |
| `all` | everything in order (Indra is skipped with a warning if absent) |

Useful flags: `--corpus <dir>` (or `NASSILA_OCR_CORPUS`), `--out <dir>`,
`--max-books <n>`, `--gold-per-book <n>` (default 8), `--scan-per-book <n>`
(default 6), `--dpi <n>` (default 200).

## How pages are chosen

- **Gold pages** come from PDFs whose text layer is clean Arabic (≥350 Arabic
  chars, no U+FFFD, Arabic ≥40 % of letters). The layer is the reference.
- **Scan pages** come from image-only PDFs; there is no reference, so the report
  shows cross-engine agreement and character coverage only.

Known reference failures to watch for in the report: a layer that omits
figure-only content (screenshot tables), and legacy non-Unicode Arabic
encodings (mojibake). Both inflate CER for an engine that OCRs the page
correctly — check the worst-pages table before drawing conclusions.

## Scoring

CER is Levenshtein over normalized Arabic (NFKC, diacritics/tatweel stripped,
alef/yeh/teh-marbuta unified, letters/digits only), so whitespace and
punctuation never score as errors. Paddle is scored through the shipped
`logicalOrderArabicOcrText` transform (mirrored in the harness — keep it in
sync); Indra is scored raw. 6-gram recall and F1 capture content coverage.

## Indra

Indra is fetched on first run (`npm run ocr:indra-fetch`) and is **never
bundled**: its weights are a modified OpenRAIL-M license. See
`resources/indra-ocr/README.md` for the distribution constraints. The long-term
plan is a Rust/Tauri 2 port of `det.onnx` + `rec_rtl.onnx` to
`onnxruntime-node`; the harness will keep working with either.

## Licensing of corpora

Do not commit corpus PDFs or page rasters. The external sets used for the
2026-10 report and their terms:

- `ahmedheakl/arocrbench_arabicocr` — benchmark samples
- `sherif1313/Historical-Arabic-Handwritten-OCR` — Apache-2.0
- `HumynLabs/Arabic_Documents_Dataset_PDF` — CC-BY-4.0
