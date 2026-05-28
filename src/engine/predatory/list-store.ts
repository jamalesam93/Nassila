import type { PredatoryList } from '../../shared/predatory'
import bundledList from './data.json'

let cache: PredatoryList = bundledList as unknown as PredatoryList
const listeners = new Set<() => void>()

export function getBundledPredatoryList(): PredatoryList {
  return bundledList as unknown as PredatoryList
}

export function getActivePredatoryListSync(): PredatoryList {
  return cache
}

export function setPredatoryListCache(next: PredatoryList): void {
  cache = next
  for (const l of listeners) {
    try {
      l()
    } catch {
      /* ignore */
    }
  }
}

export function subscribePredatoryList(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function notifyPredatoryListSubscribers(): void {
  for (const l of listeners) {
    try {
      l()
    } catch {
      /* ignore */
    }
  }
}
