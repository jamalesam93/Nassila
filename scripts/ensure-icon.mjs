/**

 * Ensure build/icon.png + build/icon.ico exist (from build/nassila-icon.svg).

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


