import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { getVersion: () => '1.2.2' },
  ipcMain: { handle: vi.fn() },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: vi.fn(),
    decryptString: vi.fn()
  },
  net: { fetch: vi.fn() }
}))

describe('manuscript audit run isolation', () => {
  beforeEach(() => vi.resetModules())

  it('aborts a superseded run and isolates owners', async () => {
    const { AuditRunControllers } = await import('../../src/main/ipc-manuscript-audit')
    const runs = new AuditRunControllers()
    const first = runs.start('first-run-001', 10)
    const second = runs.start('second-run-01', 10)

    expect(first.signal.aborted).toBe(true)
    expect(runs.isCurrent('first-run-001', 10, first)).toBe(false)
    expect(runs.isCurrent('second-run-01', 10, second)).toBe(true)
    expect(runs.cancel('second-run-01', 11)).toBe(false)
    expect(second.signal.aborted).toBe(false)
    expect(runs.cancel('second-run-01', 10)).toBe(true)
    expect(second.signal.aborted).toBe(true)
  })
})
