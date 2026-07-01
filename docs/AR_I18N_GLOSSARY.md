# Arabic UI glossary — Nassila

Single source of truth for **user-facing Arabic** in the app, native menus, and [nassila-web](https://nassila-web.vercel.app). Anchor copy lives in [BRAND.md](./BRAND.md).

**Voice:** academic / formal (thesis and journal workflow). Not casual SaaS Arabic.

**Workflow:** agents must read this file before proposing Arabic. **Never apply Arabic copy without user approval** — present EN, current AR (if any), proposed AR, and one-line rationale.

---

## Locked (from BRAND)

| Concept | Arabic | Notes |
|---------|--------|-------|
| Product name | **ناسيلا** | Never translate "Nassila" |
| Hero line 1 | **تحقق من مراجعك. اربط ما تكتبه بالمصدر.** | `toolbar.brandSubtitle`, `about.subtitle` |
| Hero line 2 | **مراجعة أخيرة قبل التسليم — القائمة، السجلات، والمطابقة مع نص المصدر.** | About / marketing body |
| Worker: Sanad | **سند** | L3 grounding; keep codename in EN UI |
| Worker: Raqim | **رقيم** | Reference library / Bibliography mode |
| Worker: Tasnif | **تصنيف** | Triage / classify |
| Worker: Sharh | **شرح** | Explanations |
| Worker: Maktab | **مكتب** | Manuscript ingest (planned) |
| Worker: Masdar | **مصدر** | Cited source text (planned) |
| Worker: Shahid | **شاهد** | Tables/figures (planned) |

---

## Domain terms (preferred Arabic)

| English | Preferred Arabic | Avoid |
|---------|------------------|-------|
| Bibliography (mode / library) | **قائمة المراجع** (long) · **المراجع** (nav tab) | «ببليوغرافيا» |
| Reference row / citation | **مرجع** / **مراجع** | «اقتباس» when meaning bibliography entry |
| Verify references | **التحقق من المراجع** | «التحقق من السجل» alone (too narrow for button) |
| Registry check | **التحقق في السجل** / **فحص السجل** | Calque «L1» in user buttons |
| Metadata alignment | **مطابقة البيانات الوصفية** | |
| Passage grounding (feature) | **توثيق الادعاءات بالمصدر** | «ربط المقاطع» (literal calque) |
| Sanad grounding (short) | **توثيق سند** / **تفعيل سند** | |
| In-text citation | **استشهاد داخل النص** | |
| Manuscript audit | **تدقيق المخطوطة** | |
| Predatory journal | **مجلة مشبوهة** / **علامة مشبوهة** | |
| Duplicate | **تكرار** / **مكرر** | |
| Target style | **أسلوب الهدف** / **أسلوب الاقتباس** | |
| Issues panel | **المشكلات** | |
| Open-access full text | **النص الكامل المفتوح** | |
| Registry abstract | **ملخص السجل** | |

---

## Technical isolates (do not translate)

Keep in Latin script in UI: **DOI**, **PMID**, **ISBN**, **Crossref**, **PubMed**, **OpenAlex**, **CSL**, **CSL-JSON**, **BibTeX**, **RIS**, **L1**, **L2**, **L3**, **GGUF**, **LM Studio**, **Ollama**, **vLLM**, **Hugging Face**, **Unpaywall**, **Europe PMC**, **JSON**, **PDF**, **DOCX**, **API**, **IPC**, model ids (`nassila-sanad-e4b`, etc.).

---

## UI patterns

| Pattern | Rule |
|---------|------|
| Buttons | Verb-first imperative: **استيراد**، **تصدير**، **تحقق** |
| Busy states | **جارٍ …** + ellipsis (U+2026): **جارٍ التحقق…** |
| Hints | Full sentences; explain *why*, not word-for-word EN |
| Server / API | Prefer **عنوان الخادم** over «نقطة نهاية»; **خادم محلي** for local runner |
| Navigation | Short labels OK: **المراجع**، **المخطوطة** |
| Plural forms | Keep i18next `_one` / `_other` keys; use natural Arabic plural (مراجع، مشكلات) |

---

## Anti-patterns

1. **Word-for-word English order** — restructure for natural Arabic.
2. **Duplicate nouns** — e.g. «إرسال المراجع إلى المراجع» → **نقل المراجع إلى رقيم**.
3. **«قسرية»** for Force Reload → **إعادة التحميل بالكامل**.
4. **«المخرجات»** for Output panel → **قائمة المراجع** / **الجدول**.
5. **«ربط المقاطع»** everywhere — use glossary term for passage grounding.
6. **Translating worker codenames** in EN locale — only AR locale uses Arabic worker names where listed.
7. **Machine-translating MDX/docs** without batch review.

---

## Cross-surface sync

When hero or worker terms change, update together:

- [BRAND.md](./BRAND.md)
- `src/renderer/i18n/locales/ar/translation.json`
- `src/main/menu-i18n.ts` (AR block)
- `nassila-web/messages/ar.json`
- Relevant `nassila-web/content/docs/ar/*.mdx`

---

## Agent skill

Implementation workflow: [`.cursor/skills/nassila-arabic/SKILL.md`](../.cursor/skills/nassila-arabic/SKILL.md).
