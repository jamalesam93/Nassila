# Packaged smoke sign-off — Nassila 1.3.0

**Date:** 2026-07-18  
**Build:** `dist-smoke-130/win-unpacked` (alternate output; default `dist/win-unpacked` was file-locked)  
**Operator:** Nassila maintainer

## Automated / packaging checks

| Check | Result |
|-------|--------|
| `electron-builder --dir` unpack | **PASS** → `dist-smoke-130/win-unpacked/Nassila.exe` |
| OCR packs in package (`eng`/`fra`/`ara`) | **PASS** under `resources/tesseract/` |
| Built main has `registry:resolveManuscriptItem` + `connect-src 'self'` | **PASS** (`out/main/index.js`) |
| Built preload exposes `resolveManuscriptRegistry` | **PASS** (`out/preload/index.mjs`) |
| Unit: `tests/unit/packaged-boundary-smoke.test.ts` | **PASS** (`npm test`) |
| Unit: `tests/unit/manuscript-registry-ipc.test.ts` | **PASS** (in suite) |

## Manual GUI smoke (operator)

Detail: [`PACKAGED_AUDIT_SMOKE.md`](./PACKAGED_AUDIT_SMOKE.md)

1. Launch `dist-smoke-130\win-unpacked\Nassila.exe` (not `npm run dev`).
2. Online network; Manuscript surface; short text with ≥1 DOI + matching bibliography.
3. Run audit with **LLM off**.
4. **PASS** if ≥1 DOI finding shows real L1 `pass` / fail / warn (not mass unresolved soft-fail).
5. Optional: attach a local PDF and re-audit one bib key (Masdar attach).

| Step | Result | Notes |
|------|--------|-------|
| Launch packaged exe | **PASS** | `dist-smoke-130` unpack |
| L1/L2 under CSP (LLM off) | **PASS** | L1 Supported; L2 title mismatch; L3 insufficient (Sanad off) |
| Optional attach re-audit | ☐ skipped | Not required for CSP/IPC gate |

**Overall packaged smoke:** ☑ **PASS** · ☐ FAIL · ☐ BLOCKED

## Blocker notes

- Default `dist/win-unpacked/resources/app.asar` was **EBUSY** during packaging; use `dist-smoke-130` or close holders and rebuild into `dist/`.
- GitHub **v1.3.0** release not cut yet — run `npm run build:win` + SHA-256 + `gh release create` when ready to publish.
