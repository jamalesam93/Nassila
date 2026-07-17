# Ouroboros loop state

**Last updated:** 2026-07-18  
**Operator:** Nassila maintainer

Read this at the start of every agent session. Update when focus, blockers, or ship gates change.

---

## Current focus

| Priority | Track | Status |
|----------|-------|--------|
| **P0** | App **1.2.2 Throughput** — concurrency (#7) only | **Next ship** |
| **P1** | App train — **1.2.3 Quote chip** (#6+#15) → **1.2.4 Masdar attach** (#5) → Raqim **1.2.5–1.2.6** → TBD **1.2.7–1.2.9** → **1.3.0 Sharh-lite** | Planned |
| **P1∥** | **Maktab OCR O2** — golden fixtures, hardware smoke (parallel; any 1.2.x) | Parallel |
| **P2∥** | **S15+** Sanad refinement (NassilaT; parallel with 1.2.x / 1.3.0) | Parked until Tier 3 corpus |

**Latest app:** **1.2.1 Masdar UX** — [GitHub Release v1.2.1](https://github.com/jamalesam93/Nassila/releases/tag/v1.2.1).

**Locked release train**

```text
1.2.2  Throughput       #7
1.2.3  Quote chip       #6 + #15
1.2.4  Masdar attach    #5 (+ re-audit this ref)
1.2.5  Raqim Repair     #14
1.2.6  Raqim Resolve    #14b
1.2.7–1.2.9  TBD
1.3.0  Sharh-lite       #9–11
∥      Maktab OCR O2    parallel
∥      S15+             NassilaT parallel
```

**Models on Hub:** Sanad **S12** (E4B default) · **S14** (12B quality). No change with app 1.2.1.

**Licensing:** App remains **MIT / free for all features**. Monetization (if any) deferred — no Free/Pro feature gates.

---

## Product loop stage status

| Stage | Worker | Deterministic | LLM facet | App status |
|-------|--------|---------------|-----------|------------|
| Extract | Maktab | pdf.js + **Tesseract O1** | `doc_extract` planned | **Live**; **O2** parallel fixtures/smoke |
| Sources | Masdar | OA fetch + `extractFromPdf` | `source_pdf_extract` planned | **Masdar-lite 1.2.0** + UX **1.2.1**; attach → **1.2.4** |
| References | Raqim / Tasnif | L1/L2, citeproc, dedup | planned | Live; Repair **1.2.5** / Resolve **1.2.6** |
| Ground | Sanad | JSON repair, quote guard | `l3_grounding` | Live; quote chip UI → **1.2.3** |
| Explain | Sharh | i18n mismatch copy | `issue_explain` planned | Deterministic; Sharh-lite → **1.3.0** |
| Evidence | Shahid | — | `table_figure_grounding` | Tier 3+ |

---

## Blockers

- **Tier 3 eval:** needs Maktab/Masdar corpus (NassilaT `PHASE3_TIER3_GROUNDWORK.md`).

---

## Last run

| Date | Action | Result |
|------|--------|--------|
| 2026-07-18 | **Lock release train** — 1.2.2→1.3.0; OCR O2 + S15+ parallel | Docs aligned |
| 2026-07-17 | **Ship 1.2.1 Masdar UX** — [GitHub Release v1.2.1](https://github.com/jamalesam93/Nassila/releases/tag/v1.2.1) | #4b, #4c, #8, icon I2 |
| 2026-07-15 | **Ship 1.2.0 Masdar-lite** — GitHub Release v1.2.0 | OA PDF grounding, audit N/M, Maktab OCR O1, icon I0/I1 |
| 2026-07-13 | OA-PDF smoke sign-off | PASS (offline + live arXiv) |

---

## Next actions (ordered)

1. **1.2.2 Throughput** — bounded concurrency (#7) only.
2. **1.2.3 Quote chip** — #6 + #15 header wordmark.
3. **1.2.4 Masdar attach** — #5 + single-`bibKey` re-audit.
4. **∥ Parallel:** Maktab OCR O2 fixtures/smoke whenever bandwidth allows.
5. Then **1.2.5–1.2.6** Raqim → TBD **1.2.7–9** → **1.3.0** Sharh-lite; **∥ S15+** on NassilaT when Tier 3 corpus exists.
