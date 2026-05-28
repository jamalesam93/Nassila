/**
 * Rasterize build/nassila-icon.svg → build/icon.png for electron-builder.
 * Requires: npm install sharp --save-dev
 */
import sharp from 'sharp'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const svgPath = join(root, 'build', 'nassila-icon.svg')
const outPath = join(root, 'build', 'icon.png')

await sharp(readFileSync(svgPath), { density: 600 })
  .resize(512, 512)
  .png()
  .toFile(outPath)

console.log(`Wrote ${outPath}`)
