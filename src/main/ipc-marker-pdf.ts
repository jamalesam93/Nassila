import { spawn } from 'child_process'
import { ipcMain } from 'electron'
import { mkdtemp, readdir, readFile, rm, stat } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { selectBestMarkdownPath } from '../engine/manuscript/marker-text'
import type { MarkerConvertPdfRequest, MarkerConvertPdfResponse } from '../shared/marker-pdf-ipc'

const MARKER_TIMEOUT_MS = 900_000

function sanitizeExecutable(cmd: unknown): string {
  if (typeof cmd !== 'string') return 'marker_single'
  const t = cmd.trim().replace(/\r|\n/g, '')
  if (!t || t.length > 512) return 'marker_single'
  return t
}

function sanitizeExtraArgs(raw: unknown): string[] {
  if (typeof raw !== 'string' || !raw.trim()) return []
  const parts = raw.trim().split(/\s+/).filter(Boolean)
  const out: string[] = []
  for (const p of parts) {
    if (p.length > 120) continue
    if (p.includes('..') || p.startsWith('/') && process.platform === 'win32') continue
    out.push(p)
    if (out.length >= 32) break
  }
  return out
}

async function collectMarkdownCandidates(
  dir: string
): Promise<{ path: string; byteLength: number }[]> {
  const out: { path: string; byteLength: number }[] = []
  const entries = await readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory()) {
      out.push(...(await collectMarkdownCandidates(p)))
    } else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) {
      const s = await stat(p)
      out.push({ path: p, byteLength: s.size })
    }
  }
  return out
}

function runMarker(
  executable: string,
  args: string[],
  timeoutMs: number
): Promise<{ code: number | null; stderr: string }> {
  return new Promise((resolvePromise, rejectPromise) => {
    const windowsPath = /[\\/]/.test(executable)
    const child = spawn(executable, args, {
      windowsHide: true,
      shell: process.platform === 'win32' && !windowsPath,
      env: process.env
    })
    let stderr = ''
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      try {
        child.kill('SIGTERM')
        setTimeout(() => {
          try {
            child.kill('SIGKILL')
          } catch {
            /* ignore */
          }
        }, 2000)
      } catch {
        /* ignore */
      }
    }, timeoutMs)
    child.stderr?.on('data', (d: Buffer) => {
      stderr += d.toString('utf-8')
    })
    child.on('error', (err) => {
      clearTimeout(timer)
      rejectPromise(err)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (timedOut) {
        rejectPromise(new Error('Marker timed out'))
        return
      }
      resolvePromise({ code: code ?? 1, stderr })
    })
  })
}

export function registerMarkerPdfHandlers(tryResolveReadablePdf: (filePath: unknown) => string | null): void {
  ipcMain.handle('marker:convertPdf', async (_event, raw: unknown): Promise<MarkerConvertPdfResponse> => {
    const emptyErr = (error: string, stderr = ''): MarkerConvertPdfResponse => ({ ok: false, error, stderr })
    if (!raw || typeof raw !== 'object') return emptyErr('Invalid request')
    const body = raw as MarkerConvertPdfRequest
    const resolved = tryResolveReadablePdf(body.filePath)
    if (!resolved) return emptyErr('PDF path is not allowed or invalid')
    if (!resolved.toLowerCase().endsWith('.pdf')) return emptyErr('Not a PDF file')

    const executable = sanitizeExecutable(body.markerCommand)
    const extra = sanitizeExtraArgs(body.markerExtraArgs)
    const outDir = await mkdtemp(join(tmpdir(), 'nassila-marker-'))

    try {
      const args = [resolved, '--output_format', 'markdown', '--output_dir', outDir, ...extra]
      let run: { code: number | null; stderr: string }
      try {
        run = await runMarker(executable, args, MARKER_TIMEOUT_MS)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        return emptyErr(msg.includes('timed out') ? msg : `Marker failed: ${msg}`)
      }

      const stderr = run.stderr.trim().slice(0, 8000)
      if (run.code !== 0) {
        return {
          ok: false,
          error: `Marker exited with code ${run.code}`,
          stderr
        }
      }

      const candidates = await collectMarkdownCandidates(outDir)
      const best = selectBestMarkdownPath(candidates)
      if (!best) {
        return { ok: false, error: 'Marker produced no markdown file in output directory', stderr }
      }
      const markdown = await readFile(best, 'utf-8')
      return { ok: true, markdown, stderr }
    } finally {
      await rm(outDir, { recursive: true, force: true }).catch(() => {})
    }
  })
}
