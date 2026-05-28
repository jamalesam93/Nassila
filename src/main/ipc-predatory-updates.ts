import { app, ipcMain, net } from 'electron'
import { readFile, writeFile, rename } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import type { PredatoryList, PredatoryListMeta, UpdateCheckResult } from '../shared/predatory'
import bundledListJson from '../engine/predatory/data.json'
import {
  MIRROR_JOURNALS_CSV,
  MIRROR_PUBLISHERS_CSV,
  MIRROR_SOURCE_URL,
  buildPredatoryListFromMirrorCsv,
  assertValidDownloadedList,
  fingerprintFromEtags
} from '../engine/predatory/sources/mirror'
import { shouldThrottlePredatoryNetworkCheck } from '../engine/predatory/throttle'

const LIST_FILENAME = 'predatory-list.json'
const META_FILENAME = 'predatory-list-meta.json'
const MAX_CSV_BYTES = 15 * 1024 * 1024
const FETCH_TIMEOUT_MS = 15_000

const bundledList = bundledListJson as unknown as PredatoryList

export { shouldThrottlePredatoryNetworkCheck, PREDATORY_NETWORK_THROTTLE_MS } from '../engine/predatory/throttle'

function listPath(): string {
  return join(app.getPath('userData'), LIST_FILENAME)
}

function metaPath(): string {
  return join(app.getPath('userData'), META_FILENAME)
}

function fingerprintFromResponse(res: Response): string {
  const etag = res.headers.get('etag')
  if (etag) return etag.trim()
  const lm = res.headers.get('last-modified')
  return `lm:${lm ?? res.url}`
}

async function netFetch(url: string, init?: RequestInit): Promise<Response> {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS)
  try {
    return await net.fetch(url, { ...init, signal: ac.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function readBodyLimited(res: Response): Promise<string> {
  const buf = await res.arrayBuffer()
  if (buf.byteLength > MAX_CSV_BYTES) {
    throw new Error('Downloaded list is too large')
  }
  return new TextDecoder('utf-8').decode(buf)
}

function defaultMeta(): PredatoryListMeta {
  return {
    version: bundledList.version,
    sourceUrl: bundledList.sourceUrl,
    fetchedAt: null,
    lastCheckedAt: null,
    lastNetworkAttemptAt: null,
    etag: null,
    entryCount: bundledList.journals.length + bundledList.publishers.length,
    origin: 'bundled',
    updateAvailablePending: false,
    remoteFingerprint: null
  }
}

async function loadMeta(): Promise<PredatoryListMeta> {
  try {
    if (!existsSync(metaPath())) return defaultMeta()
    const raw = await readFile(metaPath(), 'utf-8')
    const parsed = JSON.parse(raw) as PredatoryListMeta
    if (!parsed || typeof parsed !== 'object') return defaultMeta()
    return {
      ...defaultMeta(),
      ...parsed,
      origin: parsed.origin === 'downloaded' ? 'downloaded' : 'bundled'
    }
  } catch {
    return defaultMeta()
  }
}

async function saveMeta(meta: PredatoryListMeta): Promise<void> {
  await writeFile(metaPath(), JSON.stringify(meta, null, 2), 'utf-8')
}

export async function readActiveListForMain(): Promise<PredatoryList> {
  const p = listPath()
  if (existsSync(p)) {
    const raw = await readFile(p, 'utf-8')
    return JSON.parse(raw) as PredatoryList
  }
  return bundledList
}

export function registerPredatoryIpcHandlers(): void {
  ipcMain.handle('predatory:getList', async (): Promise<PredatoryList> => {
    return readActiveListForMain()
  })

  ipcMain.handle('predatory:getStatus', async (): Promise<PredatoryListMeta> => {
    const meta = await loadMeta()
    const hasUser = existsSync(listPath())
    const list = hasUser
      ? (JSON.parse(await readFile(listPath(), 'utf-8')) as PredatoryList)
      : bundledList
    return {
      ...meta,
      version: list.version,
      entryCount: list.journals.length + list.publishers.length,
      origin: hasUser ? 'downloaded' : 'bundled',
      sourceUrl: list.sourceUrl ?? MIRROR_SOURCE_URL
    }
  })

  ipcMain.handle('predatory:checkForUpdates', async (): Promise<UpdateCheckResult> => {
    const now = new Date().toISOString()
    const nowMs = Date.now()
    let meta = await loadMeta()
    const localList = await readActiveListForMain()
    const hasUser = existsSync(listPath())

    if (shouldThrottlePredatoryNetworkCheck(meta.lastNetworkAttemptAt, nowMs)) {
      return {
        upToDate: !meta.updateAvailablePending,
        remoteVersion: meta.remoteFingerprint,
        localVersion: localList.version,
        updateAvailable: meta.updateAvailablePending === true,
        throttled: true,
        message: 'Update check skipped (checked in the last 24 hours).'
      }
    }

    try {
      const [rj, rp] = await Promise.all([
        netFetch(MIRROR_JOURNALS_CSV, { method: 'HEAD' }),
        netFetch(MIRROR_PUBLISHERS_CSV, { method: 'HEAD' })
      ])

      if (!rj.ok || !rp.ok) {
        throw new Error(`Mirror HEAD failed (${rj.status} / ${rp.status})`)
      }

      const fp = fingerprintFromEtags(
        fingerprintFromResponse(rj),
        fingerprintFromResponse(rp)
      )

      const updateAvailable = !hasUser ? true : fp !== (meta.etag ?? '')

      meta = {
        ...meta,
        lastCheckedAt: now,
        lastNetworkAttemptAt: now,
        remoteFingerprint: fp,
        updateAvailablePending: updateAvailable
      }
      await saveMeta(meta)

      return {
        upToDate: !updateAvailable,
        remoteVersion: fp,
        localVersion: localList.version,
        updateAvailable,
        message: updateAvailable
          ? 'A newer community list snapshot may be available.'
          : 'Your predatory list is up to date.'
      }
    } catch (e) {
      meta = {
        ...meta,
        lastNetworkAttemptAt: now,
        lastCheckedAt: now
      }
      await saveMeta(meta)
      const msg = e instanceof Error ? e.message : 'Unknown error'
      return {
        upToDate: true,
        remoteVersion: null,
        localVersion: localList.version,
        updateAvailable: meta.updateAvailablePending === true,
        message: msg
      }
    }
  })

  ipcMain.handle(
    'predatory:applyUpdate',
    async (): Promise<{ meta: PredatoryListMeta; list: PredatoryList }> => {
      const now = new Date().toISOString()

      const [rj, rp] = await Promise.all([
        netFetch(MIRROR_JOURNALS_CSV, { method: 'GET' }),
        netFetch(MIRROR_PUBLISHERS_CSV, { method: 'GET' })
      ])

      if (!rj.ok || !rp.ok) {
        throw new Error(`Mirror download failed (${rj.status} / ${rp.status})`)
      }

      const jBody = await readBodyLimited(rj)
      const pBody = await readBodyLimited(rp)
      const list = buildPredatoryListFromMirrorCsv(jBody, pBody, now)
      assertValidDownloadedList(list)

      const fp = fingerprintFromEtags(
        fingerprintFromResponse(rj),
        fingerprintFromResponse(rp)
      )

      const tmp = `${listPath()}.tmp`
      await writeFile(tmp, JSON.stringify(list), 'utf-8')
      await rename(tmp, listPath())

      const meta: PredatoryListMeta = {
        version: list.version,
        sourceUrl: list.sourceUrl,
        fetchedAt: now,
        lastCheckedAt: now,
        lastNetworkAttemptAt: now,
        etag: fp,
        entryCount: list.journals.length + list.publishers.length,
        origin: 'downloaded',
        updateAvailablePending: false,
        remoteFingerprint: fp
      }
      await saveMeta(meta)

      return { meta, list }
    }
  )
}
