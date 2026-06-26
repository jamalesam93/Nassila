const DEFAULT_TIMEOUT_MS = 8000
const DEFAULT_MAX_RESPONSE_BYTES = 1024 * 1024

export interface FetchPolicy {
  timeoutMs?: number
}

export interface ResponseReadPolicy {
  maxBytes?: number
}

export interface UrlPolicy {
  allowHttp?: boolean
  allowLocalhost?: boolean
  allowPrivateHosts?: boolean
}

export function validateExternalUrl(rawUrl: string, policy: UrlPolicy = {}): URL {
  const parsed = new URL(rawUrl.trim())
  const allowHttp = policy.allowHttp === true

  if (parsed.protocol !== 'https:' && !(allowHttp && parsed.protocol === 'http:')) {
    throw new Error('Only HTTP(S) URLs are allowed')
  }

  if (parsed.username || parsed.password) {
    throw new Error('Authenticated URLs are not allowed')
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  const localhostAllowed = policy.allowLocalhost === true && isLocalhost(hostname)

  if (!localhostAllowed && isLocalhost(hostname)) {
    throw new Error('Localhost URLs are not allowed')
  }

  if (!policy.allowPrivateHosts && !localhostAllowed && isPrivateHost(hostname)) {
    throw new Error('Private network URLs are not allowed')
  }

  if (!localhostAllowed && !policy.allowPrivateHosts && !hostname.includes('.') && !isIpv6Host(hostname)) {
    throw new Error('Single-label hostnames are not allowed')
  }

  return parsed
}

/** Returns null instead of throwing — for optional OA / publisher URLs that may be malformed. */
export function tryValidateExternalUrl(rawUrl: string, policy: UrlPolicy = {}): URL | null {
  try {
    return validateExternalUrl(rawUrl, policy)
  } catch {
    return null
  }
}

export async function fetchWithPolicy(
  input: string | URL,
  init: RequestInit = {},
  policy: FetchPolicy = {}
): Promise<Response> {
  const timeoutMs = policy.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(new Error('Request timed out')), timeoutMs)

  const abortExternal = () => controller.abort(init.signal?.reason)
  init.signal?.addEventListener('abort', abortExternal, { once: true })

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal
    })
  } finally {
    clearTimeout(timeoutId)
    init.signal?.removeEventListener('abort', abortExternal)
  }
}

export async function readTextResponse(
  response: Response,
  policy: ResponseReadPolicy = {}
): Promise<string> {
  const bytes = await readResponseBytes(response, policy.maxBytes)
  return new TextDecoder().decode(bytes)
}

export async function readJsonResponse<T>(
  response: Response,
  policy: ResponseReadPolicy = {}
): Promise<T> {
  const text = await readTextResponse(response, policy)
  return JSON.parse(text) as T
}

async function readResponseBytes(
  response: Response,
  maxBytes = DEFAULT_MAX_RESPONSE_BYTES
): Promise<Uint8Array> {
  const headerLength = response.headers.get('content-length')
  const declaredBytes = headerLength ? Number.parseInt(headerLength, 10) : Number.NaN

  if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
    throw new Error(`Response exceeded ${maxBytes} bytes`)
  }

  if (!response.body) {
    const buffer = new Uint8Array(await response.arrayBuffer())
    if (buffer.byteLength > maxBytes) {
      throw new Error(`Response exceeded ${maxBytes} bytes`)
    }
    return buffer
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue

      totalBytes += value.byteLength
      if (totalBytes > maxBytes) {
        await reader.cancel()
        throw new Error(`Response exceeded ${maxBytes} bytes`)
      }

      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const combined = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    combined.set(chunk, offset)
    offset += chunk.byteLength
  }

  return combined
}

function isLocalhost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

function isPrivateHost(hostname: string): boolean {
  return (
    hostname === '0.0.0.0' ||
    hostname === '169.254.169.254' ||
    hostname === 'metadata.google.internal' ||
    hostname.endsWith('.local') ||
    isPrivateIpv4(hostname) ||
    isPrivateIpv6(hostname)
  )
}

function isIpv6Host(hostname: string): boolean {
  return hostname.includes(':')
}

function isPrivateIpv4(hostname: string): boolean {
  const segments = hostname.split('.').map((segment) => Number.parseInt(segment, 10))
  if (segments.length !== 4 || segments.some((segment) => Number.isNaN(segment))) {
    return false
  }

  const [first, second] = segments
  return (
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  )
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase()
  return (
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80:')
  )
}
