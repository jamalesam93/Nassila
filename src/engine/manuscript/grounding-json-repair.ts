/**
 * Lightweight JSON repair for L3 grounding model outputs.
 * Mirrors NassilaT training/scripts/json_repair.py (Phase 0.5). See docs/TRAINING.md.
 */

const FENCE_RE = /```(?:json)?\s*/gi
const OPTIONAL_KEY_RE = /("[\w-]+")\s*\?\s*:/g
const TRAILING_COMMA_RE = /,\s*([\]}])/g
const PREMATURE_ROOT_CLOSE_RE = /"\]\}\}\],\s*"overallVerdict"/g
const UNCLOSED_RATIONALE_ARRAY_RE = /"\}\],\s*"overallVerdict"/g

export function stripCodeFences(text: string): string {
  return text.replace(FENCE_RE, '').replace(/```/g, '')
}

export function sliceOuterObject(text: string): string {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) return text
  return text.slice(start, end + 1)
}

export function removeOptionalKeyMarkers(text: string): string {
  return text.replace(OPTIONAL_KEY_RE, '$1:')
}

export function removeTrailingCommas(text: string): string {
  let prev = ''
  let out = text
  while (prev !== out) {
    prev = out
    out = out.replace(TRAILING_COMMA_RE, '$1')
  }
  return out
}

export function fixOverallVerdictBraceErrors(text: string): string {
  return text
    .replace(PREMATURE_ROOT_CLOSE_RE, '"]}], "overallVerdict"')
    .replace(UNCLOSED_RATIONALE_ARRAY_RE, '"]}], "overallVerdict"')
}

/** Apply the full repair pipeline. Always returns a string. */
export function repairGroundingJsonText(raw: string): string {
  if (!raw) return raw
  let out = raw.trim()
  out = stripCodeFences(out)
  out = sliceOuterObject(out)
  out = removeOptionalKeyMarkers(out)
  out = fixOverallVerdictBraceErrors(out)
  out = removeTrailingCommas(out)
  return out.trim()
}

function hasClaimsArray(parsed: unknown): parsed is Record<string, unknown> {
  return !!parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).claims)
}

/** Parse first complete top-level `{...}` when trailing junk breaks strict slice parse. */
export function tryParseFirstGroundingObject(
  text: string
): { ok: true; parsed: Record<string, unknown> } | { ok: false } {
  const prepared = repairGroundingJsonText(text)
  const start = prepared.indexOf('{')
  if (start === -1) return { ok: false }

  let depth = 0
  let inString = false
  let escape = false

  for (let i = start; i < prepared.length; i++) {
    const c = prepared[i]
    if (inString) {
      if (escape) {
        escape = false
        continue
      }
      if (c === '\\') {
        escape = true
        continue
      }
      if (c === '"') inString = false
      continue
    }
    if (c === '"') {
      inString = true
      continue
    }
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) {
        try {
          const parsed = JSON.parse(prepared.slice(start, i + 1)) as unknown
          if (hasClaimsArray(parsed)) return { ok: true, parsed }
        } catch {
          /* try next closing brace */
        }
      }
    }
  }
  return { ok: false }
}

export function parseStrictGroundingJsonSlice(raw: string): { ok: true; parsed: Record<string, unknown> } | { ok: false; error: string } {
  const sliced = sliceOuterObject(stripCodeFences(raw.trim()))
  if (!sliced) return { ok: false, error: 'No JSON object in model output' }
  try {
    const parsed = JSON.parse(sliced) as unknown
    if (!hasClaimsArray(parsed)) return { ok: false, error: 'Missing claims array' }
    return { ok: true, parsed }
  } catch {
    return { ok: false, error: 'Invalid JSON from model' }
  }
}

export function parseGroundingJsonWithRepair(
  raw: string
): { ok: true; parsed: Record<string, unknown>; repaired: boolean } | { ok: false; error: string } {
  const strict = parseStrictGroundingJsonSlice(raw)
  if (strict.ok) return { ok: true, parsed: strict.parsed, repaired: false }

  const repairedText = repairGroundingJsonText(raw)
  if (repairedText) {
    try {
      const parsed = JSON.parse(repairedText) as unknown
      if (hasClaimsArray(parsed)) return { ok: true, parsed, repaired: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (!msg.includes('Unexpected') && !msg.toLowerCase().includes('extra')) {
        /* fall through to first-object */
      }
    }
  }

  const first = tryParseFirstGroundingObject(raw)
  if (first.ok) return { ok: true, parsed: first.parsed, repaired: true }

  return { ok: false, error: strict.error }
}
