import { is } from '@electron-toolkit/utils'
import { session } from 'electron'
import { productionContentSecurityPolicy } from '../shared/content-security-policy'

export { productionContentSecurityPolicy as contentSecurityPolicyHeaderValue }

/**
 * Production renderer CSP. Network from the page goes through IPC only (connect-src 'self').
 * Dev skips CSP entirely so electron-vite HMR is not blocked.
 */
export function registerContentSecurityPolicy(): void {
  if (is.dev) {
    return
  }

  const csp = productionContentSecurityPolicy()
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (details.resourceType !== 'mainFrame') {
      callback({ responseHeaders: details.responseHeaders })
      return
    }
    const responseHeaders = { ...details.responseHeaders, 'Content-Security-Policy': [csp] }
    callback({ responseHeaders })
  })
}
