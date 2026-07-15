# Nassila Ouroboros — loop engineering

**Purpose:** Durable operator loop for building the Ouroboros manuscript pipeline across Nassila + NassilaT.  
**Inspiration:** [loop-engineering](https://github.com/cobusgreyling/loop-engineering) (MIT) — patterns only; not a runtime dependency.

**Product loop** (user-facing): upload → Maktab → Masdar → Raqim/Tasnif → Sanad → Sharh → export.  
**Engineering loop** (this file): discover → implement → verify → persist → gate.

---

## Cadence

| When | Action | Owner |
|------|--------|-------|
| Start of session | Read [`STATE.md`](./STATE.md) + NassilaT [`training/OUROBOROS_OPERATOR_MAP.md`](../NassilaT/training/OUROBOROS_OPERATOR_MAP.md) | Agent / operator |
| Before ship | `npm test` + `npm run lint` (Nassila); eval gates (NassilaT) | CI / operator |
| After meaningful work | Update `STATE.md` + append [`docs/loop-run-log.md`](./docs/loop-run-log.md) | Agent / operator |
| PR / release | Check phase checklist in operator map | Operator |

Optional readiness audit (dev only):

```bash
npm run loop:audit
```

---

## Five primitives + memory (Nassila mapping)

| Primitive | Nassila artifact |
|-----------|------------------|
| **Automations** | `npm test`, GitHub Actions, NassilaT eval scripts |
| **Worktrees** | Feature branches; `best-of-n-runner` for risky experiments |
| **Skills** | `.cursor/skills/nassila*`, `AGENTS.md`, `OUROBOROS_CONTEXT.md` |
| **Connectors** | IPC (`window.api`), registry HTTP in main only |
| **Sub-agents** | Deterministic verifier (maker) vs Sanad LLM (checker assist) |
| **Memory** | [`STATE.md`](./STATE.md), operator map, [`patterns/ouroboros-registry.yaml`](./patterns/ouroboros-registry.yaml) |

---

## Product loop stages (authoritative registry)

Stage ids and code hooks live in [`src/shared/ouroboros-loop-stages.ts`](./src/shared/ouroboros-loop-stages.ts) and [`patterns/ouroboros-registry.yaml`](./patterns/ouroboros-registry.yaml).

```
Upload → Maktab (extract) → Masdar (sources) → Raqim/Tasnif (refs)
     → Sanad (ground) → Sharh (explain) → Export
```

**Maker/checker rule:** deterministic engine layers decide; LLM facets assist only. See `docs/OUROBOROS_CONTEXT.md` §2.

---

## Gates (do not skip)

| Gate | Criterion | Doc |
|------|-----------|-----|
| **Tier 2 model** | Sanad abstract harness §10 | NassilaT `OUROBOROS_CONTEXT` §10 |
| **Tier 2b product** | No false `pass` on invalid quotes | `grounding-llm.ts` |
| **Tier 3 product** | Maktab ingest + Masdar body-text in loop | Operator map § F |
| **Maktab OCR v1** | pdf.js path + OCR interface; Tesseract backend optional | `docs/MAKTAB_OCR.md` |
| **SEC** | New IPC validated in tests | `docs/SECURITY-FIX-PLAN.md` |

---

## Safety

- No manuscript text in OS notifications or external logs.
- Renderer never calls Node/network directly — IPC only.
- OCR and extraction stay **on-device** by default; cloud is a future optional track.
- Arabic copy changes require glossary review (`docs/AR_I18N_GLOSSARY.md`).

---

## Related

| Doc | Role |
|-----|------|
| [`STATE.md`](./STATE.md) | Current focus + blockers |
| [`docs/MAKTAB_OCR.md`](./docs/MAKTAB_OCR.md) | Maktab OCR plan (EN/AR/FR) |
| [`docs/OUROBOROS_CONTEXT.md`](./docs/OUROBOROS_CONTEXT.md) | Workers + tiers |
| NassilaT `OUROBOROS_OPERATOR_MAP.md` | Cross-repo operator checklist |
