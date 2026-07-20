import { createHash } from 'node:crypto'
import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const TESSDATA_VERSION = '4.1.0'
/** eng/fra: fast packs. ara: best LSTM pack — denser Arabic body pages need the accuracy. */
const LANGUAGE_SOURCES = [
  { language: 'eng', repo: 'tessdata_fast' },
  { language: 'fra', repo: 'tessdata_fast' },
  { language: 'ara', repo: 'tessdata_best' }
]
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = join(root, 'resources', 'tesseract')

await mkdir(outputDir, { recursive: true })

const checksums = []
for (const { language, repo } of LANGUAGE_SOURCES) {
  const fileName = `${language}.traineddata`
  const destination = join(outputDir, fileName)
  const temporary = `${destination}.tmp`
  const url =
    `https://raw.githubusercontent.com/tesseract-ocr/${repo}/` +
    `${TESSDATA_VERSION}/${fileName}`

  console.log(`Downloading ${fileName} from ${repo} ${TESSDATA_VERSION}...`)
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
  console.log(`  ${fileName}: ${(data.byteLength / 1024 / 1024).toFixed(1)} MB`)
}

await writeFile(join(outputDir, 'checksums.sha256'), `${checksums.join('\n')}\n`)
console.log(`Installed ${LANGUAGE_SOURCES.length} language packs in ${outputDir}`)
