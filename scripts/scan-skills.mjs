/**
 * Dev-only scan of .cursor/skills for prompt-injection, exfiltration,
 * anti-refusal, and unicode-deception patterns in installed agent skills.
 * SkillSpector-style install gate (see docs/OUROBOROS.md "Agent patterns"
 * section): run via `npm run skills:scan`, and automatically at the end of
 * `npm run skills:install`. Never a runtime dependency.
 *
 * Exit codes:
 *  0  clean (or only `suspicious` findings, unless --strict)
 *  1  `critical` findings (or any findings with --strict)
 *
 * Flags:
 *  --allow    report only, always exit 0
 *  --strict   also fail on `suspicious` findings
 */
import { readdirSync, readFileSync, statSync } from 'fs'
import { dirname, join, relative } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const skillsDest = join(root, '.cursor', 'skills')

const RULES = [
  {
    id: 'P1_ignore_instructions',
    tier: 'critical',
    re: /ignore\s+(all\s+)?(previous|prior)\s+instructions?/i,
  },
  {
    id: 'P2_instruction_override',
    tier: 'critical',
    re: /(?:override|overwrite|replace|disregard)\s+(?:your\s+)?(?:current\s+)?(?:system\s+)?(?:prompt|instructions?|guidelines?|rules)/i,
  },
  {
    id: 'P3_self_read',
    tier: 'critical',
    re: /(?:read|open)\s+(?:your\s+)?(?:own\s+)?(?:system\s+prompt|system\s+instructions)|read\s+(?:your|its)\s+own\s+(?:source|instructions?)/i,
  },
  {
    id: 'A1_never_refuse',
    tier: 'critical',
    re: /(?:never|do\s+not|must\s+not)\s+(?:refuse|decline)\b/i,
  },
  {
    id: 'A2_conceal',
    tier: 'critical',
    re: /do\s+not\s+(?:mention|disclose|tell|reveal|say)\s+(?:this|the|your|that|any)/i,
  },
  {
    id: 'E1_exfil_verb',
    tier: 'suspicious',
    re: /(?:send|upload|post|exfiltrate|transmit|paste)\s+.{0,40}?(?:secret|api[_-]?key|password|credential|\.env)/i,
  },
  {
    id: 'E2_exfil_endpoint',
    tier: 'critical',
    re: /(?:pastebin\.com|webhook\.site|discord\.com\/api\/webhooks|api\.telegram\.org|requestbin|pipedream)/i,
  },
  {
    id: 'U1_unicode_deception',
    tier: 'critical',
    re: /(?:\u200B|\u200C|\u200D|\uFEFF|\u2060|\u2061|\u2062|\u2063|\u2064|\u202A|\u202B|\u202C|\u202D|\u202E)/,
  },
]

function markdownFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      markdownFiles(path, acc)
    } else if (entry.endsWith('.md') || entry.endsWith('.mdc')) {
      acc.push(path)
    }
  }
  return acc
}

function scanFile(filePath) {
  const findings = []
  const lines = readFileSync(filePath, 'utf-8').split('\n')
  for (let i = 0; i < lines.length; i += 1) {
    for (const rule of RULES) {
      const match = rule.re.exec(lines[i])
      if (!match) continue
      const snippet = lines[i].slice(
        Math.max(0, match.index - 20),
        Math.min(lines[i].length, match.index + match[0].length + 60),
      )
      findings.push({
        file: relative(root, filePath),
        line: i + 1,
        column: match.index + 1,
        ruleId: rule.id,
        tier: rule.tier,
        snippet: snippet.trim(),
      })
    }
  }
  return findings
}

function main() {
  const allow = process.argv.includes('--allow')
  const strict = process.argv.includes('--strict')

  let files
  try {
    files = markdownFiles(skillsDest)
  } catch {
    console.log('No .cursor/skills directory — nothing to scan.')
    process.exit(0)
  }
  if (files.length === 0) {
    console.log('No skill markdown found under .cursor/skills.')
    process.exit(0)
  }

  const findings = files.flatMap(scanFile)
  const critical = findings.filter((finding) => finding.tier === 'critical')
  const suspicious = findings.filter((finding) => finding.tier === 'suspicious')

  if (findings.length === 0) {
    console.log(`Skills scan clean: ${files.length} file(s), no findings.`)
    process.exit(0)
  }

  for (const finding of findings) {
    console.log(
      `${finding.file}:${finding.line}:${finding.column}  [${finding.tier} ${finding.ruleId}]  ${finding.snippet}`,
    )
  }
  console.log(
    `\nSkills scan: ${critical.length} critical, ${suspicious.length} suspicious finding(s) across ${files.length} file(s).`,
  )

  const fail = strict ? findings.length > 0 : critical.length > 0
  if (fail && !allow) {
    console.log('Blocked by skills install gate. Review the findings or re-run with --allow.')
    process.exit(1)
  }
  console.log(allow ? '(--allow: reporting only, gate bypassed)' : '(suspicious findings only: report, not blocked)')
}

main()
