# Packaged manuscript audit smoke (CSP / IPC)

Production renderer CSP sets `connect-src 'self'`. Manuscript L1/L2 run in main via audit IPC:

- `manuscriptAudit:start` (owns `resolveRegistry` / align in main)
- `registry:resolveManuscriptItem` / `registry:alignManuscriptMetadata` (also exposed)

## Sign-off for 1.3.0

See [`PACKAGED_SMOKE_SIGNOFF_1.3.0.md`](./PACKAGED_SMOKE_SIGNOFF_1.3.0.md) for packaging results and the GUI checklist.

| Field | Value |
|-------|-------|
| **Date** | 2026-07-18 |
| **Build** | `dist-smoke-130/win-unpacked/Nassila.exe` |
| **Operator** | Nassila maintainer |
| **Network** | Online |
| **LLM / Sanad** | Off |
| **Result** | **PASS** |

### Observed (LLM-off manuscript audit)

| Layer | Result | Notes |
|-------|--------|-------|
| L1 registry | **Supported / pass** | Real registry hit under CSP (not mass unresolved soft-fail) |
| L2 metadata | **Title mismatch** | Expected compare outcome; proves align ran in main |
| L3 grounding | **Insufficient** | Sanad off — no false L3 pass |

### Checklist

| Step | Result |
|------|--------|
| Unpack / launch packaged exe (not `npm run dev`) | **PASS** |
| Short manuscript + ≥1 DOI + matching bibliography | **PASS** |
| Audit with LLM off | **PASS** |
| ≥1 DOI finding shows real L1 pass/fail/warn | **PASS** |
| Optional Masdar attach re-audit | ☐ skipped |

**CSP/IPC verdict:** production `connect-src 'self'` does **not** block manuscript L1/L2 when audit runs via main-process IPC.

## Manual packaged smoke (Windows)

1. `npm run build` then unpack (`npm run build:unpack`, or `npx electron-builder --dir --win --x64 --config.directories.output=dist-smoke-130` if `dist/win-unpacked` is locked).
2. Launch the unpacked app (not `npm run dev` — CSP is skipped in dev).
3. Load a short manuscript with ≥1 DOI citation and a matching bibliography.
4. Ensure network is online; run Manuscript audit with LLM off.
5. **Pass:** at least one finding shows L1 registry `pass` or a real registry fail/warn (not mass “unresolved” soft-fail from blocked `fetch`).
6. **Fail:** every DOI row stays unresolved with no network errors surfaced.

Automated coverage: `tests/unit/manuscript-registry-ipc.test.ts`, `tests/unit/packaged-boundary-smoke.test.ts`. Full Electron packaged E2E is not in CI yet.
