import { createHash } from 'node:crypto'
import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const TESSDATA_FAST_VERSION = '4.1.0'
const LANGUAGES = ['eng', 'fra', 'ara']
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = join(root, 'resources', 'tesseract')

await mkdir(outputDir, { recursive: true })

const checksums = []
for (const language of LANGUAGES) {
  const fileName = `${language}.traineddata`
  const destination = join(outputDir, fileName)
  const temporary = `${destination}.tmp`
  const url =
    `https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/` +
    `${TESSDATA_FAST_VERSION}/${fileName}`

  console.log(`Downloading ${fileName} from tessdata_fast ${TESSDATA_FAST_VERSION}...`)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Download failed for ${fileName}: HTTP ${response.status}`)
  }

  const data = Buffer.from(await response.arrayBuffer())
  await writeFile(temporary, data)
  await rm(destination, { force: true })
  await rename(temporary, destination)

  const checksum = createHash('sha256').update(data).digest('hex')
  checksums.push(`${checksum}  ${fileName}`)
}

await writeFile(join(outputDir, 'checksums.sha256'), `${checksums.join('\n')}\n`)
console.log(`Installed ${LANGUAGES.length} language packs in ${outputDir}`)
