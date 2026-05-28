import type { CslItem } from '../types'
import type { GreyTag } from '../manuscript/types'

const PREPRINT_CONTAINER_HINTS = [
  'arxiv',
  'medrxiv',
  'biorxiv',
  'chemrxiv',
  'research square',
  'ssrn'
]

export function classifyGreyTags(item: CslItem): GreyTag[] {
  const tags: GreyTag[] = []
  const type = item.type

  if (type === 'thesis') tags.push('thesis')
  if (type === 'report') tags.push('report')
  if (type === 'webpage') tags.push('webpage')
  if (type === 'post' || type === 'post-weblog') tags.push('post')

  const container = (item['container-title'] ?? '').toLowerCase()
  if (PREPRINT_CONTAINER_HINTS.some((h) => container.includes(h))) {
    tags.push('preprint')
  }

  if (tags.length === 0 && (type === 'manuscript' || type === 'document')) {
    tags.push('other')
  }

  return Array.from(new Set(tags))
}

