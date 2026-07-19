import { describe, expect, it } from 'vitest'
import {
  createEmptyNassilaProject,
  parseNassilaProject,
  serializeNassilaProject,
  NASSILA_PROJECT_FORMAT,
  NASSILA_PROJECT_VERSION
} from '../../src/shared/nassila-project'

describe('nassila project format', () => {
  it('round-trips empty project JSON', () => {
    const project = createEmptyNassilaProject()
    project.manuscript.text = 'Hello (Smith, 2020).'
    project.bibliography.citations = [
      {
        id: 'c1',
        type: 'article-journal',
        title: 'Test',
        DOI: '10.1000/test'
      }
    ]
    const json = serializeNassilaProject(project)
    const restored = parseNassilaProject(json)
    expect(restored.format).toBe(NASSILA_PROJECT_FORMAT)
    expect(restored.version).toBe(NASSILA_PROJECT_VERSION)
    expect(restored.manuscript.text).toBe(project.manuscript.text)
    expect(restored.bibliography.citations).toHaveLength(1)
    expect(restored.bibliography.citations[0]?.DOI).toBe('10.1000/test')
  })

  it('rejects invalid JSON and wrong format', () => {
    expect(() => parseNassilaProject('{')).toThrow(/not JSON/)
    expect(() => parseNassilaProject('{"format":"other","version":1}')).toThrow(/unsupported/)
  })
})
