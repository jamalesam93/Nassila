import type { JournalMapping, JournalGuidelines, UserPreset } from '../types'
import { listBundledStyles } from '../formatter/styles'
import { findJournalByName, getStyleForJournal } from './journal-database'

export async function searchStyles(query: string): Promise<{ id: string; name: string }[]> {
  const normalized = query.trim().toLowerCase()
  return listBundledStyles()
    .filter((style) => {
      if (!normalized) return true
      return (
        style.id.toLowerCase().includes(normalized) ||
        style.name.toLowerCase().includes(normalized)
      )
    })
    .slice(0, 25)
}

export async function searchJournals(query: string): Promise<JournalMapping[]> {
  return findJournalByName(query).map((entry) => ({
    journalName: entry.name,
    issn: entry.issn,
    styleId: entry.styleId,
    abbreviation: entry.abbreviation
  }))
}

export async function getJournalGuidelines(journalName: string): Promise<JournalGuidelines | null> {
  const match = findJournalByName(journalName).find(
    (entry) => entry.name.toLowerCase() === journalName.toLowerCase().trim()
  ) ?? findJournalByName(journalName)[0]

  const referenceStyle = match?.styleId ?? getStyleForJournal(journalName)
  if (!referenceStyle) return null

  const additionalNotes: string[] = []
  if (match?.publisher) {
    additionalNotes.push(`Publisher: ${match.publisher}`)
  }
  if (match?.field) {
    additionalNotes.push(`Field: ${match.field}`)
  }
  if (match?.abbreviation) {
    additionalNotes.push(`Abbreviation: ${match.abbreviation}`)
  }
  if (match?.issn) {
    additionalNotes.push(`ISSN: ${match.issn}`)
  }

  return {
    journalName: match?.name ?? journalName,
    referenceStyle,
    additionalNotes
  }
}

export async function loadPresets(): Promise<UserPreset[]> {
  try {
    const raw = await window.api?.loadPresets()
    return (raw as UserPreset[]) ?? []
  } catch {
    return []
  }
}

export async function savePresets(presets: UserPreset[]): Promise<void> {
  await window.api?.savePresets(presets)
}
