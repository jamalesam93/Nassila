import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useCitationStore } from '../stores/citation-store'
import { useShellStore } from '../stores/shell-store'
import { useCitationEngine } from '../hooks/use-citation-engine'
import type { InputFormat } from '../../engine/types'
import { Button } from './ui/button'

function inputFormatFromFileExtension(ext: string | undefined): InputFormat | undefined {
  if (!ext) return undefined
  if (ext === 'bib') return 'bibtex'
  if (ext === 'ris') return 'ris'
  if (ext === 'json') return 'csl-json'
  return undefined
}

export default function InputPanel() {
  const { t } = useTranslation()
  const rawInput = useShellStore((s) => s.rawInput)
  const setRawInput = useShellStore((s) => s.setRawInput)
  const identifierInput = useShellStore((s) => s.identifierInput)
  const setIdentifierInput = useShellStore((s) => s.setIdentifierInput)
  const [isDragOver, setIsDragOver] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [parseStatus, setParseStatus] = useState<string>('')
  const networkStatus = useCitationStore((s) => s.networkStatus)
  const { processRawInput, resolveId, batchResolveIds, ingestItems } = useCitationEngine()

  const handleParse = async () => {
    if (!rawInput.trim()) return
    setParsing(true)
    setParseStatus('')
    try {
      const result = await processRawInput(rawInput)
      if (result.items.length > 0) {
        setParseStatus(t('inputPanel.parseStatusParsed', { count: result.items.length }))
        setRawInput('')
      } else if (result.errors.length > 0) {
        setParseStatus(t('inputPanel.parseStatusErrors', { errors: result.errors.join('; ') }))
      } else {
        setParseStatus(t('inputPanel.parseStatusNone'))
      }
    } catch (e) {
      setParseStatus(t('inputPanel.parseStatusError', { message: (e as Error).message }))
    } finally {
      setParsing(false)
    }
  }

  const handleResolveIdentifier = async () => {
    if (!identifierInput.trim()) return
    setResolving(true)
    setParseStatus('')
    try {
      const identifiers = identifierInput
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean)

      if (identifiers.length > 1) {
        const items = await batchResolveIds(identifiers)
        if (items.length > 0) {
          setParseStatus(t('inputPanel.resolveStatusBatch', { resolved: items.length, total: identifiers.length }))
          setIdentifierInput('')
        } else {
          setParseStatus(t('inputPanel.resolveStatusNone'))
        }
        return
      }

      const item = await resolveId(identifiers[0])
      if (item) {
        setParseStatus(t('inputPanel.resolveStatusOne', { title: item.title ?? item.id }))
        setIdentifierInput('')
      } else {
        setParseStatus(t('inputPanel.resolveStatusOneFail'))
      }
    } catch (e) {
      setParseStatus(t('inputPanel.resolveStatusError', { message: (e as Error).message }))
    } finally {
      setResolving(false)
    }
  }

  const handleFileImport = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        try {
          const ext = file.name.split('.').pop()?.toLowerCase()
          if (ext === 'docx' || ext === 'pdf') {
            const buffer = await file.arrayBuffer()
            const { parseDocx, parsePdf } = await import('../../engine/parser/document')
            const result = ext === 'docx' ? await parseDocx(buffer) : await parsePdf(buffer)
            if (result.items.length > 0) {
              ingestItems(result.items)
            }
            setParseStatus(
              result.items.length > 0
                ? t('inputPanel.importStatus', { count: result.items.length, file: file.name })
                : result.errors[0] ?? t('inputPanel.importDocxFail', { file: file.name })
            )
            continue
          }

          const text = await file.text()
          const formatHint = inputFormatFromFileExtension(ext)
          const result = await processRawInput(text, formatHint)
          setParseStatus(t('inputPanel.importStatus', { count: result.items.length, file: file.name }))
        } catch (e) {
          setParseStatus(t('inputPanel.importReadError', { file: file.name, message: (e as Error).message }))
        }
      }
    },
    [ingestItems, processRawInput, t]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragOver(false), [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) handleFileImport(files)
    },
    [handleFileImport]
  )

  const nonemptyLines = rawInput.split('\n').filter((l) => l.trim()).length

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-2">
        <h2 className="text-sm font-semibold text-foreground">{t('panels.input')}</h2>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{t('inputPanel.panelSubtitle')}</p>
      </div>

      <div className="flex items-center gap-2 border-b border-border px-4 py-2 rtl:flex-row-reverse">
        <input
          type="text"
          value={identifierInput}
          onChange={(e) => setIdentifierInput(e.target.value)}
          placeholder={t('inputPanel.identifierPlaceholder')}
          className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          onKeyDown={(e) => e.key === 'Enter' && handleResolveIdentifier()}
        />
        <Button
          onClick={handleResolveIdentifier}
          disabled={!identifierInput.trim() || networkStatus === 'offline' || resolving}
          size="sm"
        >
          {resolving ? t('inputPanel.resolving') : t('inputPanel.resolve')}
        </Button>
        {networkStatus === 'offline' && (
          <span className="text-xs text-muted-foreground">{t('inputPanel.offline')}</span>
        )}
      </div>

      <div
        className={`relative flex-1 ${isDragOver ? 'ring-2 ring-primary ring-inset bg-primary/5' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <textarea
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          placeholder={t('inputPanel.citationsPlaceholder')}
          className="h-full w-full resize-none bg-transparent px-4 py-3 text-sm font-mono placeholder:text-muted-foreground/60 focus:outline-none"
          spellCheck={false}
        />
        {isDragOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/10 pointer-events-none">
            <div className="rounded-lg border-2 border-dashed border-primary bg-background/80 px-8 py-6 text-center">
              <p className="text-lg font-medium text-primary">{t('inputPanel.dropTitle')}</p>
              <p className="text-sm text-muted-foreground">{t('inputPanel.dropFormats')}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-2 rtl:flex-row-reverse">
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2 rtl:mr-0 rtl:ml-2">
          <span className="text-xs text-muted-foreground shrink-0">
            {rawInput.trim()
              ? t('inputPanel.lineCount', { count: nonemptyLines })
              : t('inputPanel.noInput')}
          </span>
          {!rawInput.trim() ? (
            <span className="text-[11px] text-muted-foreground/70 truncate rtl:text-right">{t('inputPanel.idleComposeHint')}</span>
          ) : null}
          {parseStatus && (
            <span className="text-xs text-primary truncate">{parseStatus}</span>
          )}
        </div>
        <Button onClick={handleParse} disabled={!rawInput.trim() || parsing} size="sm" className="shrink-0">
          {parsing ? t('inputPanel.parsing') : t('inputPanel.parseProcess')}
        </Button>
      </div>
    </div>
  )
}
