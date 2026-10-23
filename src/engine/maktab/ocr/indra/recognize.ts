/**
 * One-page Indra OCR: orient, deskew, detect, recognize, reading order.
 * The language-model beam is not ported. Arabic lines use `rec_rtl.onnx`, which
 * has no `lm_rtl.npz`; the base `lm.npz` only rescores uncertain Latin lines.
 */
import { SPLIT_GAP, gutterCuts, mirrorBoxes, pageIsRtl, splitLine, tidyLines } from './assemble'
import { decodeDet, pageToInput } from './det-post'
import { decodeBlocksOrder, lineFeatures, orderXycut } from './order'
import { PAD_X, cropLine, isDarkLine, padBatch, widthBatches } from './rec-preproc'
import {
  VERTICAL,
  estimateSkew,
  orientInput,
  orientationClass,
  preview,
  turnPage
} from './skew'
import type { DetOutput, GrayImage, IndraImageOps, LineBox, LineRec, OrderOutput, RecOutput } from './types'
import type { Vocab } from './vocab'

const MIN_CONF = 0.5
const ADAPTIVE_MIN_H = 9
const ADAPTIVE_TARGET_H = 12
const ADAPTIVE_MAX_SIDE = 2048
const ROUTE_SURE = 0.95

export interface IndraModels {
  detLongSide: number
  recHeight: number
  recWindow: number
  scriptGroups: readonly string[]
  base: Vocab
  rtl: Vocab | null
  det(ink: Float32Array, height: number, width: number): Promise<DetOutput>
  script:
    | ((
        data: Float32Array,
        batch: number,
        height: number,
        width: number,
        widths: Int32Array
      ) => Promise<Float32Array>)
    | null
  rec(
    which: 'base' | 'rtl',
    data: Float32Array,
    batch: number,
    height: number,
    width: number,
    widths: Int32Array
  ): Promise<RecOutput>
  orient(ink: Float32Array): Promise<Float32Array | null>
  order(feats: Float32Array, n: number): Promise<OrderOutput | null>
}

function median(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

async function detect(gray: GrayImage, models: IndraModels, ops: IndraImageOps): Promise<LineBox[]> {
  const once = async (longSide: number): Promise<{ boxes: LineBox[]; scale: number }> => {
    const input = pageToInput(gray, longSide, ops)
    const out = await models.det(input.ink, input.height, input.width)
    return { boxes: decodeDet(out.data, out.height, out.width), scale: input.scale }
  }
  let found = await once(models.detLongSide)
  if (found.boxes.length >= 8) {
    const med = median(found.boxes.map((box) => box.y1 - box.y0))
    if (med < ADAPTIVE_MIN_H) {
      const longer =
        Math.floor(
          Math.min(ADAPTIVE_MAX_SIDE, (models.detLongSide * ADAPTIVE_TARGET_H) / Math.max(med, 1)) / 32
        ) * 32
      if (longer > models.detLongSide) found = await once(longer)
    }
  }
  for (const box of found.boxes) {
    box.x0 = Math.min(gray.width, Math.max(0, box.x0 / found.scale))
    box.x1 = Math.min(gray.width, Math.max(0, box.x1 / found.scale))
    box.y0 = Math.min(gray.height, Math.max(0, box.y0 / found.scale))
    box.y1 = Math.min(gray.height, Math.max(0, box.y1 / found.scale))
  }
  return found.boxes
}

function collapse(output: RecOutput, index: number): { ids: number[]; conf: number; steps: number[] } {
  const length = Number(output.lengths[index] ?? 0)
  const offset = index * output.timeSteps
  const ids: number[] = []
  const confs: number[] = []
  const steps: number[] = []
  for (let t = 0; t < length; t++) {
    const id = output.ids[offset + t] ?? 0n
    if (id === 0n) continue
    if (t > 0 && id === (output.ids[offset + t - 1] ?? 0n)) continue
    ids.push(Number(id))
    confs.push(Number(output.conf[offset + t] ?? 0))
    steps.push(t)
  }
  const conf = confs.length === 0 ? 0 : confs.reduce((sum, value) => sum + value, 0) / confs.length
  return { ids, conf, steps }
}

async function recognizeLines(
  gray: GrayImage,
  boxes: LineBox[],
  models: IndraModels,
  ops: IndraImageOps
): Promise<LineRec[]> {
  const dark = models.recWindow > 1 ? boxes.map((box) => isDarkLine(gray, box)) : null
  const crops = boxes.map((box, i) =>
    cropLine(gray, box, models.recHeight, 1, ops, dark ? dark[i] : null)
  )
  const tall =
    models.recWindow > 1
      ? boxes.map((box, i) => cropLine(gray, box, models.recHeight, models.recWindow, ops, dark ? dark[i] : null))
      : crops
  const results: LineRec[] = boxes.map(() => ({ text: '', conf: 0, tokens: [] }))
  if (boxes.length === 0) return results

  type Group = { which: 'base' | 'rtl'; indices: number[]; asChars: boolean }
  let groups: Group[] = [{ which: 'base', indices: boxes.map((_, i) => i), asChars: false }]
  if (models.script && models.rtl) {
    const names = new Array<'base' | 'rtl'>(boxes.length).fill('base')
    const sure = new Array<boolean>(boxes.length).fill(true)
    for (const part of widthBatches(crops.map((crop) => crop.width))) {
      const batch = padBatch(part.map((i) => crops[i]))
      const probs = await models.script(
        batch.data,
        batch.batch,
        batch.height,
        batch.width,
        batch.widths
      )
      const classes = probs.length === batch.batch ? 1 : Math.round(probs.length / batch.batch)
      for (let k = 0; k < part.length; k++) {
        const j = part[k]
        let name = 'base'
        let peak = 0
        if (classes === 1) {
          const p = probs[k]
          name = p > 0.5 ? 'cjk' : 'base'
          peak = Math.max(p, 1 - p)
        } else {
          let arg = 0
          for (let c = 1; c < classes; c++) {
            if (probs[k * classes + c] > probs[k * classes + arg]) arg = c
          }
          name = models.scriptGroups[arg] ?? 'base'
          peak = probs[k * classes + arg]
        }
        names[j] = name === 'rtl' ? 'rtl' : 'base'
        sure[j] = peak > ROUTE_SURE
      }
    }
    const baseIdx: number[] = []
    const rtlIdx: number[] = []
    for (let j = 0; j < names.length; j++) {
      if (names[j] === 'base' || !sure[j]) baseIdx.push(j)
      if (names[j] === 'rtl') rtlIdx.push(j)
    }
    groups = [
      { which: 'base', indices: baseIdx, asChars: false },
      { which: 'rtl', indices: rtlIdx, asChars: true }
    ]
  }

  const best = boxes.map(() => -1)
  for (const group of groups) {
    if (group.indices.length === 0) continue
    const source = group.which === 'base' ? tall : crops
    const vocab = group.which === 'rtl' && models.rtl ? models.rtl : models.base
    for (const part of widthBatches(group.indices.map((j) => source[j].width))) {
      const idx = part.map((i) => group.indices[i])
      const batch = padBatch(idx.map((j) => source[j]))
      const output = await models.rec(
        group.which,
        batch.data,
        batch.batch,
        batch.height,
        batch.width,
        batch.widths
      )
      const stride = batch.width / Math.max(output.timeSteps, 1)
      for (let k = 0; k < idx.length; k++) {
        const j = idx[k]
        const read = collapse(output, k)
        if (read.conf <= best[j]) continue
        best[j] = read.conf
        if (read.conf < MIN_CONF) {
          results[j] = { text: '', conf: read.conf, tokens: [] }
          continue
        }
        const box = boxes[j]
        const h = Math.max(1, box.y1 - box.y0)
        const ix0 = Math.floor(box.x0 - PAD_X * h)
        const cw = Math.ceil(box.x1 + PAD_X * h) - ix0
        const f = cw / Math.max(1, crops[j].width)
        results[j] = {
          text: vocab.decode(read.ids),
          conf: read.conf,
          tokens: read.steps.map((step, n) => ({
            v: group.asChars ? (vocab.chars[read.ids[n] - 1] ?? '') : read.ids[n],
            x: ix0 + (step + 0.5) * stride * f
          }))
        }
      }
    }
  }
  return results
}

async function readingOrder(
  boxes: LineBox[],
  lines: LineRec[],
  pageWidth: number,
  pageHeight: number,
  pageRtl: boolean,
  vertical: boolean,
  models: IndraModels
): Promise<number[]> {
  if (boxes.length < 2) return boxes.map((_, i) => i)
  if (vertical) return orderXycut(boxes)
  const geo = mirrorBoxes(boxes, pageWidth, pageRtl)
  const texts = lines.map((line) => line.text)
  const feats = lineFeatures(geo, pageWidth, pageHeight, texts)
  const out = await models.order(feats, boxes.length)
  if (!out) return orderXycut(geo)
  return decodeBlocksOrder(out.a, out.same, geo, out.cls)
}

export async function recognizeGrayPage(
  gray: GrayImage,
  models: IndraModels,
  ops: IndraImageOps
): Promise<{ text: string; confidence: number }> {
  if (gray.width < 2 || gray.height < 2) return { text: '', confidence: 0 }
  const small = preview(gray, ops)
  const skew = estimateSkew(small, ops)
  const oriented = Math.abs(skew) >= 0.3 ? ops.warp(small, skew, 'replicate') : small
  const quarter = orientationClass(await models.orient(orientInput(oriented, ops)))
  const turned = turnPage(gray, quarter, skew, small, ops)
  const boxes = await detect(turned.gray, models, ops)
  const recognized = await recognizeLines(turned.gray, boxes, models, ops)
  const pageRtl = pageIsRtl(recognized)
  const cuts = gutterCuts(boxes, recognized, models.base.spaceId)
  const splitBoxes: LineBox[] = []
  const splitLines: LineRec[] = []
  for (let i = 0; i < boxes.length; i++) {
    for (const part of splitLine(
      boxes[i],
      recognized[i].tokens,
      SPLIT_GAP,
      cuts[i] ?? [],
      pageRtl,
      models.base
    )) {
      splitBoxes.push(part.box)
      splitLines.push({ text: part.text, conf: recognized[i].conf, tokens: part.tokens })
    }
  }
  const tidy = tidyLines(splitBoxes, splitLines, pageRtl, models.base)
  const order = await readingOrder(
    tidy.boxes,
    tidy.lines,
    turned.gray.width,
    turned.gray.height,
    pageRtl,
    quarter === VERTICAL,
    models
  )
  const text = order.map((i) => tidy.lines[i]?.text ?? '').join('\n')
  const confs = order
    .map((i) => tidy.lines[i])
    .filter((line) => line && line.text.trim().length > 0)
    .map((line) => line.conf)
  const confidence = confs.length === 0 ? 0 : confs.reduce((sum, value) => sum + value, 0) / confs.length
  return { text, confidence }
}
