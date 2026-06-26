import { validateExternalUrl } from './http'

const LLM_URL_ERROR = 'llm_url_not_allowed'

function llmUrlError(detail: string): Error {
  return new Error(`${LLM_URL_ERROR}: ${detail}`)
}

function isLocalLlmHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  return h === 'localhost' || h === '127.0.0.1'
}

/**
 * Validates an OpenAI-compatible LLM base URL before main-process fetch.
 * - Local runners: HTTP only on localhost / 127.0.0.1 (any port).
 * - Remote endpoints: HTTPS only; blocks private/metadata hosts via validateExternalUrl.
 */
export function validateLlmBaseUrl(rawUrl: string): URL {
  const trimmed = rawUrl.trim()
  if (!trimmed) {
    throw llmUrlError('empty URL')
  }

  let parsed: URL
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`
    parsed = new URL(withScheme)
  } catch {
    throw llmUrlError('invalid URL')
  }

  if (parsed.username || parsed.password) {
    throw llmUrlError('authenticated URLs are not allowed')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw llmUrlError('only HTTP(S) URLs are allowed')
  }

  const hostname = parsed.hostname.toLowerCase()

  if (isLocalLlmHost(hostname)) {
    if (parsed.protocol !== 'http:') {
      throw llmUrlError('local LLM runners must use HTTP')
    }
    return parsed
  }

  if (parsed.protocol !== 'https:') {
    throw llmUrlError('remote LLM endpoints must use HTTPS')
  }

  return validateExternalUrl(parsed.toString(), {
    allowHttp: false,
    allowLocalhost: false,
    allowPrivateHosts: false
  })
}

/** Normalized `{baseUrl}/v1/chat/completions` after policy validation. */
export function buildLlmChatCompletionsUrl(baseUrl: string): string {
  const validated = validateLlmBaseUrl(baseUrl)
  const withoutTrailingSlash = validated.toString().replace(/\/+$/, '')
  return `${withoutTrailingSlash}/v1/chat/completions`
}

export function isLlmUrlNotAllowedError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith(LLM_URL_ERROR)
}
