import type { ChecklistItem } from '../manuscript/types'

export function buildChecklistFromText(fullText: string, options?: { structurePassed?: boolean; structureDetail?: string }): ChecklistItem[] {
  const text = fullText.toLowerCase()

  const hasEthics =
    /\b(irb|ethics committee|ethics board|ethical review|ethical approval|ethics approval|institutional review board|research ethics|declaration of helsinki|protocol number|ethical clearance|ethics (?:committee|board) of|human research ethics|approved by the [^.\n]{0,60}(?:ethics|review))\b/i.test(text)
  const hasConsent =
    /\b(informed consent|written informed consent|consent (?:was|had been)? ?obtained|verbal consent|participant consent|patient consent|parental consent|consent forms?|waived? consent|no identifying information)\b/i.test(text)
  const hasCoi =
    /\b(conflict[s]? of interest|competing interest[s]?|competing financial interest[s]?|no (?:conflict|competing)|declare[ds]? (?:no|any) (?:conflict|competing)|authors?[^.\n]{0,80}(?:declare|disclose)[^.\n]{0,40}(?:no |any )?(?:conflict|competing)|disclosure statement|financial disclosure|no relevant financial)\b/i.test(text)

  return [
    {
      id: 'structure',
      label: 'Manuscript structure (template)',
      kind: 'automated',
      severity: 'info',
      passed: options?.structurePassed ?? true,
      detail: options?.structureDetail
    },
    {
      id: 'ethics',
      label: 'Ethics approval statement present',
      kind: 'automated',
      severity: 'warning',
      passed: hasEthics,
      detail: hasEthics ? undefined : 'No clear ethics approval / protocol wording detected'
    },
    {
      id: 'consent',
      label: 'Informed consent statement present',
      kind: 'automated',
      severity: 'warning',
      passed: hasConsent,
      detail: hasConsent ? undefined : 'No clear informed-consent wording detected'
    },
    {
      id: 'coi',
      label: 'Conflict of interest disclosure present',
      kind: 'automated',
      severity: 'warning',
      passed: hasCoi,
      detail: hasCoi ? undefined : 'No clear COI / competing-interest wording detected'
    },
    { id: 'authorship', label: 'Authorship criteria (ICMJE)', kind: 'manual', severity: 'warning', passed: false },
    { id: 'data_integrity', label: 'Data integrity / no selective reporting', kind: 'manual', severity: 'warning', passed: false },
    { id: 'plagiarism', label: 'Plagiarism screening completed', kind: 'manual', severity: 'warning', passed: false },
    { id: 'final_approval', label: 'Final co-author approval documented', kind: 'manual', severity: 'warning', passed: false }
  ]
}

