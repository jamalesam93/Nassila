/**
 * Rasterize build/nassila-icon.svg → build/icon.png + build/icon.ico (Windows).
 * Requires: sharp, to-ico (devDependencies)
 */
import sharp from 'sharp'
import toIco from 'to-ico'
import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const svgPath = join(root, 'build', 'nassila-icon.svg')
const pngPath = join(root, 'build', 'icon.png')
const icoPath = join(root, 'build', 'icon.ico')

const svg = readFileSync(svgPath)

await sharp(svg, { density: 600 }).resize(512, 512).png().toFile(pngPath)
console.log(`Wrote ${pngPath}`)

const icoSizes = [16, 24, 32, 48, 64, 128, 256]
const pngBuffers = await Promise.all(
  icoSizes.map((size) => sharp(svg, { density: 600 }).resize(size, size).png().toBuffer())
)
writeFileSync(icoPath, await toIco(pngBuffers))
console.log(`Wrote ${icoPath}`)
