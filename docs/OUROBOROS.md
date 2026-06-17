# Nassila Ouroboros — local model strategy

Long-term vision for Nassila’s **local AI** and **post–references-tab UI**: one model identity (one LM Studio slot, one download story) refined over time. The app routes requests to **seven workers** — each a **product module** with a deterministic core plus an optional trainable LLM facet. **v1 trains only the first worker facet: Sanad** (`l3_grounding`); v1.4a is an **adapter checkpoint**, not product ship (see [`OUROBOROS_CONTEXT.md` §5](./OUROBOROS_CONTEXT.md)).

This is a **north star**, not a v1 scope promise.

---

## What Ouroboros means

Workers are **future app modules**, not sidecar LLM tricks. Registry verification, citeproc, predatory lists, dedup, and import parsers stay **authoritative and deterministic** — they **belong inside worker modules** (especially Raqim and Tasnif), not outside Ouroboros.

| Worker module | Deterministic core (stays) | LLM facet (forge when ready) |
|---------------|---------------------------|------------------------------|
| **Sanad** | JSON repair, quote checks | `l3_grounding` — **checkpoint** (v1.4a adapter) |
| **Maktab** | File I/O, ingest routing | `doc_extract` |
| **Masdar** | OA fetch, chunking | `source_pdf_extract` |
| **Shahid** | Region detection (future) | `table_figure_grounding` |
| **Raqim** | L1/L2 verify, import parsers, citeproc export | `webpage_metadata` |
| **Tasnif** | Predatory lists, dedup, type rules | `webpage_classify` |
| **Sharh** | Mismatch copy, i18n | `issue_explain` |

The model **assists**; deterministic layers **decide** where APIs and schemas are authoritative.

```mermaid
flowchart TB
  subgraph future_ui [Future_Nassila_UI_by_worker]
    Maktab[Maktab_ingest]
    Masdar[Masdar_sources]
    Sanad[Sanad_ground]
    Shahid[Shahid_evidence]
    Raqim[Raqim_records]
    Tasnif[Tasnif_classify]
    Sharh[Sharh_explain]
  end
  subgraph ouroboros [Ouroboros_local_model]
    LLM[task_router_by_task_id]
  end
  subgraph engine [Deterministic_core_per_module]
    APIs[registry_citeproc_predatory_dedup_parsers]
    Guards[JSON_repair_quote_checks_caps]
  end
  Maktab --> Masdar --> Sanad --> Shahid
  Raqim --> Tasnif --> Sharh
  future_ui --> LLM
  LLM --> Guards
  engine --> future_ui
  Guards --> Export[Formatted_export]
```

**Today:** deterministic cores live under `src/engine/`; shipping UI is still references-tab-centric. **When Ouroboros is complete:** UI reshaped from scratch around worker flows; engine code reorganized under module boundaries.

**Agent brief:** [`OUROBOROS_CONTEXT.md`](./OUROBOROS_CONTEXT.md).

## Seven pillars (product architecture)

These describe the full Nassila academic loop. **Every pillar maps to one or more worker modules** (§3 in [`OUROBOROS_CONTEXT.md`](./OUROBOROS_CONTEXT.md)). Pillars without a dedicated LLM facet today still ship via **deterministic core** inside those modules.

| # | Pillar | Primary workers | Notes |
|---|--------|-----------------|-------|
| 1 | **Scraping** | Maktab, Masdar, Raqim | Ingest, OA sources, webpage capture |
| 2 | **Analyzing** | Sanad, Tasnif, Shahid | Passage vs excerpt, typing, multimodal evidence |
| 3 | **Thinking** | Sanad, Shahid | Bounded verdict + quote reasoning — not open-ended thesis generation |
| 4 | **Structuring** | Raqim | CSL records, manuscript hierarchy, **citeproc export** |
| 5 | **Drafting** | — | Out of scope for Sanad v1; optional cloud later |
| 6 | **Aligning** | Sanad, Sharh, Tasnif | Schema, repair, explain mismatches, predatory/dedup alignment |
| 7 | **Refining** | Sharh, Raqim | i18n, user-facing polish, formatted bibliography |

Rules **1, 6, and 7** are especially critical on desktop: secure ingest, deterministic alignment, and rendered output quality.

## Workers registry

Stable **`task`** ids in JSONL and code. Seven workers = seven future modules; forge **one LLM facet at a time**. **Agent brief:** [`OUROBOROS_CONTEXT.md`](./OUROBOROS_CONTEXT.md).

| task id | Codename | Module role | LLM facet status | Engine hook (today) |
|---------|----------|-------------|------------------|---------------------|
| `l3_grounding` | **Sanad** (سند) | Ground claims to sources | **Checkpoint** (v1.4a; Tier 2 not met) | [`grounding-llm.ts`](../src/engine/manuscript/grounding-llm.ts) |
| `doc_extract` | **Maktab** (مكتب) | Manuscript ingest | Planned | [`pdf-extract.ts`](../src/engine/manuscript/pdf-extract.ts) |
| `source_pdf_extract` | **Masdar** (مصدر) | Cited source text | Planned | Manuscript audit |
| `table_figure_grounding` | **Shahid** (شاهد) | Table/figure evidence | Planned (12B) | Multimodal |
| `webpage_metadata` | **Raqim** (رقيم) | Reference records + verify + export | Planned | [`WEBPAGE_ROADMAP.md`](./WEBPAGE_ROADMAP.md), verifier, citeproc |
| `webpage_classify` | **Tasnif** (تصنيف) | Type, dedupe, predatory | Planned | Predatory, dedup |
| `issue_explain` | **Sharh** (شرح) | User-facing explanations | Planned | Fetch / paywall errors |

Constants: [`src/shared/nassila-agent-tasks.ts`](../src/shared/nassila-agent-tasks.ts).  
Training pack: [`TRAINING.md`](./TRAINING.md) → [NassilaT `training/`](https://github.com/jamalesam93/NassilaT/tree/main/training).

---

## Worker Sanad (v1)

**Sanad** (`l3_grounding`): manuscript passage vs source excerpt → structured JSON claims (`supported`, `weak`, `contradicted`, `not_in_source`, `insufficient_evidence`) with verbatim `sourceQuotes` when supported.

- **Base model:** Gemma 4 E4B (`google/gemma-4-E4B-it`)
- **Checkpoint adapter:** `nassila-grounding-e4b-v1.4a` (HF; best of v1.4 cycle)
- **Excerpt type (train/eval v1.x):** **abstract-only**; app may pass longer chunks up to 4200 chars at inference ([`grounding-llm.ts`](../src/engine/manuscript/grounding-llm.ts))
- **Product ship:** requires Tier 2 (abstract harness §10) then Tier 3 (Masdar + full-text eval) — see [`OUROBOROS_CONTEXT.md` §5, §10](./OUROBOROS_CONTEXT.md)

---

## Model artifacts (naming)

| Stage | Artifact | Base | Notes |
|-------|----------|------|-------|
| **v1 ship** | `nassila-grounding-e4b-v1` | E4B | First Sanad release |
| **Facet releases** | `nassila-grounding-e4b-v1.2`, … | E4B | Improved Sanad only |
| **Merged Ouroboros (future)** | `nassila-agent-e12b-v1` | 12B+ | Multi-worker + multimodal when ready |

**Rule:** Prefer **one GGUF in LM Studio** with task routing. Separate adapters per worker during R&D; merge before marketing a unified Ouroboros bundle.

**Dual-tier policy (A/B pilot):**

| Tier | Base | Distribution | Role |
|------|------|--------------|------|
| **Default** | Gemma 4 E4B | Q6_K (~8GB-friendly) | Sanad + text workers (Maktab, Masdar, Raqim, Tasnif, Sharh) |
| **Optional high-accuracy** | Gemma 4 12B | Q4_K_M → Q8_0 quant ladder | Sanad if A/B gates pass; **Shahid** multimodal regardless |

E4B remains the default download. 12B is offered only when the [A/B pilot](https://github.com/jamalesam93/NassilaT/blob/main/training/PHASE2_9_AB_PILOT_WALKTHROUGH.md) shows ≥3 pt combined-expect gain, `multi_claim` ≥80%, and quote validity ≥ E4B-Q6. Until then, iterate Sanad on E4B; forge Shahid on 12B when that worker starts.

---

## Training strategy

1. **Forge one worker at a time** — train/eval each `task` with its own JSONL and go/no-go.
2. **Shared discipline** — JSON strictness, eval harness, system + user chat template alignment.
3. **Merge when ready** — multi-task JSONL → single `nassila-agent-*` GGUF.
4. **Eval on Vast before home download** — bandwidth-saving workflow for GGUF.

---

## Distribution

- Do **not** bundle multi-GB GGUF in the installer.
- Host on **Hugging Face** (GGUF public; adapters optional).
- **Bring your own file** or in-app resumable download ([`BRAND.md`](./BRAND.md)).

---

## Deprecated name

**One Ring** was the earlier name for this strategy. See stub [`ONE_RING.md`](./ONE_RING.md) → this document.

---

## Related docs

| Doc | Role |
|-----|------|
| [`TRAINING.md`](./TRAINING.md) | **Training redirect** — all corpus/QLoRA/Vast work in NassilaT |
| [`OUROBOROS_CONTEXT.md`](./OUROBOROS_CONTEXT.md) | **Agent entry point** — workers, tiered ship gates, v1.5 planning |
| [`training/ROADMAP.md`](https://github.com/jamalesam93/NassilaT/blob/main/training/ROADMAP.md) | Training phases (NassilaT) |
| [`WEBPAGE_ROADMAP.md`](./WEBPAGE_ROADMAP.md) | Webpage + app work |
| [`BRAND.md`](./BRAND.md) | Product naming (sanad framing) |
