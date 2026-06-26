/**
 * Installs curated Antigravity Awesome Skills into .cursor/skills/
 * Source: https://github.com/sickn33/antigravity-awesome-skills (MIT)
 *
 * Run: npm run skills:install:antigravity
 * Also invoked from scripts/install-cursor-skills.mjs
 */
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const skillsDest = join(root, '.cursor', 'skills')

/** Curated after Nassila security audit (2026-06). */
const ANTIGRAVITY_SKILLS = [
  'electron-development',
  'threat-modeling-expert',
  'backend-security-coder',
  'i18n-localization',
  'llm-app-patterns',
  'llm-evaluation',
  'javascript-testing-patterns',
  'uxui-principles',
  'accesslint-audit',
  'verification-before-completion',
]

const REPO = 'sickn33/antigravity-awesome-skills'
const BRANCH = 'main'

async function fetchSkillMd(skillId) {
  const apiUrl = `https://api.github.com/repos/${REPO}/contents/skills/${skillId}/SKILL.md?ref=${BRANCH}`
  const res = await fetch(apiUrl, { headers: { 'User-Agent': 'nassila-skills-installer' } })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for skills/${skillId}/SKILL.md`)
  }
  const meta = await res.json()
  if (!meta.download_url) {
    throw new Error(`No download_url for skills/${skillId}/SKILL.md`)
  }
  const raw = await fetch(meta.download_url, { headers: { 'User-Agent': 'nassila-skills-installer' } })
  if (!raw.ok) {
    throw new Error(`HTTP ${raw.status} downloading skills/${skillId}/SKILL.md`)
  }
  return raw.text()
}

async function main() {
  mkdirSync(skillsDest, { recursive: true })

  console.log(`\n→ Antigravity Awesome Skills (${ANTIGRAVITY_SKILLS.length} curated)\n`)

  for (const skillId of ANTIGRAVITY_SKILLS) {
    const destDir = join(skillsDest, skillId)
    const destFile = join(destDir, 'SKILL.md')
    rmSync(destDir, { recursive: true, force: true })
    mkdirSync(destDir, { recursive: true })

    const content = await fetchSkillMd(skillId)
    writeFileSync(destFile, content, 'utf-8')
    console.log(`  Installed .cursor/skills/${skillId}`)
  }

  const manifest = join(skillsDest, 'ANTIGRAVITY-SKILLS.md')
  const manifestBody = `# Antigravity skills (curated for Nassila)

Installed by \`npm run skills:install:antigravity\` from [antigravity-awesome-skills](https://github.com/sickn33/antigravity-awesome-skills).

| Skill | Use in Nassila |
| --- | --- |
| \`electron-development\` | IPC, preload, sandbox, packaging |
| \`threat-modeling-expert\` | Trust-boundary reviews (renderer ↔ main ↔ network ↔ LLM) |
| \`backend-security-coder\` | Main-process fetch/SSRF, secrets |
| \`i18n-localization\` | en/ar parity, RTL |
| \`llm-app-patterns\` | Sanad grounding, structured LLM outputs |
| \`llm-evaluation\` | Grounding quality regressions |
| \`javascript-testing-patterns\` | Vitest, IPC mocks |
| \`uxui-principles\` | Ouroboros UI anti-slop |
| \`accesslint-audit\` | WCAG / a11y audits |
| \`verification-before-completion\` | Lint/test/tsc gate before done |

See [docs/SECURITY-FIX-PLAN.md](../docs/SECURITY-FIX-PLAN.md) for remediation priorities.
`
  writeFileSync(manifest, manifestBody, 'utf-8')
  console.log(`\n  Wrote .cursor/skills/ANTIGRAVITY-SKILLS.md`)
  console.log('\nDone.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
