import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import {
  MAX_PAPERS_FILE_BYTES,
  MAX_PAPERS_SCAN_DEPTH,
  MAX_PAPERS_SCAN_FILES
} from '../../shared/papers-limits'

export interface PaperCandidate {
  path: string
  name: string
  sizeBytes: number
}

/**
 * Recursive *.pdf scan under the chosen root only (SEC-01: the caller passes
 * a dialog-picked directory, never renderer-supplied paths). Count and size
 * caps come from shared/papers-limits.ts.
 */
export function listPaperFiles(rootPath: string): PaperCandidate[] {
  const candidates: PaperCandidate[] = []

  const walk = (dir: string, depth: number): void => {
    if (depth > MAX_PAPERS_SCAN_DEPTH || candidates.length >= MAX_PAPERS_SCAN_FILES) return
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      return
    }
    for (const entry of entries) {
      if (candidates.length >= MAX_PAPERS_SCAN_FILES) return
      const fullPath = join(dir, entry)
      let stats
      try {
        stats = statSync(fullPath)
      } catch {
        continue
      }
      if (stats.isDirectory()) {
        walk(fullPath, depth + 1)
        continue
      }
      if (!stats.isFile() || !entry.toLowerCase().endsWith('.pdf')) continue
      if (stats.size > MAX_PAPERS_FILE_BYTES || stats.size === 0) continue
      candidates.push({ path: fullPath, name: entry, sizeBytes: stats.size })
    }
  }

  walk(rootPath, 0)
  candidates.sort((a, b) => a.name.localeCompare(b.name))
  return candidates
}
