# Nassila — brand guide

**Nassila** (ناسيلا) is a desktop app for preparing a **submit-ready bibliography**: import and clean your reference list, verify rows against scholarly registries, and export in thousands of CSL styles. Optional local AI can help compare sentences in your draft to cited sources (AI-assisted; verify manually).

The name is **coined**, inspired by the idea of a **sanad** (سند): a clear chain from what you write to where it came from. It is not a standard dictionary term for “reference manager.”

---

## Hero (bilingual)

Use these on README, About, and marketing. In the app UI, `toolbar.brandSubtitle` and `about.*` strings mirror this copy.

### English

**Nassila**  
*Verify your references. Ground your claims.*  
*The last check before you submit — bibliography, registries, and source-backed writing.*

### Arabic

**ناسيلا**  
*تحقق من مراجعك. اربط ما تكتبه بالمصدر.*  
*مراجعة أخيرة قبل التسليم — القائمة، السجلات، والمطابقة مع نص المصدر.*

---

## Tone

| | Guideline |
|--|-----------|
| **Academic** | Registries, CSL, source, submit, sanad framing in About |
| **Student-friendly** | Short sentences, “last check,” actionable errors |
| **Bilingual** | EN and AR heroes stay parallel; product name is Nassila / ناسيلا per locale |
| **AI** | “AI-assisted”; never “AI writes your citations” |

**Avoid:** plagiarism-police framing, “powered by AI” hype, product name **Tether** (crypto collision).

---

## Technical identifiers

| Item | Value |
|------|--------|
| `productName` (electron-builder) | Nassila |
| `appId` | `com.nassila.app` |
| User-Agent (registry APIs) | `Nassila/1.0` |
| Sanad default (E4B Q6_K) | `nassila-sanad-e4b` |
| Sanad optional (12B Q6_K) | `nassila-sanad-12b` |
| Unified local model (future) | `nassila-agent-e12b-v1` (or merged multi-task GGUF) |
| Strategy doc | [`OUROBOROS.md`](./OUROBOROS.md) · agent brief [`OUROBOROS_CONTEXT.md`](./OUROBOROS_CONTEXT.md) |
| Locale storage key | `nassila.locale` |

---

## Ouroboros workers (codenames)

Seven **future product modules**; each has a deterministic core plus an optional trainable LLM facet. **Sanad** ships first. Constants: [`nassila-agent-tasks.ts`](../src/shared/nassila-agent-tasks.ts). Full brief: [`OUROBOROS_CONTEXT.md`](./OUROBOROS_CONTEXT.md).

| Worker | Arabic | `task` id | Future module | LLM facet (when trained) |
|--------|--------|-----------|---------------|--------------------------|
| **Sanad** | سند | `l3_grounding` | Ground claims to sources | Passage vs excerpt → grounding JSON |
| **Maktab** | مكتب | `doc_extract` | Manuscript ingest | PDF/DOCX → structured text |
| **Masdar** | مصدر | `source_pdf_extract` | Cited source text | OA PDF → chunks for Sanad |
| **Shahid** | شاهد | `table_figure_grounding` | Tables/figures as evidence | Multimodal region grounding |
| **Raqim** | رقيم | `webpage_metadata` | Reference records (verify, export) | Webpage → CSL suggestions |
| **Tasnif** | تصنيف | `webpage_classify` | Type, dedupe, predatory flags | Grey-web classification |
| **Sharh** | شرح | `issue_explain` | Explain failures & mismatches | User-facing issue copy |

---

## Positioning

- **Not** a full reference manager (Zotero/Mendeley replacement).
- **Is** a quality pass before submission: validate, verify (L1/L2), dedupe, predatory flags, export.
- **Future:** source matching (L3) as a named in-app feature, not the company name.
