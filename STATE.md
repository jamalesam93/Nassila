# Ouroboros loop state

**Last updated:** 2026-07-17  
**Operator:** Nassila maintainer

Read this at the start of every agent session. Update when focus, blockers, or ship gates change.

---

## Current focus

| Priority | Track | Status |
|----------|-------|--------|
| **P0** | App **1.2.1 Masdar UX** — #4b + #4c + #8 + icon I2 | **Shipped locally** (installer built; git tag/push deferred) |
| **P1** | App **1.2.2** — concurrency (#7); optionally #5/#6 | **Next ship** |
| **P2** | **Maktab OCR O2** — golden fixtures, hardware smoke on scanned PDFs | Planned |
| **P3** | S15+ Sanad refinement | Parked until Tier 3 corpus |

**Models on Hub:** Sanad **S12** (E4B default) · **S14** (12B quality). No change with app 1.2.1.

**Licensing:** App remains **MIT / free for all features**. Monetization (if any) deferred — no Free/Pro feature gates.

---

## Product loop stage status

| Stage | Worker | Deterministic | LLM facet | App status |
|-------|--------|---------------|-----------|------------|
| Extract | Maktab | pdf.js + **Tesseract O1** | `doc_extract` planned | **Live** (pdf.js + OCR IPC) |
| Sources | Masdar | OA fetch + `extractFromPdf` | `source_pdf_extract` planned | **Masdar-lite shipped 1.2.0** |
| References | Raqim / Tasnif | L1/L2, citeproc, dedup | planned | Live (bibliography) |
| Ground | Sanad | JSON repair, quote guard | `l3_grounding` | Live |
| Explain | Sharh | i18n mismatch copy | `issue_explain` planned | Deterministic only |
| Evidence | Shahid | — | `table_figure_grounding` | Tier 3+ |

---

## Blockers

- **Tier 3 eval:** needs Maktab/Masdar corpus (NassilaT `PHASE3_TIER3_GROUNDWORK.md`).

---

## Last run

| Date | Action | Result |
|------|--------|--------|
| 2026-07-17 | **Ship 1.2.1 Masdar UX** — local installer (git tag/push deferred) | #4b, #4c, #8, icon I2; #5/#6 deferred |
| 2026-07-15 | **Ship 1.2.0 Masdar-lite** — GitHub Release v1.2.0 | OA PDF grounding, audit N/M, Maktab OCR O1, icon I0/I1 |
| 2026-07-13 | OA-PDF smoke sign-off | PASS (offline + live arXiv) |

---

## Next actions (ordered)

1. **Git:** commit + tag `v1.2.1` + GitHub Release when ready (installer already built locally).
2. **1.2.2 Throughput** — bounded concurrency (#7); optionally attach PDF (#5) / quote chip (#6).
3. **Maktab OCR O2** — golden OCR fixtures + unit tests per `docs/MAKTAB_OCR.md`.
4. Operator hardware smoke: scanned PDF OCR + full Electron audit with Unpaywall + Sanad on OA-PDF cite.
