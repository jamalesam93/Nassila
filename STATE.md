# Ouroboros loop state

**Last updated:** 2026-07-20  
**Operator:** Nassila maintainer

Read this at the start of every agent session. Update when focus, blockers, or ship gates change.

---

## Current focus

| Priority | Track | Status |
|----------|-------|--------|
| **P0** | Post-**1.3.1** ops (docs sync, website) | **Done** (app docs + nassila-web roadmap/changelog/train) |
| **P1** | **1.4.0 Raqim Statute** planning / implementation | Next app cut |
| **P1∥** | NassilaT field-note labels; S15 parked | Parallel |

**Latest app:** **1.3.1** (Maktab OCR hardening) — tagged, release notes live; local unpack/installer rebuilt without `ara.traineddata`.

---

## 1.3.1 ship notes (2026-07-20)

| Step | Status |
|------|--------|
| OCR packaging (canvas / Tesseract natives) | **PASS** |
| Arabic Tesseract deferred; eng/fra only; drop `ara` pack (~12 MB) | **PASS** |
| GitHub **v1.3.1** tag + release notes | **PASS** |
| Fresh `build:win` (no ara in `resources/tesseract`) | **PASS** (~151 MB installer) |
| CI lint fix (`no-misleading-character-class`) | **PASS** |

**Locked train:** Phase 0 → 1.2.2…1.3.0 · **1.3.1** OCR hardening · S15 parked

**Next map:** 1.4.0 Raqim Statute → 1.5.0 Raqim Web → 1.6.0 Maktab Loop → 1.7.0 Integrity Bundle → 1.8.0 Shahid (see `docs/Nassila-Ouroboros-Future.md` §5)

**Models:** Sanad **S12** / **S14** — prefer **Ollama** for S14 locally until LM Studio peg-gemma4 is fixed

---

## Blockers

- **S15:** parked — field-note curation (+ optional multi-seed); not blocked on prompt contract.
- Vision/LLM Arabic OCR — deferred; DOCX is the supported Arabic ingest path.

---

## Next actions (ordered)

1. Next product cut: **1.4.0 Raqim Statute** (legislation Resolve beyond EU ELI).
2. Continue field-note labels → export boost JSONL when ready.
3. Start **1.4.0** legislation Resolve scope when ready to cut.
