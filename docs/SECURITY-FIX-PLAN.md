# Security fix plan — Nassila

Remediation plan for **Critical** and **High** findings from the June 2026 codebase audit. No fixes are applied in this document; it is the implementation backlog.

**Related skills (installed):** see `.cursor/skills/ANTIGRAVITY-SKILLS.md` — use `@electron-development`, `@backend-security-coder`, and `@threat-modeling-expert` when implementing these items.

---

## Summary

| ID | Severity | Finding | Target phase |
| --- | --- | --- | --- |
| SEC-01 | Critical | LLM `baseUrl` SSRF in `llm:chat` | P0 |
| SEC-02 | Critical | Renderer `sandbox: false` | P0 |
| SEC-03 | High | Redirect SSRF in main-process OA/HTML fetch | P0 |
| SEC-04 | High | Broad preload API without IPC audit tests | P1 |
| SEC-05 | High | Manuscript → LLM prompt injection surface | P1 |
| SEC-06 | High | No Content-Security-Policy on renderer | P1 |
| SEC-07 | High | Ouroboros audit UI vs shipping docs mismatch | P2 (product) |

**Suggested order:** SEC-01 → SEC-03 → SEC-02 → SEC-06 → SEC-05 → SEC-04 → SEC-07.

---

## P0 — Ship blockers (security)

### SEC-01 — LLM endpoint SSRF (`llm:chat`)

**Risk:** Renderer supplies `config.baseUrl`; main process POSTs to `{baseUrl}/v1/chat/completions` with the decrypted API key. Unlike resolver/OA paths, this bypasses `validateExternalUrl`. A mistyped or malicious URL could reach internal services or cloud metadata endpoints.

**Files:**
- `src/main/ipc-llm.ts` (lines 77–98)
- `src/renderer/utils/llm-config-utils.ts` (localhost presets)
- `src/engine/network/http.ts` (`validateExternalUrl`, `tryValidateExternalUrl`)

**Fix approach:**

1. Add `validateLlmBaseUrl(baseUrl: string, opts: { allowLocalhost: boolean })` in `src/engine/network/http.ts` or a small `src/engine/network/llm-url.ts`:
   - HTTPS required for non-localhost hosts.
   - HTTP allowed only for `localhost` / `127.0.0.1` on known local runner ports (1234, 11434, 8000) or explicit user `custom` preset with localhost.
   - Reject private RFC1918, link-local, metadata hosts, credentials in URL, non-http(s) schemes.
   - Normalize trailing slashes before building `/v1/chat/completions`.

2. In `ipc-llm.ts`, validate `config.baseUrl` before `fetch`. Pass `allowLocalhost: true` only when hostname is localhost (local LM Studio/Ollama/vLLM).

3. Optionally accept `presetId` in the IPC payload so main can enforce “cloud preset → HTTPS allowlist” (`openrouter.ai`, `api.openai.com`, etc.) without trusting renderer URL alone.

4. Return a clear error (`llm_url_not_allowed`) instead of attempting fetch.

**Tests:**
- `tests/unit/network-http.test.ts` — extend with LLM base URL cases.
- New `tests/unit/ipc-llm-url.test.ts` — pure validation function tests (no Electron boot).
- Cases: `http://localhost:1234` ✓, `http://169.254.169.254` ✗, `http://192.168.1.1:1234` ✗, `https://api.openai.com` ✓, `http://evil.com` ✗ for cloud path.

**Acceptance criteria:**
- [ ] No `llm:chat` request leaves main without URL policy check.
- [ ] Local presets (LM Studio, Ollama, vLLM) still work on Windows dev.
- [ ] Unit tests cover allow/deny matrix.

---

### SEC-03 — Redirect SSRF in main-process fetch

**Risk:** `net.fetch` in `ipc-oa.ts` follows redirects by default. Initial URL passes `validateExternalUrl`, but `response.url` after redirect is not re-validated. Contrast with manual redirect handling in `src/engine/resolver/url.ts` (lines 77–96).

**Files:**
- `src/main/ipc-oa.ts` (`netFetchWithTimeout`, `url:fetchHtml`, `oa:fetchOaUrl`)
- `src/engine/resolver/url.ts` (reference implementation)
- `src/engine/network/http.ts`

**Fix approach:**

1. Extract shared `fetchWithValidatedRedirects(fetchFn, initialUrl, policy)` used by both engine resolver and main IPC:
   - `redirect: 'manual'` (or equivalent for `net.fetch`).
   - On 3xx, resolve `Location`, re-run `validateExternalUrl` on each hop.
   - Cap hops (e.g. 5, match `MAX_REDIRECTS` in `url.ts`).

2. Replace direct `netFetchWithTimeout(validated)` calls in `ipc-oa.ts` with the shared helper.

3. Before returning `finalUrl` to renderer, assert final URL still passes policy.

4. Align `src/engine/oa/fetch-oa.ts` if it shares the same gap.

**Tests:**
- `tests/unit/redirect-policy.test.ts` — mock fetch returning 302 to `http://127.0.0.1/...` → must throw/block.
- `tests/unit/network-http.test.ts` — redirect chain staying on allowed host → success.

**Acceptance criteria:**
- [ ] No IPC OA/HTML handler returns body from a post-redirect URL that fails `validateExternalUrl`.
- [ ] Behavior matches engine resolver redirect tests.

---

### SEC-02 — Renderer sandbox disabled

**Risk:** `sandbox: false` in `src/main/index.ts` (lines 38–43) reduces defense-in-depth if renderer is compromised. Comment notes ESM preload issue on Electron 41.

**Files:**
- `src/main/index.ts`
- `src/preload/index.ts`
- `electron.vite.config.*` (preload build)

**Fix approach:**

1. **Investigate** re-enabling `sandbox: true` on current Electron version:
   - Verify `contextBridge` + ESM preload still exposes `window.api` in dev and packaged builds.
   - If broken, document minimal preload surface and file upstream electron-vite issue.

2. If sandbox cannot be enabled yet:
   - Add `webSecurity: true` (default, confirm not overridden).
   - Narrow preload API (see SEC-04).
   - Treat SEC-06 (CSP) as compensating control.

3. Add dev-only smoke test or manual checklist: app boots, `window.api.readFile` works after dialog, LLM chat works locally.

**Tests:**
- Manual: dev + `npm run build:unpack` on Windows.
- Optional: Playwright/Electron driver smoke (future).

**Acceptance criteria:**
- [x] Documented exception with compensating controls (`contextIsolation`, `webSecurity`, CSP, IPC validation).
- [ ] `sandbox: true` with working preload — **deferred** (see [Future backlog — SEC-02b](#future-backlog--sec-02b-sandbox) below).

**Current state (2026-06-27):** `sandbox: false` in `src/main/index.ts`. Compensating controls in place. Do not enable `sandbox: true` without the SEC-02b smoke gate.

---

### Future backlog — SEC-02b (sandbox)

Re-enable renderer sandbox when tooling allows, without breaking `window.api`.

**Prerequisite:** Manual or automated smoke on **dev + `npm run build:unpack` (Windows)**:

| Step | Check |
|------|--------|
| 1 | DevTools: `typeof window.api === 'object'` |
| 2 | Help → About opens; app stays open |
| 3 | File → Open → read file via IPC |
| 4 | Settings → Passage grounding; local `llm:chat` to localhost |
| 5 | Manuscript loop → Run audit (network + L3 path) |

**Investigation order (one change per branch):**

1. **CJS preload** — In `electron.vite.config.ts`, build preload as CommonJS (`index.cjs`); point `webPreferences.preload` at `.cjs` instead of `index.mjs`.
2. **Electron / electron-vite bump** — Retry `sandbox: true` on newer Electron after changelog review.
3. **Minimal preload** — Ensure preload is thin `ipcRenderer.invoke` wrappers only (no Node assumptions).
4. **Upstream** — If still broken, file electron-vite / Electron issue; keep documented exception.

**If all attempts fail:** Keep `sandbox: false`; no release blocker.

**Optional follow-up:** Playwright/Electron smoke test asserting `window.api` after boot.

**Related cleanup:** [DEAD-CODE.md](./DEAD-CODE.md) — remove About-crash debug instrumentation before treating SEC-02b done.


## P1 — High priority (next sprint)

### SEC-06 — No Content-Security-Policy

**Risk:** Renderer loads React + user manuscript content. Without CSP, a future XSS in rendered excerpts has fewer mitigations.

**Files:**
- `src/main/index.ts` (`session.defaultSession.webRequest` or `webPreferences`)
- `src/renderer/index.html`

**Fix approach:**

1. Set a strict CSP for production loads (`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'` — tune for Vite hashed assets).
2. Dev mode: relax only what electron-vite HMR requires; keep production strict.
3. `connect-src`: restrict to none in renderer (all network via IPC) except dev WS for HMR.

**Tests:**
- Manual: app UI loads, no CSP console violations in production build.
- Document expected dev violations.

**Acceptance criteria:**
- [ ] Production renderer has explicit CSP.
- [ ] No renderer `fetch` to external URLs required for core flows (already true).

---

### SEC-05 — Manuscript → LLM prompt injection

**Risk:** User manuscript passages are embedded verbatim in grounding prompts (`src/engine/manuscript/grounding-llm.ts` lines 73–93). Malicious manuscript text could attempt to override system instructions.

**Files:**
- `src/engine/manuscript/grounding-llm.ts`
- `src/renderer/hooks/use-manuscript-audit.ts`

**Fix approach:**

1. **Delimiter isolation:** Wrap `PASSAGE` and `SOURCE_EXCERPT` in clear XML-style or markdown fences; instruct model to treat delimited blocks as untrusted data only.
2. **System/user split:** Move static instructions to `role: 'system'`; user message contains only delimited passage + excerpt (already partially done via `llmChat` messages — verify call site).
3. **Output constraint:** Keep JSON-only response requirement; grounding parser already rejects non-JSON.
4. **Length caps:** Already capped via `truncateForGrounding` — document limits in USER_GUIDE.
5. **Optional:** Strip common injection patterns (`ignore previous`, `system:`) as defense-in-depth (low confidence; don't rely on alone).

**Tests:**
- `tests/unit/grounding-llm.test.ts` — prompt contains delimiters; passage with injection text does not appear outside user block.
- NassilaT eval: add adversarial manuscript fixtures.

**Acceptance criteria:**
- [ ] Grounding prompts use system/user separation + delimiters.
- [ ] No regression on existing grounding unit tests / NassilaT eval pass rate.

---

### SEC-04 — Broad preload API + missing IPC tests

**Risk:** `src/preload/index.ts` exposes file I/O, secrets, LLM, OA fetch, predatory sync. Handlers are mostly validated, but there are **zero** tests for `ipc-handlers`, `ipc-oa`, `ipc-llm`.

**Fix approach:**

1. **Test harness:** Extract pure validation helpers from IPC handlers into `src/engine/` or `src/main/ipc-validation/` so Vitest can import without Electron.
2. **Priority test files:**
   - `tests/unit/ipc-llm-url.test.ts` (SEC-01)
   - `tests/unit/ipc-oa-redirect.test.ts` (SEC-03)
   - `tests/unit/ipc-url-policy.test.ts` — `oa:fetchOaUrl` blocked URLs
3. **Preload inventory:** Document each `window.api` method → IPC channel → main handler in a table (AGENTS.md or this doc appendix).
4. **Future:** Consider splitting preload into `api.core` vs `api.audit` if bibliography-only SKU needs a slimmer surface.

**Acceptance criteria:**
- [ ] Critical IPC validation paths have unit tests.
- [ ] New IPC handlers require matching tests (add to AGENTS.md change discipline).

---

## P2 — Product / architecture (not pure security)

### SEC-07 — Ouroboros audit UI vs shipping guidance

**Risk:** `WorkerShell` → `OuroborosLoopWorkspace` runs full L1→L3 pipeline (network + LLM) while `ManuscriptAudit/README.md` and AGENTS.md state audit UI is not mounted in shipping app.

**Files:**
- `src/renderer/components/workers/WorkerShell.tsx`
- `src/renderer/components/loop/OuroborosLoopWorkspace.tsx`
- `docs/PRODUCT.md`, `AGENTS.md`

**Decision (2026-06-27): Option A — Shipping Ouroboros**

The Ouroboros loop is a **production feature**. Docs distinguish:

- **Shipping:** `OuroborosLoopWorkspace` (`appSurface === 'loop'`, default)
- **Retired:** legacy `ManuscriptAudit/AuditView` tab layout (do not remount)

SEC-01–06 complete before treating loop as release-ready.

**Acceptance criteria:**
- [x] Docs and code agree: loop ships; legacy AuditView retired.
- [x] SEC-01–06 complete first (P0/P1 checklist).

---

## Implementation checklist (engineering)

```
Phase P0 (security) — implemented 2026-06-27
[x] SEC-01  validateLlmBaseUrl + ipc-llm guard + tests
[x] SEC-03  shared redirect validator + ipc-oa migration + tests
[x] SEC-02  webSecurity: true; sandbox:true reverted — breaks ESM preload/`window.api` on Electron 41 (About crash); compensating: contextIsolation, CSP (SEC-06), narrowed preload (SEC-04)

Phase P1 — implemented 2026-06-27
[x] SEC-06  production CSP (session header + index.html meta)
[x] SEC-05  grounding prompt delimiters + system/user split
[x] SEC-04  IPC validation unit tests (llm-url, redirect-policy, ipc-url-policy) + preload inventory below

Phase P2 — implemented 2026-06-27 (Option A: shipping Ouroboros)
[x] SEC-07  docs synced — loop ships via OuroborosLoopWorkspace; legacy AuditView retired; AGENTS, README, OUROBOROS_CONTEXT, ManuscriptAudit/README updated

Future backlog
[ ] SEC-02b  sandbox:true — CJS preload investigation + smoke gate (see SEC-02b section)
[ ] DEAD-CODE  inventory cleanup per docs/DEAD-CODE.md (optional hygiene)
```

**Verification gate (every PR touching these areas):**

```bash
npm run lint
npm test
npx tsc --noEmit   # after tsconfig baseUrl deprecation resolved
```

Use `@verification-before-completion` skill before marking items done.

---

## Appendix — positive controls (keep)

These were noted in the audit and should not regress during fixes:

- Dialog-gated filesystem (`src/main/ipc-handlers.ts`)
- `validateExternalUrl` / `tryValidateExternalUrl` (`src/engine/network/http.ts`)
- `safeStorage` for LLM keys (`src/main/ipc-llm.ts`)
- `contextIsolation: true`, `nodeIntegration: false`
- No `dangerouslySetInnerHTML` in renderer
- Manuscript prefs validation (`src/main/ipc-manuscript-audit-prefs.ts`)
- Template IPC validation (`src/main/ipc-templates.ts`)

---

## Appendix B — preload / IPC inventory

| `window.api` | IPC channel | Main handler |
| --- | --- | --- |
| `openFileDialog` | `dialog:open-file` | `ipc-handlers.ts` |
| `saveFileDialog` | `dialog:save-file` | `ipc-handlers.ts` |
| `readFile` / `readFileBinary` / `writeFile` | `fs:*` | `ipc-handlers.ts` (dialog-gated paths) |
| `loadPresets` / `savePresets` | `presets:*` | `ipc-handlers.ts` |
| `loadSettings` / `saveSettings` | `settings:*` | `ipc-handlers.ts` |
| `getSystemTheme` / `setNativeTheme` | `theme:*` | `ipc-handlers.ts` |
| `checkNetwork` | `network:check` | `ipc-handlers.ts` |
| `unpaywall` | `oa:unpaywall` | `ipc-oa.ts` |
| `europePmcJatsByPmcid` | `oa:europePmcJatsByPmcid` | `ipc-oa.ts` |
| `fetchOaUrl` | `oa:fetchOaUrl` | `ipc-oa.ts` (`OA_FETCH_URL_POLICY`) |
| `fetchHtml` | `url:fetchHtml` | `ipc-oa.ts` (`HTML_FETCH_URL_POLICY`) |
| `isEncryptionAvailable` / `hasLlmKey` / `setLlmKey` / `clearLlmKey` | `secrets:*` | `ipc-llm.ts` |
| `llmChat` | `llm:chat` | `ipc-llm.ts` (`validateLlmBaseUrl`) |
| `loadManuscriptAuditPrefs` / `saveManuscriptAuditPrefs` | `manuscriptAudit:*` | `ipc-manuscript-audit-prefs.ts` |
| `listTemplates` / `saveTemplate` / `deleteTemplate` | `templates:*` | `ipc-templates.ts` |
| `predatory.*` | `predatory:*` | `ipc-predatory-updates.ts` |
| `getAppAbout` / `setMenuLocale` / `setAppMode` | `app:*` | `ipc-handlers.ts` |

Validation tests: `tests/unit/llm-url.test.ts`, `tests/unit/redirect-policy.test.ts`, `tests/unit/ipc-url-policy.test.ts`.

---

_Last updated: 2026-06-27 — P2 SEC-07 closed (Option A: shipping Ouroboros)._
