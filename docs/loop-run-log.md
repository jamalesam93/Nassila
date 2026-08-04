# Loop run log

Append-only log of engineering-loop runs (agent or operator). Not user-facing.

Format: `YYYY-MM-DD | actor | action | outcome | notes`

---

| Date | Actor | Action | Outcome | Notes |
|------|-------|--------|---------|-------|
| 2026-07-01 | agent | Loop scaffold: `LOOP.md`, `STATE.md`, `patterns/ouroboros-registry.yaml`, `ouroboros-loop-stages.ts` | done | loop-engineering patterns adapted |
| 2026-07-01 | agent | Maktab OCR module: `src/engine/maktab/` + `docs/MAKTAB_OCR.md` | done | pdf.js tier wired; Tesseract backend stub |
| 2026-07-01 | agent | NassilaT `OUROBOROS_OPERATOR_MAP.md` — OCR plan in pipeline map | done | § Maktab OCR track |
| 2026-07-15 | agent | **Ship 1.2.0 Masdar-lite** — commit `f4b84bc`, tag `v1.2.0`, push `main` | done | 260 tests pass; installer `dist/Nassila Setup 1.2.0.exe` (~152 MB); attach on GitHub Releases (gh CLI not on machine) |
| 2026-07-17 | agent | **Ship 1.2.1 Masdar UX** — commit `402a338`, tag `v1.2.1`, push `main` | done | audit progress panel, DOI↔title manual resolve, shortcuts, icon polish |
| 2026-07-18 | agent | Lock post-1.2.1 release train through 1.3.0 | done | commit `90d1fda`; docs aligned with public ship status |
| 2026-07-20 | agent | **Ship 1.3.0 Ouroboros train** — commit `8cb97b4`, tag `v1.3.0` | done | Throughput + Evidence integrity + Raqim Repair through Sharh-lite |
| 2026-07-20 | agent | **Ship 1.3.1 Maktab OCR hardening** — commit `e91f37e`, tag `v1.3.1` | done | canvas/napi-rs packaging, IPC clone errors, Arabic OCR deferral, 50→200 soft OCR budget |
| 2026-07-21 | agent | **Ship 1.4.0 Raqim Statute** — commit `85207c6`, tag `v1.4.0` | done | legislation catalogue, statute import, Masdar chunking, preflight+, submission integrity bundle |
| 2026-07-29 | agent | **Ship 1.5.0 Raqim Web** — commit `e9d3a49` (notes), tag `v1.5.0` | done | Maktab Tier A Rust WASM, Raqim Web resolver, Wayback fallback; Sanad default → `nassila-sanad-4b` S15 (commits `968c24f`–`780b784` 2026-08-02) |
| 2026-08-03 | agent | Hygiene sweep: dead-code inventory, STATE.md refresh, Windows CI job (`package-windows` + `probe:ocr`), Tier-4 wiring, `~/.citations-style` → `~/.nassila` migration, `*.tsbuildinfo` gitignore | done | uncommitted working-tree items + README/acknowledgments commit `918db40` |
| 2026-08-03 | agent | **Split loop monolith panels** + component tests | done | `OuroborosLoopWorkspace` (~1,100) → orchestrator (~120) + `LoopEditorPane` (~370) + `LoopSourcesPanel` (~170); `LoopAuditDetail` (~580) → ~210 + `LoopVerdictUi` (~230); `SharhLitePanel` already ~140 (kept); jsdom tests `loop-workspace.test.tsx` + `sharh-lite-panel.test.tsx` added |
