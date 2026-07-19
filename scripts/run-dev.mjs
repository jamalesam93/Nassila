/**

 * Run electron-vite with ELECTRON_EXEC_PATH pointing at a stamped electron.exe

 * under a unique cache path (Windows DEV taskbar/title-bar icon fix).

 *

 * electron-vite ignores ELECTRON_OVERRIDE_DIST_PATH; it uses ELECTRON_EXEC_PATH.

 * NASSILA_DEV_RUNTIME lets main set a DEV AppUserModelId without relying on

 * app.isPackaged (which breaks if the binary is renamed away from electron.exe).

 */

import { existsSync, readFileSync } from 'node:fs'

import { dirname, join } from 'node:path'

import { fileURLToPath } from 'node:url'

import { spawnSync } from 'node:child_process'



const __dirname = dirname(fileURLToPath(import.meta.url))

const root = join(__dirname, '..')



spawnSync(process.execPath, [join(root, 'scripts', 'ensure-icon.mjs')], {

  cwd: root,

  stdio: 'inherit'

})



const runtimeDir = join(root, 'node_modules', '.cache', 'nassila-electron-runtime')

const runtimeExe = join(runtimeDir, 'electron.exe')

const env = { ...process.env }



env.NASSILA_DEV_RUNTIME = '1'



if (process.platform === 'win32' && existsSync(runtimeExe)) {

  env.ELECTRON_EXEC_PATH = runtimeExe

  env.ELECTRON_OVERRIDE_DIST_PATH = runtimeDir

  console.log('[dev] ELECTRON_EXEC_PATH=', runtimeExe)

} else if (process.platform === 'win32') {

  const execFile = join(runtimeDir, 'exec-path.txt')

  if (existsSync(execFile)) {

    const p = readFileSync(execFile, 'utf8').trim()

    if (existsSync(p)) {

      env.ELECTRON_EXEC_PATH = p

    }

  }

}



const electronViteBin = join(root, 'node_modules', 'electron-vite', 'bin', 'electron-vite.js')

const args = process.argv.slice(2)

const result = existsSync(electronViteBin)

  ? spawnSync(process.execPath, [electronViteBin, ...args], {

      cwd: root,

      stdio: 'inherit',

      env

    })

  : spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['electron-vite', ...args], {

      cwd: root,

      stdio: 'inherit',

      env,

      shell: process.platform === 'win32'

    })

process.exit(result.status ?? 1)


