# Nassila UI Audit — Brutal Dissection & Remediation Plan

**Date:** 2026-06-21
**Scope:** Renderer UI — visual design, information architecture, component quality, accessibility, and adherence to `DESIGN.md`.

---

## Executive Summary

Nassila is a functional bibliography workstation with solid domain logic, but its UI currently reads as a **shadcn/ui starter template with content poured in** — not a differentiated, purpose-built tool. The `DESIGN.md` rules exist and are well-written, but the implementation violates several of its own bans. The overall impression from the screenshots: generic, cluttered in places, empty in others, with no typographic or visual personality.

This audit covers **visual design, information architecture, component quality, accessibility, and adherence to your own DESIGN.md spec**, followed by a prioritized remediation plan.

---

## Part 1: Brutal Findings

### 🔴 CRITICAL — Self-Violations of DESIGN.md

Your DESIGN.md has explicit bans. The code ships violations.

#### 1. TasnifWorkspace hero-metric cards

**File:** `src/renderer/components/workers/TasnifWorkspace.tsx` (lines 82–96)

Three identical cards in a grid with `text-3xl font-semibold tabular-nums` large numbers, a label, and a body description:

```tsx
<span className="text-3xl font-semibold tabular-nums text-foreground">{card.count}</span>
<span className="mt-2 font-medium text-foreground">{t(card.titleKey)}</span>
<span className="mt-1 text-sm text-muted-foreground">{t(card.bodyKey)}</span>
```

**DESIGN.md bans:**

> *"Hero-metric layouts (big number + small label + gradient accent)"*

> *"Identical card grids (icon + heading + blurb repeated for every section)"*

This is literally the exact banned pattern — three copies.

---

#### 2. StubWorkerPanel uppercase eyebrow

**File:** `src/renderer/components/workers/StubWorkerPanel.tsx` (line 16)

```tsx
<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
```

**DESIGN.md bans:**

> *"Tiny uppercase tracked eyebrows above every heading ("PLANNED", "WORKERS", …)"*

---

#### 3. Nested cards in OutputPanel

**File:** `src/renderer/components/OutputPanel.tsx` (lines 244–319+)

Every citation is rendered as a `rounded-md border ... p-3` card. Inside that card, metadata chips, DOI links, duplicate badges, predatory badges, and issue lists are nested — all fighting for attention in a dense `text-xs` space.

```tsx
<div className={`rounded-md border ${styles.border} ${styles.bg} p-3 ...`}>
  {/* title, authors, container, publisher, genre, event-title, URL, DOI, chips, issues */}
</div>
```

**DESIGN.md bans:**

> *"Nested cards; cards as the lazy default for every row"*

> *"Spacing rhythm: 4px base; avoid 'card inside card inside card' for every row"*

---

### 🔴 CRITICAL — Toolbar Vertical Bulk

#### 4. Three-row toolbar eats ~130px before any content

**File:** `src/renderer/components/Toolbar.tsx` (lines 79–215)

| Row | Content | Problem |
|-----|---------|---------|
| 1 | Brand header (h1 + subtitle) | Wastes prime vertical real estate. On a desktop productivity app, the user knows what app they're using. |
| 2 | WorkflowStrip — four pipeline pills (Import → Parse → Verify → Export) | Decorative scaffolding. In a bibliography tool, the "pipeline" is: paste/import → see results. Users don't think in 4 stages. |
| 3 | Action buttons (Import, Verify, Export, More dropdown) | The only row that does real work, but it's buried below two rows of chrome. |

Combined with the StatusBar (~30px), that's **~160px of chrome before a single citation appears**. On a 768px-tall laptop screen, that's **21% of the viewport** gone to controls.

---

### 🟠 HIGH — Information Density & Clutter

#### 5. OutputPanel citation cards are visually chaotic

**File:** `src/renderer/components/OutputPanel.tsx` (lines 244–380+)

Each card can display **10+ distinct visual elements simultaneously**:

1. Status dot (colored circle)
2. Title (bold text)
3. Authors + year (muted text)
4. Container title + volume + issue + page (italic muted)
5. Publisher + place (muted)
6. Genre tag (dimmer muted)
7. Event title (italic muted)
8. URL (blue)
9. DOI link (green underline)
10. Duplicate badge chip (colored)
11. Predatory flag badge (red/amber)
12. Issue list with ● ▲ ℹ icons
13. `<details>` popover for keep/delete actions

There is **no visual hierarchy** — everything is `text-xs` in various muted colors. The eye has nowhere to land. The metadata chip colors (DOI=green, URL=blue, Volume=green, Version=purple, Accessed=sky) are arbitrary and undocumented.

---

#### 6. StatusBar information overload

**File:** `src/renderer/components/StatusBar.tsx` (lines 23–71)

Simultaneously shows **10 data points** in a single `text-xs flex-wrap` bar:

| Data Point | Color |
|------------|-------|
| Citation count | muted |
| Issue count | destructive |
| Fixed count | green |
| Partial count | amber |
| Needs-fix count | red |
| Predatory count | red-700 |
| Duplicate count | muted |
| Detected style + confidence % | muted |
| Target style | muted |
| Network status | green/destructive |

When all are active, it wraps and becomes a **two-line soup**. The "detected style: APA 7th (73%)" is marginally useful for most users and shouldn't compete with actionable counts.

---

#### 7. IssuePanel is a ~600-line monolith

**File:** `src/renderer/components/IssuePanel.tsx`

Handles predatory update banners, registry legends, L1/L2 verdict cards, issue cards, verification mismatch cards, predatory flag cards, duplicate group cards — all in one file with no sub-components. Each card type is a different conditional branch inside a `map()`.

---

### 🟠 HIGH — Missing Visual Identity

#### 8. Zero typographic personality

**DESIGN.md says:**

> *"Distinctive but readable sans for UI chrome; separate face for citation text; monospace for DOI/PMID/JSON debug. Do not default to Inter, Arial, or system-ui-only stacks."*

The app uses **no custom fonts at all**. There is no `@font-face`, no Google Fonts import, no `font-family` declaration beyond browser defaults. Everything is the Tailwind/system-ui default.

Result: the entire app looks exactly like every other shadcn project on the internet.

---

#### 9. Generic color palette

The 14 HSL tokens in `src/renderer/styles/globals.css` are the **literal shadcn default values**:

```css
--primary: 234 72% 48%;        /* indigo-600 */
--destructive: 0 84.2% 60.2%; /* red-500 */
--muted: 210 40% 96.1%;        /* slate-100 */
```

No brand color. No warm accent. Nothing that says "bibliography tool" or "academic workstation." Dark mode just inverts the same generic palette.

---

#### 10. Duplicate Tailwind config

`globals.css` defines `@theme` tokens AND `tailwind.config.js` extends colors with the same definitions. A Tailwind v4 migration artifact — causes confusion about which is authoritative.

---

### 🟡 MEDIUM — Component & UX Quality

#### 11. `window.confirm()` for destructive actions

**Files:** `Toolbar.tsx` (line 61), `IssuePanel.tsx`

Clear All uses `window.confirm()`. Duplicate keep uses `window.confirm()`. These are native OS dialogs that:

- Break the app's visual consistency
- Can't be styled to match the design system
- Can't be fully i18n-controlled (button labels remain in the OS language)

---

#### 12. Hand-rolled dropdown menu

**File:** `src/renderer/components/Toolbar.tsx` (lines 65–211)

The "More" menu is built with:

- Raw `pointerdown` outside-click detection
- Manual `aria-expanded` / `aria-haspopup`
- Manually positioned `absolute` div

Missing: no keyboard navigation (arrow keys), no Escape-to-close, no focus trapping, no item highlighting on hover focus. This is fragile and inaccessible.

---

#### 13. `<details>` element as action popover

**File:** `src/renderer/components/OutputPanel.tsx`

Uses native `<details>` / `<summary>` for keep/delete actions on citations. Problems:

- Semantically wrong — `<details>` is for disclosure, not action menus
- Inconsistent styling across browsers
- No keyboard control beyond Enter/Space
- No animation
- No proper menu item roles

---

#### 14. No loading states

When Verify runs, the button text changes to "Verifying…" but there's no skeleton loading, no progress indicator, no overlay on the citation list. When autocorrect or find-DOIs runs from the More menu, the menu closes and **nothing visible happens** until completion. The user has no feedback that work is in progress.

---

#### 15. Empty states are passive

**File:** `src/renderer/components/OutputPanel.tsx` (lines 218–225)

```tsx
<p className="text-sm text-muted-foreground">{t('outputPanel.emptyTitle')}</p>
<p className="mt-1 text-xs text-muted-foreground/70">{t('outputPanel.emptyHint')}</p>
<p className="mt-2 text-[11px] text-muted-foreground/65">{t('outputPanel.emptyHeroLine')}</p>
```

Three lines of diminishing-opacity muted text. No drag-drop affordance visible, no example text, no keyboard shortcut hint, no illustration.

**DESIGN.md calls for:** *"Actionable (upload manuscript, import bibliography, connect LM Studio)"* empty states.

---

#### 16. Sidebar auto-switching is disorienting

**File:** `src/renderer/components/Sidebar.tsx`

The sidebar auto-switches to the Issues tab when issues exist, overriding the user's explicit tab choice. This is paternalistic UX — the user should stay on Target if they chose it; indicate new issues with a badge instead.

---

### 🟡 MEDIUM — "Advanced" Surface Ships Dead Ends

#### 17. WorkerNav shows 7 workers, 5 are stubs

**Files:** `src/renderer/components/workers/WorkerNav.tsx`, `StubWorkerPanel.tsx`

Users see: Maktab, Masdar, Tasnif, Raqim, Sanad, Tashkil, Bayan — but only **Raqim and Tasnif are functional**. The rest show "Planned" or "Coming in Tier 3" empty states.

`DESIGN.md` acknowledges this is transitional scaffolding, but it **ships to users**. Five out of seven destinations are dead ends. The colored availability dots (green/amber/gray) are a nice idea but don't compensate for the frustration of clicking into empty rooms.

---

### 🟢 LOW — Polish Gaps

#### 18. No focus rings on custom interactive elements

The More dropdown button, filter pills, duplicate badges — none have visible `focus-visible` rings. Only the shadcn `Button` component has a ring. Custom interactive elements are invisible to keyboard users.

#### 19. RTL edge cases in toolbar

The More dropdown positioning uses `rtl:start-auto rtl:end-0` but the outside-click handler uses raw DOM `contains()` without RTL consideration for coordinate transforms.

#### 20. GitHub README has zero screenshots

The repository landing page has no visual preview of the application. For a desktop app, this is a significant onboarding gap — potential users can't see what they'd be installing.

---

## Part 2: Remediation Plan

### Phase 1: Fix Self-Violations & Clean Up ⚡ Quick Wins

| # | Task | Files | Effort |
|---|------|-------|--------|
| 1.1 | **Remove TasnifWorkspace hero-metric cards.** Replace with a compact triage list (one row per category: icon, label, count, "view" link) or an inline summary row. | `TasnifWorkspace.tsx` | Small |
| 1.2 | **Remove `uppercase tracking-wide` from StubWorkerPanel.** Use a normal-case muted label or an inline badge for availability status. | `StubWorkerPanel.tsx` | Trivial |
| 1.3 | **Flatten OutputPanel citation cards.** Use a divider-only list layout for clean citations. Reserve card treatment (border + tinted bg) only for items with active issues or predatory flags. | `OutputPanel.tsx` | Medium |
| 1.4 | **Clean up duplicate Tailwind config.** Remove color extensions from `tailwind.config.js` that duplicate `globals.css @theme`. Keep `globals.css` as the single source of truth. | `tailwind.config.js`, `globals.css` | Small |

---

### Phase 2: Toolbar & Information Architecture

| # | Task | Files | Effort |
|---|------|-------|--------|
| 2.1 | **Flatten toolbar to a single row.** Brand mark (icon + wordmark only, no subtitle) on the left. Primary actions (Import, Verify, Export) in the center or right. More menu on the far right. Move WorkflowStrip to a thin progress indicator or remove it entirely — the pipeline concept adds no value for a bibliography import/verify/export flow. | `Toolbar.tsx`, `WorkflowStrip.tsx` | Medium |
| 2.2 | **Simplify StatusBar.** Show only actionable counts (issues, predatory, duplicates) + target style + network status. Move "detected style + confidence" and the "fixed/partial/needsFix" breakdown to the OutputPanel header or sidebar. | `StatusBar.tsx` | Small |
| 2.3 | **Add a metadata chip color legend** or replace color-coded chips with explicit text labels (e.g., "DOI" before the link, "URL" before the link) so users don't have to guess. | `OutputPanel.tsx` | Small |

**Impact of Phase 2:** Going from a 3-row toolbar to 1 row immediately **doubles the usable content area** on most screens. This is the single highest-impact visual change.

---

### Phase 3: Visual Identity & Typography

| # | Task | Files | Effort |
|---|------|-------|--------|
| 3.1 | **Choose and integrate a distinctive UI font.** Options: **IBM Plex Sans** (technical, pairs well with monospace), **Source Sans 3** (clean academic feel), or **DM Sans** (modern neutral). Add `@font-face` or Google Fonts import to `globals.css`. Apply to body chrome. Keep system-ui as fallback. | `globals.css`, `index.html` | Small |
| 3.2 | **Choose a citation-display font.** A serif or specialized sans for formatted reference output. Apply to citeproc-rendered areas. | `globals.css`, `citeproc-wrapper.ts` | Small |
| 3.3 | **Adjust the primary color.** Move away from default shadcn indigo-600 (`234 72% 48%`). Consider: **deep teal** (academic, calm), **forest green** (bibliography, natural), or **warm navy** (professional, distinguished). Update all 14 tokens in `globals.css` for both light and dark modes. | `globals.css` | Medium |
| 3.4 | **Add body line-height and max-width constraints** for prose panels per DESIGN.md spec (~65–75ch). | `globals.css` | Trivial |

**Impact of Phase 3:** This is what separates "a tool I found on GitHub" from "a product I remember." Without a distinctive typeface and color, all other polish is invisible against the sea of identical shadcn apps.

---

### Phase 4: Interaction Quality

| # | Task | Files | Effort |
|---|------|-------|--------|
| 4.1 | **Replace `window.confirm()` with a custom `<ConfirmDialog>`.** Build a reusable confirmation dialog using Radix Dialog or similar. Wire it into Toolbar (Clear All) and IssuePanel (duplicate keep). Support i18n for button labels. | New `ConfirmDialog.tsx`, `Toolbar.tsx`, `IssuePanel.tsx` | Medium |
| 4.2 | **Replace hand-rolled More dropdown with a proper menu.** Use Radix DropdownMenu or the shadcn DropdownMenu pattern. Add keyboard navigation (arrow keys, Escape, Enter), focus trapping, and proper ARIA roles. | `Toolbar.tsx`, new or existing dropdown component | Medium |
| 4.3 | **Replace `<details>` citation action popovers.** Convert to a small inline actions toolbar (visible on hover/focus) or a proper context menu. | `OutputPanel.tsx` | Medium |
| 4.4 | **Add loading indicators.** Skeleton shimmer on the citation list during verify/autocorrect. A progress bar or toast for batch operations. Show item count + progress ("Verifying 47/200…") in the StatusBar during long runs. | `OutputPanel.tsx`, `StatusBar.tsx`, potentially new `Toast` / `ProgressBar` components | Medium |
| 4.5 | **Improve empty states.** Add keyboard shortcut hints (e.g., "Press Ctrl+V to paste references"), drag-drop affordance (dashed border zone), and a "Try pasting this example" link that loads sample data. | `OutputPanel.tsx`, `InputPanel.tsx` | Small |

---

### Phase 5: Component Refactoring

| # | Task | Files | Effort |
|---|------|-------|--------|
| 5.1 | **Break IssuePanel (~600 lines) into sub-components:** `IssueCard`, `MismatchCard`, `PredatoryCard`, `DuplicateGroupCard`, `RegistryLegend`. Each gets its own file and focused responsibility. | `IssuePanel.tsx` → multiple new files in `components/issues/` | Medium |
| 5.2 | **Break OutputPanel (~500 lines) into sub-components:** `CitationRow`, `CitationMetaChips`, `CitationActions`, `FilterBar`. Extract render logic from the monolithic map. | `OutputPanel.tsx` → multiple new files in `components/output/` | Medium |
| 5.3 | **Stop Sidebar from auto-switching tabs.** Add an issue count badge to the Issues tab instead. Let the user stay on whichever tab they chose. | `Sidebar.tsx` | Small |
| 5.4 | **Add `focus-visible` rings** to all custom interactive elements: filter pills, badge buttons, duplicate chips, the More dropdown trigger. Use a shared `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` pattern. | Various component files | Small |

---

### Phase 6: Surface Consolidation

| # | Task | Files | Effort |
|---|------|-------|--------|
| 6.1 | **Collapse the 7-worker nav into a compact advanced panel.** Show functional workers (Raqim, Tasnif) as primary destinations. Show stub workers as a single "Coming soon" section with brief descriptions — not as separate clickable destinations with full-page empty states. Consider removing the WorkerNav entirely if only 2 of 7 workers are live. | `WorkerNav.tsx`, `WorkerShell.tsx`, `StubWorkerPanel.tsx` | Medium |
| 6.2 | **Add screenshots to the GitHub README.** Capture the bibliography workspace (primary use case) and add them to the README with descriptive alt text. | `README.md`, new image assets in `docs/screenshots/` | Small |

---

## Priority Summary

| Phase | Theme | Impact | Effort |
|-------|-------|--------|--------|
| **1** | Fix self-violations | Stops the bleeding — your own rules broken in production | Small |
| **2** | Toolbar + info architecture | Single highest-impact visual change — doubles content area | Medium |
| **3** | Typography + color identity | Separates "tool" from "product" | Small–Medium |
| **4** | Interaction quality | Makes it feel finished, not prototyped | Medium |
| **5** | Component health | Maintainability, testability, reduced cognitive load | Medium |
| **6** | Surface consolidation | Removes dead ends, sharpens the product story | Small–Medium |

---

## Implementation Notes

- All changes are scoped to `src/renderer/` — **no engine or main-process changes needed**.
- i18n strings will need updating in both `en/translation.json` and `ar/translation.json` for any new or changed UI text.
- Run `npm test` and `npm run lint` after each phase.
- The plan preserves all existing Zustand store shapes and IPC boundaries — these are renderer-only visual and interaction improvements.
- Design tokens in `globals.css` are the single source of truth. `tailwind.config.js` should be cleaned up (Phase 1.4) and then left alone.
- Before shipping any renderer change, verify against the `DESIGN.md` UI acceptance checklist:

  > - [ ] Loop-first or bibliography-mode — not Hydra peer tabs as the only entry.
  > - [ ] Table-first reference surfaces where applicable.
  > - [ ] No nested-card nesting for routine rows.
  > - [ ] Contrast checked on muted/placeholder text.
  > - [ ] EN/AR parity for new strings.
  > - [ ] No items from **Absolute bans** above.
  > - [ ] Stubs honest; no fake progress.

---

*"The app works. Now make it look like it was designed, not assembled."*
