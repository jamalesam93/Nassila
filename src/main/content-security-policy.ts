import { is } from '@electron-toolkit/utils'
import { session } from 'electron'

/**
 * Renderer CSP. Production blocks outbound connect-src (network goes through IPC).
 * Dev relaxes localhost + WebSocket for electron-vite HMR.
 */
export function contentSecurityPolicyHeaderValue(): string {
  if (is.dev) {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' http://localhost:* http://127.0.0.1:*",
      "style-src 'self' 'unsafe-inline' http://localhost:* http://127.0.0.1:*",
      "img-src 'self' data: blob: http://localhost:* http://127.0.0.1:*",
      "font-src 'self' data:",
      "connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'"
    ].join('; ')
  }

  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'"
  ].join('; ')
}

export function registerContentSecurityPolicy(): void {
  const csp = contentSecurityPolicyHeaderValue()
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const resourceType = details.resourceType
    if (resourceType !== 'mainFrame' && resourceType !== 'subFrame' && resourceType !== 'stylesheet') {
      callback({ responseHeaders: details.responseHeaders })
      return
    }
    const responseHeaders = { ...details.responseHeaders, 'Content-Security-Policy': [csp] }
    callback({ responseHeaders })
  })
}
