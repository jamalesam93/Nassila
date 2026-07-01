import { net } from 'electron'
import { networkStatusAfterProbe } from '../shared/network-status'

const REGISTRY_PROBE_URL = 'https://api.crossref.org/works?rows=0'
const PROBE_TIMEOUT_MS = 12_000

let consecutiveFailures = 0
let probeInFlight: Promise<'online' | 'offline'> | null = null

export async function probeRegistryReachable(timeoutMs = PROBE_TIMEOUT_MS): Promise<boolean> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await net.fetch(REGISTRY_PROBE_URL, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Nassila/1.0 (mailto:nassila-app@users.noreply.github.com)'
      }
    })
    return response.ok || response.status === 429 || response.status === 403
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

export async function checkNetworkStatus(): Promise<'online' | 'offline'> {
  if (probeInFlight) return probeInFlight
  probeInFlight = (async () => {
    const reachable = await probeRegistryReachable()
    const next = networkStatusAfterProbe(reachable, consecutiveFailures)
    consecutiveFailures = next.consecutiveFailures
    return next.status
  })()
  try {
    return await probeInFlight
  } finally {
    probeInFlight = null
  }
}

export function resetNetworkStatusState(): void {
  consecutiveFailures = 0
}
