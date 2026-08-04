import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { IPC_POLICY } from '../../src/shared/ipc-policy'

const testDir = dirname(fileURLToPath(import.meta.url))
const root = join(testDir, '..', '..')
const mainDir = join(root, 'src', 'main')
const sharedDir = join(root, 'src', 'shared')
const preloadFile = join(root, 'src', 'preload', 'index.ts')

function tsFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) files.push(...tsFiles(path))
    else if (entry.endsWith('.ts')) files.push(path)
  }
  return files
}

function constantChannels(): Map<string, string> {
  const map = new Map<string, string>()
  for (const file of tsFiles(sharedDir)) {
    const source = readFileSync(file, 'utf-8')
    for (const match of source.matchAll(/export const ([A-Za-z_][A-Za-z0-9_]*) = '([^']+)'/g)) {
      map.set(match[1], match[2])
    }
  }
  return map
}

function channelArgs(match: RegExpMatchArray, constants: Map<string, string>): string {
  const literal = match[1]
  if (literal !== undefined) return literal
  const constantName = match[2]
  return constants.get(constantName) ?? ''
}

const REGISTERED = /ipcMain\.handle\(\s*(?:'([^']+)'|([A-Za-z_][A-Za-z0-9_]*))/g
const PUSHED = /\.send\(\s*(?:'([^']+)'|([A-Za-z_][A-Za-z0-9_]*))/g
const RENDERER_CALL = /ipcRenderer\.(?:invoke|on)\(\s*(?:'([^']+)'|([A-Za-z_][A-Za-z0-9_]*))/g

function collectChannels(files: string[], pattern: RegExp, constants: Map<string, string>): Map<string, string[]> {
  const byChannel = new Map<string, string[]>()
  for (const file of files) {
    const source = readFileSync(file, 'utf-8')
    for (const match of source.matchAll(pattern)) {
      const channel = channelArgs(match, constants)
      if (!channel) continue
      const relativeName = relative(mainDir, file).replace(/\\/g, '/')
      const owners = byChannel.get(channel) ?? []
      owners.push(relativeName)
      byChannel.set(channel, owners)
    }
  }
  return byChannel
}

const constants = constantChannels()
const mainFiles = tsFiles(mainDir)
const registered = collectChannels(mainFiles, REGISTERED, constants)
const pushed = collectChannels(mainFiles, PUSHED, constants)
const preloadSource = readFileSync(preloadFile, 'utf-8')
const exposed = new Map<string, string[]>()
for (const match of preloadSource.matchAll(RENDERER_CALL)) {
  const channel = channelArgs(match, constants)
  if (channel) exposed.set(channel, ['preload/index.ts'])
}

describe('IPC policy table', () => {
  it('has unique, well-formed entries', () => {
    const channels = IPC_POLICY.map((entry) => entry.channel)
    expect(new Set(channels).size).toBe(channels.length)

    for (const entry of IPC_POLICY) {
      expect(entry.channel).toMatch(/^[a-zA-Z][a-zA-Z0-9]*:[a-zA-Z0-9_-]+$/)
      expect(['renderer-to-main', 'main-to-renderer']).toContain(entry.direction)
      expect([
        'none', 'registry', 'oa_fetch', 'llm', 'predatory_sync', 'probe', 'composite_audit'
      ]).toContain(entry.networkScope)
      expect(['sanitized', 'typed', 'none']).toContain(entry.input)
      expect(entry.notes.trim().length).toBeGreaterThan(0)
    }
  })

  it('declares every ipcMain.handle registration exactly once', () => {
    const declared = new Set(
      IPC_POLICY.filter((entry) => entry.direction === 'renderer-to-main').map((entry) => entry.channel)
    )
    expect([...registered.keys()].sort()).toEqual([...declared].sort())
    for (const [channel, owners] of registered) {
      const entry = IPC_POLICY.find((candidate) => candidate.channel === channel)
      expect(entry, `missing policy entry for ${channel} (registered in ${owners.join(', ')})`).toBeDefined()
      expect(owners).toContain(entry!.handler)
    }
  })

  it('declares every renderer invocation and every main-to-renderer push', () => {
    const declared = new Set(IPC_POLICY.map((entry) => entry.channel))
    expect([...exposed.keys()].sort()).toEqual([...declared].sort())

    const toRenderer = new Set(
      IPC_POLICY.filter((entry) => entry.direction === 'main-to-renderer').map((entry) => entry.channel)
    )
    expect([...pushed.keys()].sort()).toEqual([...toRenderer].sort())
    for (const channel of pushed.keys()) {
      const entry = IPC_POLICY.find((candidate) => candidate.channel === channel)
      expect(entry, `missing policy entry for ${channel}`).toBeDefined()
      expect(entry!.direction).toBe('main-to-renderer')
    }
  })

  it('marks renderer-to-main channels as exposed in the preload bridge', () => {
    for (const entry of IPC_POLICY) {
      if (entry.direction !== 'renderer-to-main') continue
      expect(exposed.has(entry.channel), `preload must expose ${entry.channel}`).toBe(true)
    }
  })

  it('keeps the handler file column consistent with the registration site', () => {
    const constantNamesFor = (channel: string): string[] =>
      [...constants.entries()].filter(([, value]) => value === channel).map(([name]) => name)

    for (const entry of IPC_POLICY) {
      const path = join(mainDir, entry.handler)
      expect(statSync(path).isFile(), `${entry.handler} does not exist`).toBe(true)
      const source = readFileSync(path, 'utf-8')
      const references = source.includes(entry.channel) ||
        constantNamesFor(entry.channel).some((name) => source.includes(name))
      expect(
        references,
        `${entry.handler} should reference channel ${entry.channel}`
      ).toBe(true)
    }
  })
})
