/**
 * Stamp Nassila icon + version strings onto a packaged Windows exe.
 *
 * Must run on dist/win-unpacked/Nassila.exe BEFORE NSIS/portable artifacts are
 * built from that folder. Stamping after `electron-builder --win nsis` only
 * updates win-unpacked — the installer already embedded the unstamped exe
 * (desktop/Start Menu shortcuts then show the Electron atom).
 *
 * Usage:
 *   node scripts/stamp-win-exe-icon.mjs
 *   node scripts/stamp-win-exe-icon.mjs "C:\\Path\\to\\Nassila.exe"
 */
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const iconIco = join(root, 'build', 'icon.ico')
const defaultExe = join(root, 'dist', 'win-unpacked', 'Nassila.exe')
const exe = process.argv[2] ? process.argv[2] : defaultExe

function readProductName(exePath) {
  try {
    const ps = `(Get-Item -LiteralPath '${exePath.replace(/'/g, "''")}').VersionInfo.ProductName`
    return execFileSync('powershell.exe', ['-NoProfile', '-Command', ps], {
      encoding: 'utf8'
    }).trim()
  } catch {
    return null
  }
}

if (process.platform !== 'win32') {
  process.exit(0)
}

if (!existsSync(iconIco)) {
  console.error('[stamp-win-exe-icon] missing build/icon.ico')
  process.exit(1)
}

if (!existsSync(exe)) {
  console.error('[stamp-win-exe-icon] missing', exe)
  process.exit(1)
}

const rcedit = (await import('rcedit')).default ?? (await import('rcedit'))
await rcedit(exe, {
  icon: iconIco,
  'version-string': {
    ProductName: 'Nassila',
    FileDescription: 'Nassila',
    CompanyName: 'Nassila',
    InternalName: 'Nassila',
    OriginalFilename: 'Nassila.exe'
  }
})

const after = readProductName(exe)
if (after !== 'Nassila') {
  console.error('[stamp-win-exe-icon] ProductName still not Nassila:', after)
  process.exit(1)
}

console.log('[stamp-win-exe-icon] stamped', exe)
