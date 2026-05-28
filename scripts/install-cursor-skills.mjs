/**
 * Installs curated Agent Skills into .cursor/skills/ (see VoltAgent/awesome-agent-skills).
 * Run: npm run skills:install
 *
 * Upstream licenses apply. Re-run to refresh; zips cache under .cursor/.skills-vendor/
 */
import { createWriteStream, existsSync, mkdirSync, cpSync, rmSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execFileSync } from 'child_process'
import https from 'https'
import http from 'http'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const skillsDest = join(root, '.cursor', 'skills')
const vendor = join(root, '.cursor', '.skills-vendor')

const ZIPS = [
  {
    file: 'vercel-labs-agent-skills.zip',
    url: 'https://github.com/vercel-labs/agent-skills/archive/refs/heads/main.zip',
    copies: [
      ['agent-skills-main/skills/react-best-practices', 'react-best-practices'],
      ['agent-skills-main/skills/composition-patterns', 'composition-patterns'],
      ['agent-skills-main/skills/web-design-guidelines', 'web-design-guidelines'],
    ],
  },
  {
    file: 'openai-skills.zip',
    url: 'https://github.com/openai/skills/archive/refs/heads/main.zip',
    copies: [
      ['skills-main/skills/.curated/playwright', 'playwright'],
      ['skills-main/skills/.curated/security-best-practices', 'security-best-practices'],
    ],
  },
  {
    file: 'trailofbits-skills.zip',
    url: 'https://github.com/trailofbits/skills/archive/refs/heads/main.zip',
    copies: [
      [
        'skills-main/plugins/ask-questions-if-underspecified/skills/ask-questions-if-underspecified',
        'ask-questions-if-underspecified',
      ],
    ],
  },
  {
    file: 'anthropics-skills.zip',
    url: 'https://github.com/anthropics/skills/archive/refs/heads/main.zip',
    copies: [['skills-main/skills/skill-creator', 'skill-creator']],
  },
  {
    file: 'mcollina-skills.zip',
    url: 'https://github.com/mcollina/skills/archive/refs/heads/main.zip',
    copies: [
      ['skills-main/skills/node', 'mcollina-node'],
      ['skills-main/skills/typescript-magician', 'mcollina-typescript-magician'],
    ],
  },
  {
    file: 'getsentry-skills.zip',
    url: 'https://github.com/getsentry/skills/archive/refs/heads/main.zip',
    copies: [
      ['skills-main/plugins/sentry-skills/skills/code-review', 'sentry-code-review'],
      ['skills-main/plugins/sentry-skills/skills/find-bugs', 'sentry-find-bugs'],
    ],
  },
]

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const doReq = (u, depth) => {
      if (depth > 12) return reject(new Error('Too many redirects'))
      const lib = u.startsWith('https:') ? https : http
      lib
        .get(u, { headers: { 'User-Agent': 'citations-style-skills-installer' } }, (res) => {
          if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
            res.resume()
            return doReq(new URL(res.headers.location, u).href, depth + 1)
          }
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode} for ${u}`))
            return
          }
          const out = createWriteStream(dest)
          res.pipe(out)
          out.on('finish', () => out.close(resolve))
          out.on('error', reject)
        })
        .on('error', reject)
    }
    doReq(url, 0)
  })
}

function unzip(zipPath, outDir) {
  mkdirSync(outDir, { recursive: true })
  if (process.platform === 'win32') {
    const z = zipPath.replace(/'/g, "''")
    const o = outDir.replace(/'/g, "''")
    execFileSync(
      'powershell.exe',
      ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${z}' -DestinationPath '${o}' -Force`],
      { stdio: 'inherit' },
    )
  } else {
    execFileSync('unzip', ['-o', '-q', zipPath, '-d', outDir], { stdio: 'inherit' })
  }
}

function findCursorVercelSkillsDir() {
  const home = process.env.USERPROFILE || process.env.HOME
  if (!home) return null
  const vercelBase = join(home, '.cursor', 'plugins', 'cache', 'cursor-public', 'vercel')
  if (!existsSync(vercelBase)) return null
  for (const hash of readdirSync(vercelBase)) {
    const skills = join(vercelBase, hash, 'skills')
    if (existsSync(join(skills, 'shadcn', 'SKILL.md'))) return skills
  }
  return null
}

function copyShadcnFromCache() {
  const skillsRoot = findCursorVercelSkillsDir()
  if (!skillsRoot) {
    console.warn('Optional: shadcn not copied (Cursor Vercel plugin cache not found).')
    return
  }
  const src = join(skillsRoot, 'shadcn')
  if (!existsSync(src)) return
  const dest = join(skillsDest, 'shadcn')
  rmSync(dest, { recursive: true, force: true })
  cpSync(src, dest, { recursive: true })
  console.log('Copied shadcn from local Cursor Vercel plugin cache.')
}

async function main() {
  mkdirSync(skillsDest, { recursive: true })
  mkdirSync(vendor, { recursive: true })

  for (const spec of ZIPS) {
    const zipPath = join(vendor, spec.file)
    const extractDir = join(vendor, spec.file.replace(/\.zip$/i, ''))
    console.log(`\n→ ${spec.url}`)
    if (!existsSync(zipPath)) {
      await downloadFile(spec.url, zipPath)
      console.log(`  Downloaded ${spec.file}`)
    } else {
      console.log(`  Using cached ${spec.file}`)
    }
    rmSync(extractDir, { recursive: true, force: true })
    unzip(zipPath, extractDir)

    for (const [relSrc, destName] of spec.copies) {
      const src = join(extractDir, relSrc)
      const dest = join(skillsDest, destName)
      if (!existsSync(src)) {
        console.error(`  Missing path in archive: ${relSrc}`)
        process.exitCode = 1
        continue
      }
      rmSync(dest, { recursive: true, force: true })
      cpSync(src, dest, { recursive: true })
      console.log(`  Installed .cursor/skills/${destName}`)
    }
  }

  copyShadcnFromCache()
  console.log('\nDone. See .cursor/skills/SKILLS-AUDIT.md for review notes.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
