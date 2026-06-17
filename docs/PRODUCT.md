# Nassila — product brief

Audience-facing product definition for Ouroboros UI reform. Design tokens: [`DESIGN.md`](./DESIGN.md). Brand voice: [`BRAND.md`](./BRAND.md). Agent brief: [`OUROBOROS_CONTEXT.md`](./OUROBOROS_CONTEXT.md).

## Audience

Graduate students and researchers preparing a **submit-ready** thesis or manuscript. Primary need: trust that references are correct and that claims in the draft trace to sources. Bilingual EN/AR; RTL must feel native, not bolted on.

## Product promise

**Verify your references. Ground your claims.** Nassila is the last check before submission — bibliography quality, registry verification, and source-backed writing. AI assists; deterministic layers decide where schemas and registries are authoritative.

## Surface type

**Product** (desktop academic tool) — not a marketing site, not a generic SaaS dashboard. Dense information, calm hierarchy, keyboard-friendly tables, clear error states.

## Seven worker modules (shell IA)

All seven appear in navigation from day one. Maturity varies; stubs use honest empty states, not fake data.

| Worker | Arabic | Module | v1 reform state |
|--------|--------|--------|-----------------|
| **Raqim** | رقيم | References & export | **Live** — migrate current references tab |
| **Tasnif** | تصنيف | Dedupe & risk | **Live** — split predatory/dedup from references |
| **Sanad** | سند | Ground claims | **Live** — new module (not legacy Manuscript Audit) |
| **Sharh** | شرح | Explain issues | **Partial** — deterministic mismatch copy today |
| **Maktab** | مكتب | Manuscript ingest | **Stub** — nav + empty state |
| **Masdar** | مصدر | Source text | **Stub** — Tier 3 dependency |
| **Shahid** | شاهد | Tables & figures | **Disabled** — placeholder |

**Settings** holds one LM Studio slot: `nassila-sanad-e4b` (default), optional `nassila-sanad-12b`. Train checkpoint versions (v1.10, v1.11) appear in docs and model cards only.

## Data flow (Sanad today)

1. User maintains references in **Raqim** (import, verify, export).
2. User runs **Sanad** on a passage + abstract excerpt (paste or future Maktab/Masdar pipeline).
3. Engine applies JSON repair + quote-substring guardrails; LLM is advisory.
4. **Sharh** / **Tasnif** explain verification and risk flags elsewhere in the app.

## Voice

- Academic, precise, student-friendly (see `BRAND.md`).
- Say **AI-assisted**; never imply AI writes citations or replaces registry checks.
- Worker names (Sanad, Raqim, …) are product vocabulary in EN; Arabic labels in AR locale.

## Anti-references (do not ship)

- Retired **Manuscript Audit** tab layout remounted as-is.
- Single “References” mega-tab hiding worker boundaries forever.
- Generic AI SaaS patterns: purple gradients, card-in-card nesting, Inter-only typography, gray text on tinted panels.
- Shipping Sanad on **12B-only** without E4B default tier passing Tier 2.

## Non-goals (v1 reform)

- Full reference manager replacement (Zotero/Mendeley).
- Open-ended thesis generation or drafting pillar.
- Cloud LLM as default; local LM Studio remains the Sanad path.

## Success criteria (UI reform)

- Seven-module shell with RTL parity.
- Sanad panel wired to `nassila-sanad-e4b` / `nassila-sanad-12b` presets.
- Raqim + Tasnif remain fully usable during transition.
- Tier 2b guardrails visible in Sanad results (invalid quotes never show as pass).
