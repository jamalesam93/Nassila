import type { AuditReport, CitationFinding } from '../manuscript/types'

export function exportReportJson(report: AuditReport): string {
  return JSON.stringify(report, null, 2)
}

/** Markdown evidence block for one finding (passage, excerpt, quotes). */
export function formatFindingEvidenceMarkdown(finding: CitationFinding): string {
  const lines: string[] = []
  const title =
    finding.resolvedItem?.title?.trim() ||
    finding.evidence[0]?.text?.slice(0, 120) ||
    finding.bibKey
  lines.push(`# ${title}`)
  lines.push(`bibKey: ${finding.bibKey}`)
  lines.push('')

  const sites = finding.citeSites ?? []
  if (sites.length === 0) {
    lines.push('_No cite sites evaluated._')
    return lines.join('\n')
  }

  let i = 0
  for (const s of sites) {
    i++
    lines.push(`## Cite site ${i}`)
    lines.push(`Span: ${s.inTextSpan.raw}`)
    lines.push('')
    lines.push('### Passage window')
    lines.push(s.passageWindow || '_empty_')
    lines.push('')
    if (s.sourceExcerpt?.trim()) {
      lines.push('### Source excerpt')
      if (s.sourceExcerptUrl) lines.push(`URL: ${s.sourceExcerptUrl}`)
      lines.push(s.sourceExcerpt)
      lines.push('')
    }
    if (s.claimGrounding?.length) {
      lines.push('### Claims')
      for (const c of s.claimGrounding) {
        lines.push(`- **${c.verdict}**: ${c.claim}`)
        for (const q of c.sourceQuotes ?? []) {
          lines.push(`  - Quote: "${q}"`)
        }
      }
      lines.push('')
    }
  }
  return lines.join('\n')
}

function citationFindingBullet(f: CitationFinding): string {
  return `- **${f.bibKey}** — integrity:${f.referenceIntegrityRisk} — L1:${f.layers.registry.status} L2:${f.layers.metadata.status} L3:${f.layers.passage.status} (${f.l3Coverage})`
}

export function exportReportMarkdown(report: AuditReport): string {
  const lines: string[] = []
  lines.push(`# Manuscript audit report`)
  lines.push(``)
  lines.push(`Generated: ${report.generatedAt}`)
  lines.push(`Network: ${report.networkStatus}`)
  lines.push(`Template: ${report.template.name}${report.template.strict ? ' (strict)' : ''}`)
  lines.push(`Manuscript words: ${report.manuscript.wordCount}`)
  lines.push(``)

  lines.push(`## Summary (L3 passage rollup)`)
  const counts = countPassageRollup(report)
  lines.push(`- Pass: ${counts.pass}, Warn: ${counts.warn}, Fail: ${counts.fail}, Skipped: ${counts.skipped}, Insufficient evidence: ${counts.insufficient}`)
  lines.push(``)

  lines.push(`## Findings`)
  for (const f of report.findings) {
    lines.push(citationFindingBullet(f))
    if (f.l3Score) lines.push(`  - Deterministic bucket (worst site): ${f.l3Score}`)
    if (f.citeSites && f.citeSites.length > 0) {
      let i = 0
      for (const s of f.citeSites) {
        i++
        lines.push(`  - **Cite site ${i}** — span:"${s.inTextSpan.raw.slice(0, 80)}${s.inTextSpan.raw.length > 80 ? '…' : ''}" — overlap:${(s.deterministicScore * 100).toFixed(0)}% (${s.deterministicBucket}) — verdict:${JSON.stringify(s.passageVerdict)}`)
        lines.push('')
        lines.push(`    _Passage window:_ ${s.passageWindow.slice(0, 400)}${s.passageWindow.length > 400 ? '…' : ''}`)
        if (s.claimGrounding?.length) {
          lines.push(`    | Claim | Verdict | Quotes |`)
          lines.push(`    | --- | --- | --- |`)
          for (const c of s.claimGrounding) {
            const quotes = (c.sourceQuotes ?? []).join(' / ').slice(0, 200)
            lines.push(`    | ${c.claim.slice(0, 120)} | ${c.verdict} | ${quotes} |`)
          }
        }
        if (s.llmParseWarning) lines.push(`    _Parse note:_ ${s.llmParseWarning}`)
        lines.push('')
      }
    }
  }
  lines.push(``)
  lines.push(`## Sources`)
  for (const s of report.sources) {
    lines.push(`- ${s.name}: ${s.url}`)
  }
  lines.push(``)
  return lines.join('\n')
}

function countPassageRollup(report: AuditReport): {
  pass: number
  warn: number
  fail: number
  skipped: number
  insufficient: number
} {
  const o = { pass: 0, warn: 0, fail: 0, skipped: 0, insufficient: 0 }
  for (const f of report.findings) {
    switch (f.layers.passage.status) {
      case 'pass':
        o.pass++
        break
      case 'warn':
        o.warn++
        break
      case 'fail':
        o.fail++
        break
      case 'skipped':
        o.skipped++
        break
      case 'insufficient_evidence':
        o.insufficient++
        break
      default:
        break
    }
  }
  return o
}
