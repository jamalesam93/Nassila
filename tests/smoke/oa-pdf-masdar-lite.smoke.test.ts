/**
 * OA-PDF Masdar-lite smoke — exercises the 1.2.0 path without Electron UI or live LLM.
 * Run: npm test -- tests/smoke/oa-pdf-masdar-lite.smoke.test.ts
 * Live network leg (optional): SMOKE_OA_LIVE=1 npm test -- tests/smoke/oa-pdf-masdar-lite.smoke.test.ts
 */
import { beforeAll, describe, it, expect } from 'vitest'

beforeAll(async () => {
  await import('./setup-pdfjs-node')
})

import { fullTextFromOaPdfBytes } from '@engine/manuscript/oa-pdf-grounding'
import {
  selectSourceChunksForGrounding,
  GROUNDING_EXCERPT_MAX_CHARS,
  passageVerdictFromGroundingClaims
} from '@engine/manuscript/grounding-llm'
import { scorePassageAgainstSource } from '@engine/relevance/deterministic'
import { fetchOaUrlText } from '@engine/oa/fetch-oa'
import { LIVE_OA_PDF_URL, SMOKE_PASSAGE, minimalOaPdfBuffer } from './oa-pdf-fixtures'

const LIVE = process.env.SMOKE_OA_LIVE === '1'

describe('smoke: OA-PDF Masdar-lite (1.2.0)', () => {
  it('extracts embedded text from OA PDF bytes via Maktab', async () => {
    const pdfBytes = minimalOaPdfBuffer()
    const resolved = await fullTextFromOaPdfBytes(pdfBytes, 'https://example.org/oa/paper.pdf')

    expect(resolved).not.toBeNull()
    expect(resolved!.kind).toBe('full_text')
    expect(resolved!.coverage).toBe('full_text_oa_unpaywall')
    expect(resolved!.snippetSource).toBe('unpaywall')
    expect(resolved!.text.toLowerCase()).toContain('survival outcomes')
  })

  it('produces a grounding excerpt with non-trivial passage alignment', async () => {
    const pdfBytes = minimalOaPdfBuffer()
    const resolved = await fullTextFromOaPdfBytes(pdfBytes, 'https://example.org/oa/paper.pdf')
    expect(resolved).not.toBeNull()

    const excerpt = selectSourceChunksForGrounding(
      SMOKE_PASSAGE,
      resolved!.text,
      GROUNDING_EXCERPT_MAX_CHARS
    )
    expect(excerpt.length).toBeGreaterThan(20)

    const scored = scorePassageAgainstSource(SMOKE_PASSAGE, resolved!.text)
    expect(scored.bucket).not.toBe('low')
  })

  it('supports deterministic L3 verdict when mock claims quote the excerpt', async () => {
    const pdfBytes = minimalOaPdfBuffer()
    const resolved = await fullTextFromOaPdfBytes(pdfBytes, 'https://example.org/oa/paper.pdf')
    expect(resolved).not.toBeNull()

    const excerpt = selectSourceChunksForGrounding(
      SMOKE_PASSAGE,
      resolved!.text,
      GROUNDING_EXCERPT_MAX_CHARS
    )
    const quote = 'improved survival outcomes'
    expect(excerpt.toLowerCase()).toContain(quote)

    const verdict = passageVerdictFromGroundingClaims(
      [
        {
          claim: 'Treatment improved survival outcomes in the cohort.',
          verdict: 'supported',
          sourceQuotes: [quote]
        }
      ],
      'medium',
      excerpt
    )
    expect(verdict.status).toBe('pass')
  })

  it.runIf(LIVE)('live: fetches arXiv OA PDF and extracts text (network)', async () => {
    const fetched = await fetchOaUrlText(LIVE_OA_PDF_URL)
    expect(fetched.kind).toBe('pdf')
    expect(fetched.pdfBytes?.byteLength).toBeGreaterThan(1000)

    const resolved = await fullTextFromOaPdfBytes(fetched.pdfBytes!, fetched.url)
    expect(resolved).not.toBeNull()
    expect(resolved!.text.length).toBeGreaterThan(500)
    expect(resolved!.text.toLowerCase()).toMatch(/attention|transformer|neural/)
  }, 60_000)
})
