# Bundled Tesseract language data

Nassila bundles:

| Language | Pack source | Why |
|----------|-------------|-----|
| `eng`, `fra` | [tessdata_fast](https://github.com/tesseract-ocr/tessdata_fast) 4.1.0 | Speed for Latin scripts |
| `ara` | [tessdata_best](https://github.com/tesseract-ocr/tessdata_best) 4.1.0 | Accuracy for dense Arabic body pages |

Download or refresh the files with:

```bash
npm run ocr:langpacks
```

The script also writes `checksums.sha256` for release verification.

The Tesseract language data is licensed under the Apache License 2.0. Tesseract.js
is also Apache-2.0, and its OCR engine dependency Leptonica is BSD-2-Clause.
See the upstream repositories for their complete license texts.
