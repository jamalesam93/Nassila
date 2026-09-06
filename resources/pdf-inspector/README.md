# Offline pdf-inspector runtime (Nassila 2.0 MaktabOCR)

On-device selective OCR for `@firecrawl/pdf-inspector@1.17.0`. **No network** at
audit time when `offline: true` and this directory is populated.

## Layout

```
resources/pdf-inspector/
  README.md                 ← this file
  NOTICE                    ← Apache-2.0 / third-party notices
  checksums.sha256          ← written by download script
  pp-ocrv6-small/           ← ~31 MB PP-OCRv6 Small (operator-fetched)
    pp-ocrv6_small_det.onnx
    pp-ocrv6_small_rec.onnx
    ppocrv6_dict.txt
  runtime/                  ← PDFium + ONNX Runtime shared libs (optional; large)
    pdfium.dll | libpdfium.so | …
    onnxruntime.dll | …
```

## Fetch pinned assets (operator step)

```bash
node scripts/download-pdf-inspector-runtime.mjs
# models only (default):
node scripts/download-pdf-inspector-runtime.mjs --models
# also fetch Windows x64 PDFium + ONNX Runtime (hundreds of MB):
node scripts/download-pdf-inspector-runtime.mjs --runtime
```

Large binaries are **gitignored**. Release packaging copies whatever is present
under `resources/pdf-inspector/` into `extraResources` (see `electron-builder.yml`).

## Runtime env (when OCR pages are routed)

Set when shared libraries are not on the platform search path:

| Variable | Points at |
|----------|-----------|
| `PDFIUM_LIB_PATH` | `pdfium.dll` / `libpdfium.so` / `libpdfium.dylib` |
| `ORT_DYLIB_PATH` | `onnxruntime.dll` / `libonnxruntime.so` / … |

Pinned upstream versions (Firecrawl OCR runtime guide):

- PDFium: Firecrawl `native-v7988` (PDFium `153.0.7988.0`)
- ONNX Runtime: `1.27.0`
- Models: GreatV/oar-ocr `v0.7.0` PP-OCRv6 Small (~31 MB)

## Arabic

PP-OCRv6 Small is the Latin/general selective-OCR pack for native pdf-inspector.
Arabic recognition is planned behind `src/engine/maktab/ocr/arabic-adapter.ts`
(PP-OCRv5 Arabic or equivalent) — **not** drop-in files in `pp-ocrv6-small/`.

## Fallback chain

When native napi / DLLs / models are missing, Maktab degrades:

1. `@firecrawl/pdf-inspector-wasm@0.1.3` (pinned; newer WASM majors break the wrapper)
2. `pdfjs-dist` column-aware extract
3. Tesseract.js (`eng`/`fra` only; Arabic still deferred)

## Licensing

- pdf-inspector / anydoc: see upstream package licenses (MIT / as published)
- PP-OCRv6 models via oar-ocr / PaddleOCR lineage: **Apache-2.0**
- ONNX Runtime: Microsoft license (see ONNX Runtime release notices)
- PDFium: BSD-style (see Firecrawl pdfium-rs release SPDX)

Do not commit multi-hundred-MB PDFium/ONNX archives to git.
