import type { CslItem } from '../types'
import { importFromZotero } from './zotero'
import { importFromMendeley } from './mendeley'
import { importFromEndnote } from './endnote'

export type RefManagerType = 'zotero' | 'mendeley' | 'endnote'

export interface ImportResult {
  items: CslItem[]
  errors: string[]
  source: RefManagerType
}

export async function importFromRefManager(
  type: RefManagerType,
  path?: string
): Promise<ImportResult> {
  switch (type) {
    case 'zotero':
      return importFromZotero(path)
    case 'mendeley':
      return importFromMendeley(path)
    case 'endnote':
      return importFromEndnote(path)
  }
}
