# Nassila — design system

Visual and interaction rules for Ouroboros UI. Product scope: [`PRODUCT.md`](./PRODUCT.md). Brand: [`BRAND.md`](./BRAND.md).

## Lane

**Product** — desktop Electron app, not marketing. Feels like a serious bibliography and manuscript-audit workstation, not a startup landing page or generic AI SaaS dashboard.

## Ouroboros layout (loop-first)

**Primary surface:** one integrated manuscript audit flow — manuscript up, cited sources down, audit results and explanations inline, export at the end. See [`PRODUCT.md`](./PRODUCT.md) § Ouroboros loop.

**Not Hydra:** do not design seven equal destinations that force the user to assemble the workflow. Worker codenames may appear as stage labels, breadcrumbs, or an **advanced** nav — never as seven peer “apps” with duplicate empty states.

| Surface | Rule |
|---------|------|
| Main loop | Upload → sources → audit → explain → export on one coherent screen or stepped flow |
| Bibliography mode | Table-first Raqim layout for import/verify/export without a manuscript |
| Worker nav (if shown) | Secondary or advanced; pipeline position, not product identity |
| Stubs | One honest gap in the pipeline (“source PDFs — planned”), not a standalone fake app |
| Sanad (bridge) | Manual paste is advanced/dev; loop-fed grounding is the default when Maktab/Masdar ship |

- **Raqim** / **Tasnif**: table-first; filters as toolbar, not nested cards.
- **Sanad** (in loop): claim list with verdict chips and expandable quotes tied to cite sites.
- Spacing rhythm: 4px base; avoid “card inside card inside card” for every row.

## Impeccable discipline

Nassila UI must not read as AI-generated slop. Study [Impeccable](https://github.com/pbakaus/impeccable) anti-patterns; apply the **product** register (tool UI, not marketing site). Do **not** copy Impeccable’s visual identity — adopt its craft rules.

### Product UI principles

- Dense, calm, task-first; bibliography and audit tables are the hero.
- Every visual element earns its place in the manuscript workflow.
- Strong contrast: body and placeholder text ≥4.5:1 on backgrounds; muted text is not an excuse for illegibility.
- Purposeful restraint: no decoration without function.

### Absolute bans (AI-template tells)

Match-and-refuse — if you are about to ship these, rewrite:

- Purple-to-blue gradient headers, glassmorphism cards, neon glows.
- Inter / Arial / system-ui-only as the entire typographic identity.
- Identical card grids (icon + heading + blurb repeated for every section).
- Nested cards; cards as the lazy default for every row.
- Rounded-square icon tile above every section title.
- Tiny uppercase tracked eyebrows above every heading (“PLANNED”, “WORKERS”, …).
- Hero-metric layouts (big number + small label + gradient accent).
- Gray helper text on saturated or tinted button/banner backgrounds.
- Over-rounded panels (cards >16px radius; decorative 24–32px “friendly” rounding).
- `border` + wide soft `box-shadow` “ghost cards” on the same element.
- Bounce or elastic easing on productivity UI.
- Fake progress, sparklines, or “AI is thinking” theatrics on stubs.

### Typography

- Distinctive but readable sans for UI chrome; separate face for citation text; monospace for DOI/PMID/JSON debug.
- Do **not** default to Inter, Arial, or system-ui-only stacks.
- Cap body line length ~65–75ch in prose panels.
- EN and AR: generous line-height for RTL; test mixed Latin + Arabic in table cells.

### Color

- Tint neutrals (no pure `#000` / flat `#888` on colored backgrounds).
- Status colors: verified, warn, error, predatory — distinct hues, sufficient contrast in light and dark.
- Accent sparingly; no gradient heroes.

## Components

| Pattern | Rule |
|---------|------|
| Reference row | One surface; inline actions; formatted preview via citeproc |
| Verdict chip | `supported` / `weak` / `contradicted` / `not_in_source` / `insufficient_evidence` — color + label i18n |
| Pipeline gap | One sentence + “planned” in context of the loop; no standalone stub app chrome |
| Empty state | Actionable (upload manuscript, import bibliography, connect LM Studio) |
| Settings LM slot | Default `nassila-sanad-e4b` (S12); optional quality `nassila-sanad-12b` (S14) |

## Motion

- Subtle transitions only (panel open, row expand). No bounce/elastic easing.
- Respect `prefers-reduced-motion`.

## RTL

- Mirror nav and table action columns; keep DOI/URL LTR in isolates.
- Worker names: codename in EN UI; Arabic script in AR UI (`BRAND.md` table).

## Accessibility

- Table keyboard navigation; focus rings on interactive cells.
- Verdict chips never color-only — always text label.

## UI acceptance criteria

Before shipping renderer changes:

- [ ] Loop-first or bibliography-mode — not Hydra peer tabs as the only entry.
- [ ] Table-first reference surfaces where applicable.
- [ ] No nested-card nesting for routine rows.
- [ ] Contrast checked on muted/placeholder text.
- [ ] EN/AR parity for new strings.
- [ ] No items from **Absolute bans** above.
- [ ] Stubs honest; no fake progress.

## Implementation note

Renderer lives under `src/renderer/`; reuse existing i18n JSON (`en` / `ar`). Extend the Ouroboros loop per this spec and `PRODUCT.md`.
