# Loop budget (agent sessions)

Lightweight guardrails for unattended or long agent runs on Nassila.

| Limit | Value | Rationale |
|-------|-------|-----------|
| Max files touched per task | ~12 | Surgical diffs (`AGENTS.md`) |
| Required verification | `npm test` + `npm run lint` before ship | Engine invariants |
| No drive-by refactors | Only lines traced to the task | Karpathy guidelines |
| i18n | EN + AR key parity test must pass | `i18n-key-parity.test.ts` |
| Arabic wording | Ask user before AR copy changes | `AR_I18N_GLOSSARY.md` |
| IPC | New handlers need validation tests | `SECURITY-FIX-PLAN.md` |

**Stop conditions:** gate fails → document in `STATE.md` blockers; do not ship partial OCR backend without tests.
