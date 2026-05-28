import { ipcMain, app } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import { readdir, readFile, writeFile, unlink } from 'fs/promises'
import { join } from 'path'

export type StructureTemplate = {
  id: string
  name: string
  headings: Record<string, string[]>
}

function templatesDir(): string {
  return join(app.getPath('userData'), 'manuscript-templates')
}

function ensureDir(): void {
  const dir = templatesDir()
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function templatePath(id: string): string {
  return join(templatesDir(), `${id}.json`)
}

function sanitizeId(id: unknown): string {
  if (typeof id !== 'string') throw new Error('Invalid template id')
  const trimmed = id.trim()
  if (!/^[a-z0-9_-]{2,64}$/i.test(trimmed)) throw new Error('Invalid template id format')
  return trimmed
}

function validateTemplate(t: unknown): StructureTemplate {
  if (!t || typeof t !== 'object') throw new Error('Invalid template')
  const tpl = t as Partial<StructureTemplate>
  const id = sanitizeId(tpl.id)
  if (typeof tpl.name !== 'string' || tpl.name.trim().length < 2) throw new Error('Invalid template name')
  if (!tpl.headings || typeof tpl.headings !== 'object') throw new Error('Invalid template headings')
  for (const [k, v] of Object.entries(tpl.headings)) {
    if (typeof k !== 'string' || !Array.isArray(v) || v.some((s) => typeof s !== 'string')) {
      throw new Error('Invalid headings format')
    }
  }
  return { id, name: tpl.name.trim(), headings: tpl.headings as Record<string, string[]> }
}

export function registerTemplateIpcHandlers(): void {
  ipcMain.handle('templates:list', async () => {
    ensureDir()
    const dir = templatesDir()
    const files = await readdir(dir).catch(() => [])
    const templates: StructureTemplate[] = []
    for (const f of files) {
      if (!f.endsWith('.json')) continue
      try {
        const raw = await readFile(join(dir, f), 'utf-8')
        templates.push(validateTemplate(JSON.parse(raw)))
      } catch {
        // skip malformed files
      }
    }
    return templates
  })

  ipcMain.handle('templates:save', async (_event, template: unknown) => {
    ensureDir()
    const t = validateTemplate(template)
    await writeFile(templatePath(t.id), JSON.stringify(t, null, 2), 'utf-8')
  })

  ipcMain.handle('templates:delete', async (_event, id: unknown) => {
    ensureDir()
    const safe = sanitizeId(id)
    await unlink(templatePath(safe)).catch(() => {})
  })
}

