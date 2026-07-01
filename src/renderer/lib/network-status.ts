import type { NetworkStatus } from '../../preload/index'

export type NetworkCheckOptions = { reset?: boolean }

export async function refreshNetworkStatus(
  setNetworkStatus: (status: NetworkStatus) => void,
  opts?: NetworkCheckOptions
): Promise<NetworkStatus | undefined> {
  try {
    const status = await window.api?.checkNetwork(opts)
    if (status === 'online' || status === 'offline') {
      setNetworkStatus(status)
      return status
    }
  } catch {
    /* keep last known status */
  }
  return undefined
}
