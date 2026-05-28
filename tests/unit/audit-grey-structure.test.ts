import { describe, expect, it } from 'vitest'
import { classifyGreyTags } from '../../src/engine/audit/grey'
import { checkStructure } from '../../src/engine/audit/structure'
import type { CslItem } from '../../src/engine/types'

describe('audit helpers', () => {
  it('tags preprints based on container-title hints', () => {
    const item = {
      id: 'x',
      type: 'article',
      'container-title': 'medRxiv'
    } as CslItem
    expect(classifyGreyTags(item)).toContain('preprint')
  })

  it('detects missing IMRAD sections', () => {
    const text = 'Introduction\nHello\nMethods\nStuff\nResults\nData\n'
    const tpl = {
      id: 'imrad',
      name: 'IMRAD',
      headings: {
        introduction: ['introduction'],
        methods: ['methods'],
        results: ['results'],
        discussion: ['discussion']
      }
    }
    const res = checkStructure(text, tpl)
    expect(res.missing).toContain('discussion')
  })
})

