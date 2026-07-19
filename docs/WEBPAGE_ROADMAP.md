# Webpage citations — product roadmap

Deterministic and AI-assisted work for **grey-web** and messy webpage references. **Raqim**, **Tasnif**, and **Sharh** are Ouroboros worker modules (`webpage_*`, `issue_explain`); registry verification and citeproc stay in Raqim’s deterministic core — not LLM-replaced.

---

## Baseline and reliability (active)

- HTTP status, content-type, redirect logging
- Dead-link visibility; paywall / archive hints
- Host-specific parsers where stable (prefer code over model)
- Feature flags for AI suggestions

---

## Model-assisted (Ouroboros tasks)

| Scenario | Task id | Notes |
|----------|---------|-------|
| Suggest CSL fields from page signals | `webpage_metadata` | NassilaT [`training/DATASET_SCHEMA.md`](https://github.com/jamalesam93/NassilaT/blob/main/training/DATASET_SCHEMA.md) |
| Platform / grey-literature typing | `webpage_classify` | YouTube, social, Substack, etc. |
| Explain fetch failures to users | `issue_explain` | PDF URL, Cloudflare, dead link |

Train after **Sanad Tier 2** on 12B (`nassila-sanad-12b` **S14**, legacy v1.14) or as facets merged into **`nassila-agent-*`**. Ship checkpoints: E4B **S12**, 12B **S14** — see NassilaT [`OUROBOROS_OPERATOR_MAP.md`](https://github.com/jamalesam93/NassilaT/blob/main/training/OUROBOROS_OPERATOR_MAP.md).

---

## App refinements (no model required)

- OpenAlex consistency when `type` stays `webpage`
- Locale-aware accessed-date copy (i18n)
- Batch re-fetch metadata suggestions

---

## References

- [OUROBOROS.md](./OUROBOROS.md) — unified local model vision
- [`TRAINING.md`](./TRAINING.md) — training lives in NassilaT
- [NassilaT `training/ROADMAP.md`](https://github.com/jamalesam93/NassilaT/blob/main/training/ROADMAP.md) — training phases
- [`src/shared/nassila-agent-tasks.ts`](../src/shared/nassila-agent-tasks.ts) — task id constants
