import { ipcMain, safeStorage, app } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

type LlmConfig = {
  baseUrl: string
  model: string
}

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

type SecretsFile = { llmKeyBase64?: string }

function secretsPath(): string {
  return join(app.getPath('userData'), 'secrets.json')
}

async function readSecrets(): Promise<SecretsFile> {
  try {
    const raw = await readFile(secretsPath(), 'utf-8')
    const parsed = JSON.parse(raw) as SecretsFile
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

async function writeSecrets(secrets: SecretsFile): Promise<void> {
  await writeFile(secretsPath(), JSON.stringify(secrets, null, 2), 'utf-8')
}

function requireEncryption(): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('safeStorage encryption is not available on this platform')
  }
}

async function getLlmKey(): Promise<string> {
  requireEncryption()
  const secrets = await readSecrets()
  if (!secrets.llmKeyBase64) throw new Error('No LLM API key set')
  const encrypted = Buffer.from(secrets.llmKeyBase64, 'base64')
  return safeStorage.decryptString(encrypted)
}

export function registerLlmIpcHandlers(): void {
  ipcMain.handle('secrets:isEncryptionAvailable', () => safeStorage.isEncryptionAvailable())

  ipcMain.handle('secrets:hasLlmKey', async (): Promise<boolean> => {
    if (!safeStorage.isEncryptionAvailable()) return false
    try {
      const secrets = await readSecrets()
      return Boolean(secrets.llmKeyBase64 && secrets.llmKeyBase64.length > 10)
    } catch {
      return false
    }
  })

  ipcMain.handle('secrets:setLlmKey', async (_event, apiKey: unknown, opts?: unknown) => {
    if (typeof apiKey !== 'string') throw new Error('Invalid API key')
    const allowShort = !!(opts && typeof opts === 'object' && (opts as { allowShortPlaceholder?: unknown }).allowShortPlaceholder === true)
    const trimmed = apiKey.trim()
    if ((!allowShort && trimmed.length < 10) || trimmed.length < 1) throw new Error('Invalid API key')
    requireEncryption()
    const encrypted = safeStorage.encryptString(trimmed)
    const secrets = await readSecrets()
    secrets.llmKeyBase64 = Buffer.from(encrypted).toString('base64')
    await writeSecrets(secrets)
  })

  ipcMain.handle('secrets:clearLlmKey', async () => {
    const secrets = await readSecrets()
    delete secrets.llmKeyBase64
    await writeSecrets(secrets)
  })

  ipcMain.handle('llm:chat', async (_event, config: LlmConfig, messages: ChatMessage[]) => {
    const apiKey = await getLlmKey()

    if (!config || typeof config !== 'object') throw new Error('Invalid LLM config')
    if (typeof config.baseUrl !== 'string' || typeof config.model !== 'string') throw new Error('Invalid LLM config')
    if (!Array.isArray(messages) || messages.length === 0) throw new Error('Invalid messages')

    const base = config.baseUrl.replace(/\/+$/, '')
    const url = `${base}/v1/chat/completions`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.2
      })
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`LLM request failed: ${response.status} ${text}`.slice(0, 500))
    }

    const data = await response.json() as {
      choices?: { message?: { content?: string } }[]
    }
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('LLM returned no content')
    return content
  })
}

