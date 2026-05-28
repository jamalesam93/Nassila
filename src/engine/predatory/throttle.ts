/** Minimum interval between mirror network checks (24 hours). */
export const PREDATORY_NETWORK_THROTTLE_MS = 24 * 60 * 60 * 1000

export function shouldThrottlePredatoryNetworkCheck(
  lastNetworkAttemptIso: string | null,
  nowMs: number
): boolean {
  if (!lastNetworkAttemptIso) return false
  const t = Date.parse(lastNetworkAttemptIso)
  if (Number.isNaN(t)) return false
  return nowMs - t < PREDATORY_NETWORK_THROTTLE_MS
}
