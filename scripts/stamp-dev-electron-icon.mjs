/**

 * Build a DEV Electron runtime with Nassila's icon at a unique path so Windows

 * does not reuse the cached Electron atom for node_modules/.../electron.exe.

 *

 * Keep the binary named electron.exe — renaming it makes app.isPackaged=true on

 * Windows and breaks electron-vite DEV (is.dev / renderer URL / AUMID).

 *

 * electron-vite reads ELECTRON_EXEC_PATH (not ELECTRON_OVERRIDE_DIST_PATH).

 */

import {

  existsSync,

  mkdirSync,

  writeFileSync,

  readFileSync,

  statSync,

  cpSync,

  readdirSync

} from 'node:fs'

import { dirname, join } from 'node:path'

import { fileURLToPath } from 'node:url'

import { createRequire } from 'node:module'



const __dirname = dirname(fileURLToPath(import.meta.url))

const root = join(__dirname, '..')

const iconIco = join(root, 'build', 'icon.ico')

const runtimeDir = join(root, 'node_modules', '.cache', 'nassila-electron-runtime')

const runtimeExe = join(runtimeDir, 'electron.exe')

const stampMarker = join(runtimeDir, '.nassila-icon-stamped')



export function getNassilaElectronRuntimeDir() {

  return runtimeDir

}



export function getNassilaElectronRuntimeExe() {

  return runtimeExe

}



if (process.platform !== 'win32') {

  process.exit(0)

}



if (!existsSync(iconIco)) {

  console.warn('[stamp-dev-electron-icon] missing build/icon.ico — skip')

  process.exit(0)

}



const require = createRequire(import.meta.url)

let electronDist

try {

  electronDist = join(dirname(require.resolve('electron/package.json')), 'dist')

} catch {

  console.warn('[stamp-dev-electron-icon] electron package not found — skip')

  process.exit(0)

}



const sourceExe = join(electronDist, 'electron.exe')

if (!existsSync(sourceExe)) {

  console.warn('[stamp-dev-electron-icon] electron.exe not found — skip')

  process.exit(0)

}



mkdirSync(runtimeDir, { recursive: true })



const iconBuf = readFileSync(iconIco)

const iconSig = `${iconBuf.byteLength}:${iconBuf.subarray(0, 32).toString('hex')}`

const sourceMtime = String(statSync(sourceExe).mtimeMs)

const desired = `${iconSig}|${sourceMtime}|fulldist|electron-exe-v3`



let needsSync = !existsSync(runtimeExe)

if (!needsSync) {

  try {

    needsSync = readFileSync(stampMarker, 'utf8').trim() !== desired

  } catch {

    needsSync = true

  }

}



if (needsSync) {

  console.log('[stamp-dev-electron-icon] syncing Electron dist →', runtimeDir)

  for (const name of readdirSync(electronDist)) {

    const src = join(electronDist, name)

    const dest = join(runtimeDir, name)

    cpSync(src, dest, { recursive: true, force: true })

  }



  const rceditMod = await import('rcedit')

  const rcedit = rceditMod.default ?? rceditMod

  await rcedit(runtimeExe, {

    icon: iconIco,

    'version-string': {

      ProductName: 'Nassila',

      FileDescription: 'Nassila',

      CompanyName: 'Nassila',

      InternalName: 'Nassila',

      OriginalFilename: 'Nassila.exe'

    }

  })



  writeFileSync(stampMarker, `${desired}\n`)

  console.log('[stamp-dev-electron-icon] prepared DEV runtime at', runtimeDir)

} else {

  console.log('[stamp-dev-electron-icon] DEV runtime already stamped')

}



writeFileSync(join(runtimeDir, 'override-path.txt'), runtimeDir)

writeFileSync(join(runtimeDir, 'exec-path.txt'), runtimeExe)


