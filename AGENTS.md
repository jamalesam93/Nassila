# AGENTS.md — Nassila

Guidance for coding agents working on this repository. End-user documentation lives in [README.md](README.md), [docs/USER_GUIDE.md](docs/USER_GUIDE.md), and [docs/HOW_TO_GUIDE.md](docs/HOW_TO_GUIDE.md).

## Project summary

**Nassila** is an Electron desktop app (Windows-first) for bibliography quality: import or paste references, validate offline, autocorrect common issues, verify against Crossref / PubMed / OpenAlex (L1 resolve + L2 metadata compare), flag predatory journals, deduplicate, and export via CSL/citeproc.

- **Offline by default:** editing, validation, formatting, and dedup do not require network.
- **Network on demand:** registry verification, DOI lookup, predatory-list sync, and optional LLM calls only when the user runs those actions.
- **Canonical model:** `CslItem` in [`src/engine/types.ts`](src/engine/types.ts) — keep engine logic aligned with this shape.

In-app LLM (L3 manuscript grounding, Gemma via LM Studio) powers the **Manuscript** (Ouroboros loop) surface; training and eval live in **NassilaT** — see [`docs/TRAINING.md`](docs/TRAINING.md) and [`src/renderer/settings/llm-presets.ts`](src/renderer/settings/llm-presets.ts).

## Repository map

| Path | Role |
|------|------|
| [`src/engine/`](src/engine/) | Domain logic: parser, formatter (CSL), resolver, verifier, dedup, validator, autocorrect, predatory, import, manuscript/audit hooks |
| [`src/renderer/`](src/renderer/) | React 19 UI, Zustand stores, i18n, panels |
| [`src/main/`](src/main/) | Electron main process, menus, IPC handlers |
| [`src/preload/`](src/preload/) | `contextBridge` API exposed as `window.api` |
| [`src/shared/`](src/shared/) | Types and constants shared across processes |
| [`tests/unit/`](tests/unit/) | Vitest unit tests |
| [`docs/`](docs/) | User and maintainer markdown |
| [`scripts/`](scripts/) | Icons, predatory bundle, Cursor skills installer |

Build output: `out/` (electron-vite), `dist/` (installers). Do not edit generated output.

## Architecture invariants

1. **Process boundaries**
   - Put citation/registry/business logic in `src/engine/` (importable from main and tests).
   - Renderer must not use Node APIs directly; use IPC via preload (`window.api`).
   - Register new IPC in [`src/main/ipc-handlers.ts`](src/main/ipc-handlers.ts) and expose in [`src/preload/index.ts`](src/preload/index.ts).

2. **Data**
   - Reference rows are `CslItem`; avoid parallel ad-hoc citation shapes in engine code.
   - Shared limits and flags live in `src/shared/` (e.g. [`verification-limits.ts`](src/shared/verification-limits.ts)).

3. **Formatting**
   - Bibliography output goes through citeproc ([`src/engine/formatter/citeproc-wrapper.ts`](src/engine/formatter/citeproc-wrapper.ts)) and bundled/extended styles — do not hand-build formatted reference strings in product code.

4. **Tests**
   - Engine tests use Vitest with `@engine` alias ([`vitest.config.ts`](vitest.config.ts)).
   - Default test environment is `node`; renderer tests use jsdom when needed.

## Domain rules

### Parsing (`src/engine/parser/`)

- Entry: [`parser/index.ts`](src/engine/parser/index.ts) sniffs BibTeX, RIS, CSL-JSON, plain text; heavy paths include `plain-text.ts` and `document.ts`.
- Manager imports: [`src/engine/import/`](src/engine/import/) (Zotero, Mendeley, EndNote).
- Add or change parsers with matching coverage in `tests/unit/`.

### Verification (`src/engine/verifier/`)

- Unified L1+L2 flow: [`verify-and-apply.ts`](src/engine/verifier/verify-and-apply.ts).
- **Cap:** [`MAX_VERIFICATION_ITEMS`](src/shared/verification-limits.ts) = **200** rows per run; DOI/PMID rows are prioritized first.
- Resolvers per provider under [`src/engine/resolver/`](src/engine/resolver/); HTTP via [`src/engine/network/http.ts`](src/engine/network/http.ts).

### Predatory journals (`src/engine/predatory/`)

- Bundled lists plus optional sync; IPC for updates from main process.

### Manuscript / L3 / Ouroboros (shipping)

- **Ouroboros, not Hydra** — one manuscript audit loop (upload → sources → audit → explain → export). Workers are **stages**, not seven peer destinations. Read [`docs/PRODUCT.md`](docs/PRODUCT.md) before any UI work. The current seven-item worker nav is **transitional scaffolding**, not end-state IA.
- **Shipping UI:** [`OuroborosLoopWorkspace`](src/renderer/components/loop/OuroborosLoopWorkspace.tsx) mounts when `appSurface === 'loop'` (default) in [`WorkerShell`](src/renderer/components/workers/WorkerShell.tsx). **Bibliography** mode (`appSurface === 'bibliography'`) is [`RaqimWorkspace`](src/renderer/components/workers/RaqimWorkspace.tsx).
- **Ouroboros** ([`docs/OUROBOROS.md`](docs/OUROBOROS.md), agent brief [`docs/OUROBOROS_CONTEXT.md`](docs/OUROBOROS_CONTEXT.md)): seven workers as loop stages and code modules. **Sanad** `nassila-sanad-e4b` **S12** (default) / `nassila-sanad-12b` **S14** (quality); v1.13 **NO-GO** — NassilaT [`OUROBOROS_OPERATOR_MAP.md`](https://github.com/jamalesam93/NassilaT/blob/main/training/OUROBOROS_OPERATOR_MAP.md) (app release train + FEATURES backlog in § G). Task ids: [`src/shared/nassila-agent-tasks.ts`](src/shared/nassila-agent-tasks.ts). **Training:** [`docs/TRAINING.md`](docs/TRAINING.md) → NassilaT.
- **Impeccable UI rule** — before renderer/UI changes, read [`docs/DESIGN.md`](docs/DESIGN.md) § Impeccable discipline. Reject AI-template tells: purple gradients, nested cards, Inter-only typography, identical card grids, gray-on-tinted muted text, hero metrics, decorative glass, fake progress on stubs.
- Engine code under `src/engine/manuscript/` (grounding JSON, PDF extract, segments, verify) backs the loop; security controls SEC-01–06 apply to network + LLM paths in production.
- Grounding schema and parsing: [`grounding-llm.ts`](src/engine/manuscript/grounding-llm.ts), [`grounding-json-repair.ts`](src/engine/manuscript/grounding-json-repair.ts).
- Training pack: [`docs/TRAINING.md`](docs/TRAINING.md) → [NassilaT](https://github.com/jamalesam93/NassilaT).

## Dev environment

**Prerequisites:** Node.js 18+, npm 9+

```bash
npm install
npm run dev          # electron-vite dev (not plain Vite)
npm test             # vitest run
npm run test:watch   # vitest watch
npm run lint         # ESLint on src/ and tests/
```

**Windows installer:**

```bash
npm run icon:raster   # once: build/icon.png
npm run build
npm run build:win
```

Other: `build:mac`, `build:linux`, `build:unpack`, `preview`.

## i18n

- **Renderer:** [`src/renderer/i18n/`](src/renderer/i18n/) — English and Arabic; RTL on `<html>` when Arabic is active.
- **Native menus:** [`src/main/menu-i18n.ts`](src/main/menu-i18n.ts).
- New user-visible strings usually need **both** renderer JSON and menu entries where applicable.
- **Arabic governance:** [docs/AR_I18N_GLOSSARY.md](docs/AR_I18N_GLOSSARY.md); agent skill [`.cursor/skills/nassila-arabic/SKILL.md`](.cursor/skills/nassila-arabic/SKILL.md); rule [`.cursor/rules/arabic-i18n.mdc`](.cursor/rules/arabic-i18n.mdc). **Ask the user before applying Arabic wording changes** — present EN, proposed AR, and rationale.
- **Key parity:** `tests/unit/i18n-key-parity.test.ts` — EN and AR `translation.json` must share the same key tree.

## Optional agent tooling

- **Generic Cursor skills:** `npm run skills:install` (downloads to `.cursor/skills/`, gitignored except project skill below).
- **Antigravity audit skills (curated):** `npm run skills:install:antigravity` — see `.cursor/skills/ANTIGRAVITY-SKILLS.md` and [SECURITY-FIX-PLAN.md](docs/SECURITY-FIX-PLAN.md).
- **Nassila engine skill:** [`.cursor/skills/nassila/SKILL.md`](.cursor/skills/nassila/SKILL.md) — use when editing parser, verifier, formatter, or resolver code.

## Change discipline

- Keep diffs **minimal** and scoped to the task; match existing naming and patterns.
- **Ouroboros product:** do not add Hydra-style peer worker tabs or ask users to copy manuscript text between modules; prefer loop-first UI per `PRODUCT.md`.
- **UI craft:** follow `DESIGN.md` Impeccable discipline; product workstation, not AI SaaS chrome.
- Run `npm test` and `npm run lint` before considering work done.
- **Ouroboros engineering loop:** [`LOOP.md`](LOOP.md), [`STATE.md`](STATE.md), [`docs/MAKTAB_OCR.md`](docs/MAKTAB_OCR.md) — read at session start for pipeline/OCR work.
- Add or update unit tests for engine behavior you change; **new IPC handlers** need matching validation tests under `tests/unit/` (see `docs/SECURITY-FIX-PLAN.md` preload inventory).
- Do **not** commit secrets (`.env`, API keys), large model weights, or `out/` / `dist/` artifacts.
- Do not duplicate README marketing copy here; link to user docs for product behavior.

## Product docs (users)

- [How-to guide](docs/HOW_TO_GUIDE.md)
- [User guide](docs/USER_GUIDE.md)
- [Changelog](CHANGELOG.md)
- [Ouroboros local model strategy](docs/OUROBOROS.md) (future-facing)
- [Ouroboros agent brief](docs/OUROBOROS_CONTEXT.md) — **start here for v1.5+ / worker planning**
- [Training (NassilaT)](docs/TRAINING.md) — corpus, QLoRA, Vast; not in this repo
- [Dead code inventory](docs/DEAD-CODE.md) — unmounted UI, debug leftovers, legacy IPC
- [Webpage citations roadmap](docs/WEBPAGE_ROADMAP.md) (future-facing)
