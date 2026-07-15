#!/usr/bin/env node
/**
 * Parse KoboldCpp / LM Studio grounding audit logs into eval spreadsheets + JSONL.
 *
 * Usage:
 *   node scripts/parse-kobold-grounding-log.mjs <log.md> [--out <dir>] [--tag <name>]
 *
 * Outputs (in --out dir, default: training/field-notes/<tag> under NassilaT if found, else cwd):
 *   - grounding-calls.csv       — one row per L3 call (spreadsheet review)
 *   - grounding-claims.csv      — one row per claim (finer-grained labels)
 *   - grounding-field-notes.jsonl — NassilaT-shaped rows for future S15+ curation
 *   - grounding-summary.md        — quick stats
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join, resolve, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const nassilaRoot = join(__dirname, '..')
const nassilaTRoot = join(nassilaRoot, '..', 'NassilaT')

function parseArgs(argv) {
  const positional = []
  let outDir = null
  let tag = null
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--out' && argv[i + 1]) {
      outDir = resolve(argv[++i])
    } else if (argv[i] === '--tag' && argv[i + 1]) {
      tag = argv[++i]
    } else if (!argv[i].startsWith('--')) {
      positional.push(argv[i])
    }
  }
  const logPath = positional[0]
  if (!logPath) {
    console.error('Usage: node scripts/parse-kobold-grounding-log.mjs <log.md> [--out <dir>] [--tag <name>]')
    process.exit(1)
  }
  const stamp = new Date().toISOString().slice(0, 10)
  const baseTag = tag ?? basename(logPath, '.md').replace(/\s+/g, '-').slice(0, 40)
  if (!outDir) {
    const fieldNotes = join(nassilaTRoot, 'training', 'field-notes', `${baseTag}-${stamp}`)
    outDir = existsSync(nassilaTRoot) ? fieldNotes : join(process.cwd(), 'field-notes', `${baseTag}-${stamp}`)
  }
  return { logPath: resolve(logPath), outDir, tag: baseTag }
}

function decodeXmlEntities(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function normalizeForMatch(s) {
  return decodeXmlEntities(s)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function stripMarkdownFence(raw) {
  let t = raw.trim()
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '')
  }
  return t.trim()
}

function parseOutputJson(raw) {
  const text = stripMarkdownFence(raw)
  try {
    return { ok: true, value: JSON.parse(text), hadFence: raw.trim().startsWith('```') }
  } catch {
    // Try to find outermost JSON object in multiline output
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return { ok: true, value: JSON.parse(text.slice(start, end + 1)), hadFence: raw.trim().startsWith('```') }
      } catch {
        /* fall through */
      }
    }
    return { ok: false, raw: text.slice(0, 500) }
  }
}

function extractUserFields(userContent) {
  const passageMatch = userContent.match(/<manuscript_passage>\s*([\s\S]*?)\s*<\/manuscript_passage>/)
  const excerptMatch = userContent.match(
    /<source_excerpt\s+label="([^"]*)"(?:\s+url="([^"]*)")?\s*>\s*([\s\S]*?)\s*<\/source_excerpt>/
  )
  const passage = passageMatch?.[1]?.trim() ?? ''
  const excerptLabel = excerptMatch?.[1]?.trim() ?? ''
  const sourceUrl = excerptMatch?.[2]?.trim() ?? ''
  const excerptRaw = excerptMatch?.[3]?.trim() ?? ''
  const excerptText = decodeXmlEntities(excerptRaw)
  return { passage, excerptLabel, sourceUrl, excerptText, excerptRaw }
}

function passageLooksTruncated(passage) {
  if (!passage) return true
  const first = passage.trim().slice(0, 1)
  if (first && first === first.toLowerCase() && !/[\d("'[]/.test(first)) return true
  return false
}

function quoteEchoesClaim(claim, quote, excerptNorm) {
  const q = normalizeForMatch(quote)
  const c = normalizeForMatch(claim)
  if (!q || !c) return false
  const inClaim = c.includes(q) || q.includes(c.slice(0, Math.min(40, c.length)))
  const inExcerpt = excerptNorm.includes(q)
  return inClaim && !inExcerpt
}

function heuristicFlags({ passage, excerptText, output, hadFence, parseOk }) {
  const flags = []
  if (!parseOk) flags.push('parse_error')
  if (hadFence) flags.push('markdown_fence')
  if (passageLooksTruncated(passage)) flags.push('truncated_passage')
  const excerptNorm = normalizeForMatch(excerptText)
  const claims = output?.claims ?? []
  if (claims.length === 0) flags.push('no_claims')
  for (const c of claims) {
    if (c.verdict !== 'supported') continue
    const quotes = c.sourceQuotes ?? []
    if (quotes.length === 0) flags.push('supported_without_quotes')
    for (const q of quotes) {
      if (quoteEchoesClaim(c.claim ?? '', q, excerptNorm)) {
        flags.push('echo_false_positive')
        break
      }
    }
  }
  return [...new Set(flags)]
}

function csvEscape(value) {
  const s = value == null ? '' : String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function toCsv(rows, headers) {
  const lines = [headers.map(csvEscape).join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','))
  }
  return lines.join('\n') + '\n'
}

function splitLogBlocks(text) {
  const lines = text.split(/\r?\n/)
  const blocks = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('Input: ')) {
      const inputRaw = line.slice('Input: '.length)
      let timestamp = ''
      for (let j = i - 1; j >= Math.max(0, i - 6); j--) {
        const m = lines[j].match(/^\[(\d{2}:\d{2}:\d{2})\]/)
        if (m) {
          timestamp = m[1]
          break
        }
      }
      i++
      const outputLines = []
      while (i < lines.length) {
        if (lines[i].startsWith('Input: ') || lines[i].startsWith('Welcome to KoboldCpp')) break
        if (lines[i].startsWith('Output: ')) {
          outputLines.push(lines[i].slice('Output: '.length))
          i++
          while (
            i < lines.length &&
            !lines[i].startsWith('Input: ') &&
            !lines[i].startsWith('Processing Prompt') &&
            !lines[i].startsWith('Output: ') &&
            !lines[i].startsWith('Welcome to KoboldCpp')
          ) {
            outputLines.push(lines[i])
            i++
          }
          break
        }
        i++
      }
      blocks.push({ inputRaw, outputRaw: outputLines.join('\n'), timestamp })
      continue
    }
    i++
  }
  return blocks
}

function isGroundingCall(inputRaw) {
  return (
    inputRaw.includes('strict academic citation grounding assistant') &&
    inputRaw.includes('<manuscript_passage>')
  )
}

function countVerdicts(claims) {
  const counts = {
    supported: 0,
    weak: 0,
    not_in_source: 0,
    contradicted: 0,
    insufficient_evidence: 0
  }
  for (const c of claims) {
    const v = c.verdict
    if (v && counts[v] != null) counts[v]++
  }
  return counts
}

function main() {
  const { logPath, outDir, tag } = parseArgs(process.argv)
  const logText = readFileSync(logPath, 'utf8')
  mkdirSync(outDir, { recursive: true })

  const blocks = splitLogBlocks(logText).filter((b) => isGroundingCall(b.inputRaw))
  const callRows = []
  const claimRows = []
  const jsonlRows = []

  let callId = 0
  for (const block of blocks) {
    callId++
    let input
    try {
      input = JSON.parse(block.inputRaw)
    } catch (e) {
      callRows.push({
        call_id: callId,
        timestamp: block.timestamp,
        parse_status: 'input_json_error',
        review_flags: 'input_parse_error',
        expected_overall_verdict: '',
        reviewer_notes: ''
      })
      continue
    }

    const userMsg = input.messages?.find((m) => m.role === 'user')?.content ?? ''
    const { passage, excerptLabel, sourceUrl, excerptText } = extractUserFields(userMsg)
    const outParsed = parseOutputJson(block.outputRaw)
    const output = outParsed.ok ? outParsed.value : null
    const claims = output?.claims ?? []
    const counts = countVerdicts(claims)
    const flags = heuristicFlags({
      passage,
      excerptText,
      output,
      hadFence: outParsed.hadFence,
      parseOk: outParsed.ok
    })
    const masdarLite = /full\s*text\s*oa\s*unpaywall/i.test(excerptLabel)

    const id = `field-${tag}-${String(callId).padStart(3, '0')}`
    callRows.push({
      call_id: callId,
      id,
      timestamp: block.timestamp,
      model: input.model ?? '',
      passage_preview: passage.slice(0, 200),
      passage_chars: passage.length,
      source_url: sourceUrl,
      excerpt_type: excerptLabel,
      masdar_lite: masdarLite ? 'yes' : 'no',
      excerpt_chars: excerptText.length,
      actual_overall_verdict: output?.overallVerdict ?? (outParsed.ok ? '' : 'PARSE_ERROR'),
      claim_count: claims.length,
      supported: counts.supported,
      weak: counts.weak,
      not_in_source: counts.not_in_source,
      contradicted: counts.contradicted,
      insufficient_evidence: counts.insufficient_evidence,
      review_flags: flags.join('; '),
      expected_overall_verdict: '',
      reviewer_notes: ''
    })

    jsonlRows.push({
      id,
      task: 'l3_grounding',
      version: 1,
      source: 'field_audit_log',
      checkpoint: input.model ?? '',
      passage,
      source_excerpt: excerptText,
      meta: {
        label: excerptLabel,
        url: sourceUrl || undefined,
        masdar_lite: masdarLite,
        log_timestamp: block.timestamp || undefined,
        review_flags: flags
      },
      output: output ?? undefined,
      curation: {
        expected_overall_verdict: null,
        expected_claims: null,
        reviewer_notes: null
      }
    })

    claims.forEach((c, idx) => {
      const excerptNorm = normalizeForMatch(excerptText)
      const quotes = c.sourceQuotes ?? []
      const echo = quotes.some((q) => quoteEchoesClaim(c.claim ?? '', q, excerptNorm))
      const inExcerpt = quotes.some((q) => excerptNorm.includes(normalizeForMatch(q)))
      claimRows.push({
        call_id: callId,
        id: `${id}-c${idx + 1}`,
        claim_index: idx + 1,
        claim_text: c.claim ?? '',
        has_numeric: c.hasNumericClaim ? 'yes' : 'no',
        actual_verdict: c.verdict ?? '',
        source_quotes: quotes.join(' | '),
        quote_in_excerpt: inExcerpt ? 'yes' : quotes.length ? 'no' : '',
        quote_echoes_claim: echo ? 'yes' : 'no',
        review_flags: echo && c.verdict === 'supported' ? 'echo_false_positive' : '',
        expected_verdict: '',
        reviewer_notes: ''
      })
    })
  }

  const summary = {
    log: logPath,
    tag,
    grounding_calls: callRows.length,
    masdar_lite_calls: callRows.filter((r) => r.masdar_lite === 'yes').length,
    abstract_calls: callRows.filter((r) => r.excerpt_type === 'abstract').length,
    overall_verdicts: {},
    review_flag_counts: {},
    echo_false_positive_calls: callRows.filter((r) => r.review_flags.includes('echo_false_positive')).length
  }
  for (const row of callRows) {
    const v = row.actual_overall_verdict || 'unknown'
    summary.overall_verdicts[v] = (summary.overall_verdicts[v] ?? 0) + 1
    for (const f of (row.review_flags || '').split('; ').filter(Boolean)) {
      summary.review_flag_counts[f] = (summary.review_flag_counts[f] ?? 0) + 1
    }
  }

  const callHeaders = [
    'call_id',
    'id',
    'timestamp',
    'model',
    'passage_preview',
    'passage_chars',
    'source_url',
    'excerpt_type',
    'masdar_lite',
    'excerpt_chars',
    'actual_overall_verdict',
    'claim_count',
    'supported',
    'weak',
    'not_in_source',
    'contradicted',
    'insufficient_evidence',
    'review_flags',
    'expected_overall_verdict',
    'reviewer_notes'
  ]
  const claimHeaders = [
    'call_id',
    'id',
    'claim_index',
    'claim_text',
    'has_numeric',
    'actual_verdict',
    'source_quotes',
    'quote_in_excerpt',
    'quote_echoes_claim',
    'review_flags',
    'expected_verdict',
    'reviewer_notes'
  ]

  const callsPath = join(outDir, 'grounding-calls.csv')
  const claimsPath = join(outDir, 'grounding-claims.csv')
  const jsonlPath = join(outDir, 'grounding-field-notes.jsonl')
  const summaryPath = join(outDir, 'grounding-summary.md')

  writeFileSync(callsPath, toCsv(callRows, callHeaders), 'utf8')
  writeFileSync(claimsPath, toCsv(claimRows, claimHeaders), 'utf8')
  writeFileSync(
    jsonlPath,
    jsonlRows.map((r) => JSON.stringify(r)).join('\n') + '\n',
    'utf8'
  )

  const md = [
    `# Grounding field notes — ${tag}`,
    '',
    `- **Source log:** \`${logPath}\``,
    `- **Parsed:** ${new Date().toISOString()}`,
    `- **Grounding calls:** ${summary.grounding_calls}`,
    `- **Masdar-lite (full text oa unpaywall):** ${summary.masdar_lite_calls}`,
    `- **Abstract fallback:** ${summary.abstract_calls}`,
    `- **Calls flagged echo_false_positive:** ${summary.echo_false_positive_calls}`,
    '',
    '## Overall verdicts (model output)',
    '',
    ...Object.entries(summary.overall_verdicts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `- \`${k}\`: ${n}`),
    '',
    '## Review flags (heuristic — verify manually)',
    '',
    ...Object.entries(summary.review_flag_counts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `- \`${k}\`: ${n}`),
    '',
    '## Files',
    '',
    '| File | Purpose |',
    '|------|---------|',
    '| `grounding-calls.csv` | One row per L3 call; fill `expected_overall_verdict` + `reviewer_notes` |',
    '| `grounding-claims.csv` | Per-claim labels for boost/holdout curation |',
    '| `grounding-field-notes.jsonl` | Full passage/excerpt/output for NassilaT import |',
    '',
    '## S15+ curation workflow',
    '',
    '1. Open `grounding-calls.csv` in Excel/Sheets; sort by `review_flags`.',
    '2. For rows with `echo_false_positive` or suspicious `support`, set `expected_overall_verdict` and notes.',
    '3. Use `grounding-claims.csv` for per-claim fixes (supported → weak/not_in_source).',
    '4. Merge curated JSONL into NassilaT `training/data/l3_grounding_v*_boost.jsonl` after human review.',
    '',
    'Re-parse: `node scripts/parse-kobold-grounding-log.mjs "<log.md>"`',
    ''
  ].join('\n')

  writeFileSync(summaryPath, md, 'utf8')

  console.log(`Parsed ${summary.grounding_calls} grounding calls from ${logPath}`)
  console.log(`  Masdar-lite: ${summary.masdar_lite_calls} | Abstract: ${summary.abstract_calls}`)
  console.log(`  Echo false-positive flags: ${summary.echo_false_positive_calls}`)
  console.log(`Wrote:\n  ${callsPath}\n  ${claimsPath}\n  ${jsonlPath}\n  ${summaryPath}`)
}

main()
