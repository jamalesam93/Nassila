/**
 * Rasterize build/nassila-icon.svg → build/icon.png + build/icon.ico (Windows).
 * Requires: sharp (devDependencies)
 */
import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const svgPath = join(root, 'build', 'nassila-icon.svg')
const pngPath = join(root, 'build', 'icon.png')
const icoPath = join(root, 'build', 'icon.ico')

async function encodeIco(pngBuffers) {
  const frames = await Promise.all(
    pngBuffers.map(async (buf) => {
      const { data, info } = await sharp(buf)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })
      return { data, width: info.width, height: info.height, bpp: 4 }
    })
  )

  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(frames.length, 4)

  const dirs = []
  const dibs = []
  let offset = 6 + 16 * frames.length

  for (const frame of frames) {
    const dir = Buffer.alloc(16)
    const size = frame.data.length + 40
    dir.writeUInt8(frame.width === 256 ? 0 : frame.width, 0)
    dir.writeUInt8(frame.height === 256 ? 0 : frame.height, 1)
    dir.writeUInt8(0, 2)
    dir.writeUInt8(0, 3)
    dir.writeUInt16LE(1, 4)
    dir.writeUInt16LE(frame.bpp * 8, 6)
    dir.writeUInt32LE(size, 8)
    dir.writeUInt32LE(offset, 12)
    dirs.push(dir)
    offset += size

    const bmp = Buffer.alloc(40)
    bmp.writeUInt32LE(40, 0)
    bmp.writeInt32LE(frame.width, 4)
    bmp.writeInt32LE(frame.height * 2, 8)
    bmp.writeUInt16LE(1, 12)
    bmp.writeUInt16LE(frame.bpp * 8, 14)
    bmp.writeUInt32LE(0, 16)
    bmp.writeUInt32LE(frame.data.length, 20)

    const cols = frame.width * frame.bpp
    const rows = frame.height * cols
    const end = rows - cols
    const dib = Buffer.alloc(frame.data.length)
    for (let row = 0; row < rows; row += cols) {
      for (let col = 0; col < cols; col += frame.bpp) {
        const src = row + col
        const dst = end - row + col
        dib[dst] = frame.data[src + 2]
        dib[dst + 1] = frame.data[src + 1]
        dib[dst + 2] = frame.data[src]
        dib[dst + 3] = frame.data[src + 3]
      }
    }
    dibs.push(bmp, dib)
  }

  return Buffer.concat([header, ...dirs, ...dibs])
}

const svg = readFileSync(svgPath)

await sharp(svg, { density: 600 }).resize(512, 512).png().toFile(pngPath)
console.log(`Wrote ${pngPath}`)

const icoSizes = [16, 24, 32, 48, 64, 128, 256]
const pngBuffers = await Promise.all(
  icoSizes.map((size) => sharp(svg, { density: 600 }).resize(size, size).png().toBuffer())
)
writeFileSync(icoPath, await encodeIco(pngBuffers))
console.log(`Wrote ${icoPath}`)
