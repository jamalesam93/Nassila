# O2 OCR golden fixtures

Place scanned PDF fixtures here for Maktab OCR O2 regression:

- `eng-scan-sample.pdf` — English scan
- `ara-scan-sample.pdf` — Arabic scan (RTL)
- `fra-scan-sample.pdf` — French scan

Acceptance: `extractFromPdf(..., { mode: 'ocr_preferred' })` returns non-empty text with `tier: 'ocr'` offline (bundled traineddata).

Fixtures are not committed by default (size); operators attach locally under this folder for smoke.
