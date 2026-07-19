/**
 * Ensure build/icon.png + build/icon.ico exist (from build/nassila-icon.svg),
 * then stamp electron.exe on Windows so npm run dev shows the Nassila icon.
 */
import { existsSync, statSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const svgPath = join(root, 'build', 'nassila-icon.svg')
const iconPng = join(root, 'build', 'icon.png')
const iconIco = join(root, 'build', 'icon.ico')

function isStale(target) {
  if (!existsSync(target)) return true
  if (!existsSync(svgPath)) return false
  return statSync(svgPath).mtimeMs > statSync(target).mtimeMs
}

if (isStale(iconPng) || isStale(iconIco)) {
  const result = spawnSync(process.execPath, [join(root, 'scripts', 'rasterize-icon.mjs')], {
    cwd: root,
    stdio: 'inherit'
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

if (process.platform === 'win32') {
  const stamp = spawnSync(process.execPath, [join(root, 'scripts', 'stamp-dev-electron-icon.mjs')], {
    cwd: root,
    stdio: 'inherit'
  })
  if (stamp.status !== 0) {
    console.warn('[ensure-icon] stamp-dev-electron-icon failed (non-fatal)')
  }
}
