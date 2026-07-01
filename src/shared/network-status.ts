export const NETWORK_PROBE_FAILURE_THRESHOLD = 3

export function networkStatusAfterProbe(
  reachable: boolean,
  priorFailures: number,
  failureThreshold = NETWORK_PROBE_FAILURE_THRESHOLD
): { status: 'online' | 'offline'; consecutiveFailures: number } {
  if (reachable) {
    return { status: 'online', consecutiveFailures: 0 }
  }
  const nextFailures = priorFailures + 1
  return {
    status: nextFailures >= failureThreshold ? 'offline' : 'online',
    consecutiveFailures: nextFailures
  }
}
