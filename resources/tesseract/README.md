# Bundled Tesseract language data

Nassila bundles **Latin** OCR packs only:

| Language | Pack source | Why |
|----------|-------------|-----|
| `eng`, `fra` | [tessdata_fast](https://github.com/tesseract-ocr/tessdata_fast) 4.1.0 | Enhanced OCR for scanned Latin PDFs |

Arabic Tesseract is **deferred** (prefer DOCX; vision/LLM OCR planned). Do not ship `ara.traineddata` until that lands.

Download or refresh the files with:

```bash
npm run ocr:langpacks
```

The script also writes `checksums.sha256` for release verification and removes any leftover `ara.traineddata`.

The Tesseract language data is licensed under the Apache License 2.0. Tesseract.js
is also Apache-2.0, and its OCR engine dependency Leptonica is BSD-2-Clause.
See the upstream repositories for their complete license texts.
