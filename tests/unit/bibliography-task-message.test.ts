import { describe, expect, it } from 'vitest'
import { bibliographyTaskMessage } from '../../src/renderer/utils/bibliography-task-message'

const t = (key: string, opts?: Record<string, unknown>) => {
  if (key === 'outputPanel.task.verifyCapped') {
    return `capped:${opts?.count}:${opts?.max}`
  }
  if (key === 'outputPanel.task.verify') {
    return `verify:${opts?.count}`
  }
  if (key === 'outputPanel.task.autocorrect') return 'autocorrect'
  if (key === 'outputPanel.task.doi') return 'doi'
  return key
}

describe('bibliographyTaskMessage', () => {
  it('returns null when idle', () => {
    expect(bibliographyTaskMessage('idle', t, 10)).toBeNull()
  })

  it('returns verify message with count', () => {
    expect(bibliographyTaskMessage('verify', t, 58)).toBe('verify:58')
  })

  it('returns capped verify message above max', () => {
    expect(bibliographyTaskMessage('verify', t, 250)).toBe('capped:250:200')
  })

  it('returns task labels for autocorrect and doi', () => {
    expect(bibliographyTaskMessage('autocorrect', t, 1)).toBe('autocorrect')
    expect(bibliographyTaskMessage('doi', t, 1)).toBe('doi')
  })
})
