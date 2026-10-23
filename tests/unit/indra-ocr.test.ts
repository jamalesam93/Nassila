import { describe, expect, it } from 'vitest'

import { tidyLines } from '../../src/engine/maktab/ocr/indra/assemble'
import { components4, decodeDet, pageToInput } from '../../src/engine/maktab/ocr/indra/det-post'
import { orderXycut } from '../../src/engine/maktab/ocr/indra/order'
import { isDarkLine, widthBatches } from '../../src/engine/maktab/ocr/indra/rec-preproc'
import { chooseArabicPage } from '../../src/engine/maktab/ocr/indra/route'
import { flip } from '../../src/engine/maktab/ocr/indra/rtl'
import { rot90 } from '../../src/engine/maktab/ocr/indra/skew'
import type { GrayImage, LineBox } from '../../src/engine/maktab/ocr/indra/types'
import { Vocab } from '../../src/engine/maktab/ocr/indra/vocab'

const identityOps = {
  resize(src: GrayImage, width: number, height: number): GrayImage {
    if (width !== src.width || height !== src.height) {
      throw new Error(`test resize ${src.width}x${src.height} -> ${width}x${height}`)
    }
    return src
  },
  warp(src: GrayImage): GrayImage {
    return src
  }
}

describe('indra detector', () => {
  it('decodes one text line from a core-logit band', () => {
    const height = 4
    const width = 4
    const out = new Float32Array(3 * height * width)
    for (const x of [0, 1, 2]) {
      const i = 1 * width + x
      out[i] = 8
      out[height * width + i] = 1
      out[2 * height * width + i] = 1
    }
    const boxes = decodeDet(out, height, width)
    expect(boxes).toHaveLength(1)
    expect(boxes[0].x0).toBeCloseTo(-0.3, 5)
    expect(boxes[0].x1).toBeCloseTo(6.3, 5)
    expect(boxes[0].y0).toBeCloseTo(2, 5)
    expect(boxes[0].y1).toBeCloseTo(4, 5)
  })

  it('finds two separate 4-connected components', () => {
    const mask = new Uint8Array(16)
    mask[0] = 1
    mask[1] = 1
    mask[15] = 1
    const { count } = components4(mask, 4, 4)
    expect(count).toBe(3)
  })

  it('pads a page to a multiple of 32 without resizing when it already fits', () => {
    const gray: GrayImage = { width: 32, height: 32, data: new Uint8Array(32 * 32).fill(255) }
    const input = pageToInput(gray, 32, identityOps)
    expect(input.width).toBe(32)
    expect(input.height).toBe(32)
    expect(input.ink[0]).toBeCloseTo(0, 5)
  })
})

describe('indra rtl flip', () => {
  it('matches the Python Indra flip on Arabic, digits, and brackets', () => {
    expect(flip('مرحبا بالعالم')).toBe('ملاعلاب ابحرم')
    expect(flip('Hello مرحبا 123')).toBe('Hello ابحرم 123')
    expect(flip('النص (مهم)')).toBe('(مهم) صنلا')
    expect(flip('12.5 كجم')).toBe('مجك 12.5')
    expect(flip('A')).toBe('A')
    expect(flip(flip('النص (مهم)'))).toBe('النص (مهم)')
  })
})

describe('indra reading order', () => {
  it('reads the left column before the right column', () => {
    const boxes: LineBox[] = [
      { x0: 120, y0: 0, x1: 160, y1: 10, score: 1 },
      { x0: 0, y0: 0, x1: 40, y1: 10, score: 1 },
      { x0: 0, y0: 14, x1: 40, y1: 24, score: 1 },
      { x0: 120, y0: 14, x1: 160, y1: 24, score: 1 }
    ]
    expect(orderXycut(boxes)).toEqual([1, 2, 0, 3])
  })
})

describe('indra line batches', () => {
  it('keeps a much wider line in its own batch', () => {
    const batches = widthBatches([40, 40, 400])
    expect(batches).toHaveLength(2)
    expect(batches[0].slice().sort()).toEqual([0, 1])
    expect(batches[1]).toEqual([2])
  })
})

describe('indra page turns', () => {
  it('rotates a 2x2 page counter-clockwise', () => {
    const gray: GrayImage = { width: 2, height: 2, data: Uint8Array.of(1, 2, 3, 4) }
    const turned = rot90(gray, 1)
    expect(turned.width).toBe(2)
    expect(turned.height).toBe(2)
    expect(Array.from(turned.data)).toEqual([2, 4, 1, 3])
  })
})

describe('arabic page routing', () => {
  it('keeps an Indra page that has enough text', async () => {
    const chosen = await chooseArabicPage(
      async () => ({ text: 'نص عربي طويل بما يكفي لهذه الصفحة حتى يتجاوز حد المراجعة' }),
      async () => ({ text: 'paddle' })
    )
    expect(chosen.engine).toBe('indra')
    expect(chosen.result.text.startsWith('نص')).toBe(true)
  })

  it('falls back to Paddle when Indra returns almost nothing', async () => {
    const chosen = await chooseArabicPage(
      async () => ({ text: 'لا' }),
      async () => ({ text: 'paddle page' })
    )
    expect(chosen.engine).toBe('paddle')
  })

  it('falls back to Paddle when Indra throws', async () => {
    const chosen = await chooseArabicPage(
      async () => {
        throw new Error('session failed')
      },
      async () => ({ text: 'paddle page' })
    )
    expect(chosen.engine).toBe('paddle')
  })

  it('uses Paddle when Indra is not installed', async () => {
    const chosen = await chooseArabicPage(null, async () => ({ text: 'paddle only' }))
    expect(chosen.engine).toBe('paddle')
  })
})

describe('indra tidy and dark lines', () => {
  it('drops a dotted leader and keeps a lone dash', () => {
    const vocab = new Vocab([' ', 'a'])
    const boxes: LineBox[] = [
      { x0: 0, y0: 0, x1: 80, y1: 10, score: 1 },
      { x0: 0, y0: 20, x1: 8, y1: 30, score: 1 }
    ]
    const lines = [
      { text: '...', conf: 0.9, tokens: [] },
      { text: '-', conf: 0.9, tokens: [] }
    ]
    const tidy = tidyLines(boxes, lines, false, vocab)
    expect(tidy.lines.map((line) => line.text)).toEqual(['-'])
  })

  it('treats light text on a dark ground as a dark line', () => {
    const data = new Uint8Array(20 * 20).fill(20)
    for (let i = 0; i < 30; i++) data[i] = 250
    const dark = isDarkLine(
      { width: 20, height: 20, data },
      { x0: 0, y0: 0, x1: 19, y1: 19, score: 1 }
    )
    expect(dark).toBe(true)
  })
})
