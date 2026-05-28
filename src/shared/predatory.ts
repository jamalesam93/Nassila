/** Shared between main and renderer for the predatory-journal list feature. */

export interface PredatoryPublisherRecord {
  name: string
  aliases?: string[]
  reason?: string
}

export interface PredatoryJournalRecord {
  name: string
  aliases?: string[]
  issn?: string[]
  publisher?: string
  reason?: string
}

export interface PredatoryList {
  version: string
  sourceUrl: string
  updatedAt: string
  publishers: PredatoryPublisherRecord[]
  journals: PredatoryJournalRecord[]
}

export interface PredatoryListMeta {
  version: string
  sourceUrl: string
  fetchedAt: string | null
  lastCheckedAt: string | null
  lastNetworkAttemptAt: string | null
  etag: string | null
  entryCount: number
  origin: 'bundled' | 'downloaded'
  /** From last check: remote appears newer than locally applied list */
  updateAvailablePending?: boolean
  remoteFingerprint?: string | null
}

export interface UpdateCheckResult {
  upToDate: boolean
  remoteVersion: string | null
  localVersion: string
  updateAvailable: boolean
  message?: string
  throttled?: boolean
}
