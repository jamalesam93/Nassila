### Layout Rules:
1. **Flatten Toolbar to One Row:** Strip out the 3-row bulk. Brand mark on the left, primary actions (Import, Verify, Export) in the center, and a proper dropdown menu on the far right[cite: 5]. Remove or hide the decorative `WorkflowStrip` pipeline pills[cite: 5].
2. **Master-Detail Splitting:** Restrict the workspace to a high-density **2-column split** for the primary flow. 
3. **Drawer Pattern for Configurations:** Move target style configurations (`By Journal` / `By Style`) into a **collapsible right drawer panel**. Do not squeeze it into a permanent narrow third column.
4. **Simplify StatusBar:** Reduce data density[cite: 5]. Show only actionable counts (Issues, Predatory, Duplicates) + target style + network status[cite: 5]. Do not allow it to wrap into a two-line text soup[cite: 5].

---

## 3. Mandatory Code Fixes (Anti-Scaffold Refactoring)

You must explicitly eradicate the developer scaffolding and technical debt identified in the UI audit:

* **Eradicate Banned Hero Metrics:** In `src/renderer/components/workers/TasnifWorkspace.tsx`, remove the grid of cards displaying large numbers and body descriptions[cite: 5]. Replace them with a compact, flat triage list[cite: 5].
* **Remove Eyebrows:** In `src/renderer/components/workers/StubWorkerPanel.tsx`, remove all instances of `uppercase tracking-wide` tiny typography[cite: 5].
* **Flatten Citation Rows:** In `src/renderer/components/OutputPanel.tsx`, stop rendering everyday routine citations as deep nested cards[cite: 5]. Use a clean, flat, divider-only list layout[cite: 5]. Reserve card borders and tinted backgrounds *only* for citations with active issues or predatory flags[cite: 5].
* **Eradicate Browser Native Dialogs:** Remove all `window.confirm()` calls (e.g., in `Toolbar.tsx` and `IssuePanel.tsx`)[cite: 5]. Replace them with an accessible, styleable, i18n-compliant custom dialog component[cite: 5].
* **Eradicate Native `<details>` Popovers:** Replace the native `<details>` context hacks in `OutputPanel.tsx` with proper UI menus or inline action bars[cite: 5].
* **Fix Hand-Rolled Dropdowns:** Replace raw `pointerdown` absolute wrappers with an accessible component layer ensuring Escape-to-close, arrow-key navigation, and proper ARIA states[cite: 5].

---

## 4. Impeccable Design Discipline (Absolute Bans)

Strictly adhere to the following stylistic boundaries to ensure Nassila feels like a serious academic utility, not a generic SaaS template[cite: 2]:

| Element | Banned Anti-Pattern (Match & Refuse)[cite: 2] | Required Alternative[cite: 2] |
|---|---|---|
| **Headers & Themes** | Purple-to-blue gradients, glassmorphism cards, neon glows, vibrant ambient shadows[cite: 2]. | Flat, deep, authoritative tinted neutrals. Calm primary colors used strictly as focal sparks[cite: 2]. |
| **Typography** | Defaulting blindly to raw `system-ui` or Inter for everything[cite: 2]. | Apply an explicit custom font-family stack (e.g., Source Sans 3, IBM Plex Sans) for chrome, a separate readable serif/sans for citation bodies, and monospace for IDs/DOIs[cite: 2, 5]. |
| **Containers** | Nesting cards inside cards inside cards; rounded-square icon tiles centered above every header row[cite: 2]. | Clean, structured tables and flat dividers using a base **4px padding/spacing rhythm**[cite: 2]. Maximize information density[cite: 2]. |
| **Aesthetics** | Over-rounded corners (`border-radius > 16px`), wide fuzzy ghost shadows, tiny uppercase tracked eyebrows[cite: 2]. | Razor-sharp or minimal rounding (4px–8px max), clean subtle solid borders (`1px solid`), sentence-case typography[cite: 2]. |
| **Interactions** | Bouncy/elastic easing, fake theatrical loading sequences for stubs[cite: 2]. | Instantaneous transitions or micro-fades. Total respect for `prefers-reduced-motion`[cite: 2]. |

---

## 5. Implementation Sequence for Next Code Generation

When executing tasks in the renderer/view layers:
1. Verify whether the target view is executing a full **Manuscript Audit Workflow** or a **Bibliography-Only Workflow**.
2. Render verdict chips strictly by text label alongside their status color to maintain absolute color-blind accessibility[cite: 2].
3. Ensure full structural layout mirrors accurately when shifting between English (LTR) and Arabic (RTL) locales, leaving only technical isolates (like DOIs, IDs, and URLs) locked to LTR[cite: 2].
4. Always provide explicit UI feedback or skeleton shimmers when long async processes (like Reference Verification) are running[cite: 5].