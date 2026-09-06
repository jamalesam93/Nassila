# Nassila 2.0.0 release checklist (Step 7 — after GO only)

**Do not execute until** [`EVAL_GONOGO_TIER3_MEMO.md`](../../NassilaT/training/EVAL_GONOGO_TIER3_MEMO.md) records **GO** for Tier 3 text **and** Shahid multimodal.

**Index:** NassilaT [`2.0_OPERATOR_INDEX.md`](../../NassilaT/training/2.0_OPERATOR_INDEX.md)  
**Contract:** [`FEATURES-AND-TWEAKS.md`](./FEATURES-AND-TWEAKS.md) #22

---

## Gate confirmation

- [x] `EVAL_GONOGO_TIER3_MEMO.md` — GO checked, signatures filled
- [x] Retrieval suite report attached (separate from Sanad)
- [x] Gold-excerpt FT-6 report — bars met
- [x] E2e product suite — ≥100 docs / 400–500 claims, quote e2e ≥98%
- [x] Shahid multimodal holdout — bars met
- [x] [`PACKAGED_OCR_SMOKE.md`](./PACKAGED_OCR_SMOKE.md) — clean VM pass
- [x] Resource budgets in #22 filled with measured numbers

---

## Nassila (app)

### Version + build

- [x] Bump `package.json` → **2.0.0**
- [x] `CHANGELOG.md` — MaktabOCR + Shahid section (user-facing; no SEC-* / eval scores)
- [x] `README.md`, `STATE.md`, `docs/USER_GUIDE.md`, `docs/HOW_TO_GUIDE.md`
- [x] `docs/MAKTAB_OCR.md`, `docs/OUROBOROS_CONTEXT.md`, `docs/PRODUCT.md`
- [x] `electron-builder.yml` / resource notices / `resources/pdf-inspector/NOTICE`

### Code flags

- [x] `src/shared/ouroboros-loop-stages.ts` — `shahidEvidence` → **`live`** (only after GO)
- [x] Maktab stage status updated if native path is default ship path
- [x] Arabic adapter **not** implying validated Arabic L3 (FT-7 → 2.1.0)

### Verify

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm run build:win
```

- [x] Packaged OCR smoke on clean VM ([`PACKAGED_OCR_SMOKE.md`](./PACKAGED_OCR_SMOKE.md))
- [x] Installer hash recorded

### Git

- [x] Tag `v2.0.0` on GitHub
- [x] Upload `Nassila Setup 2.0.0.exe` to Releases

---

## NassilaT (training)

- [x] `training/OUROBOROS_OPERATOR_MAP.md` — app **2.0.0** shipped
- [x] `training/EVAL_GONOGO.md` — GO entry dated
- [x] Holdout artifact paths frozen (no post-GO edits)
- [x] **Do not** publish private eval rows or manuscript text

---

## nassila-web (public)

Follow [`nassila-web/docs/CHANGELOG_SYNC_SOP.md`](../../nassila-web/docs/CHANGELOG_SYNC_SOP.md).

### Strip from public copy

- Eval scores, harness names, W-ids, SEC-* ids, NassilaT methodology

### Update (EN + AR)

- [ ] `lib/release-train.ts` — `CURRENT_RELEASE` → 2.0.0
- [ ] `content/changelog/en.md`, `content/changelog/ar.md`
- [ ] `content/docs/{en,ar}/roadmap.mdx`
- [ ] `content/docs/{en,ar}/manuscript.mdx`, `user-guide.mdx`, `getting-started.mdx`
- [ ] `content/docs/{en,ar}/local-models.mdx` — FT-6 facts only; no training internals
- [ ] Download page / structured data fallback if applicable

### Media (capture before deploy)

- [ ] OCR / scan ingest screenshot (EN + AR)
- [ ] Shahid evidence review screenshot (EN + AR)
- [ ] Grey-literature confirm-before-apply (EN + AR)
- [ ] Media inventory updated

### Deploy

```bash
cd nassila-web
npm run build
```

- [ ] Vercel production deploy
- [ ] Verify latest-download badge, codename, EN/AR parity, installer URL

---

## Release order (locked)

1. Validated installer + GitHub `v2.0.0` tag  
2. Synchronized site facts / changelogs / media  
3. Site build + lint  
4. Production deploy  
5. Post-deploy smoke (download link, structured data, AR pages)

---

## If NO-GO at any step

Stop. Do **not** bump version or publish 2.0 marketing. Update memo with blockers and remediation plan per [`EVAL_GONOGO.md`](../../NassilaT/training/EVAL_GONOGO.md).
