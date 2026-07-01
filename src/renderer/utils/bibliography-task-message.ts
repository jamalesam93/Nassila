import type { TFunction } from 'i18next'
import { MAX_VERIFICATION_ITEMS } from '../../shared/verification-limits'
import type { BibliographyTask } from '../stores/shell-store'

export function bibliographyTaskMessage(
  task: BibliographyTask,
  t: TFunction,
  citationCount: number
): string | null {
  if (task === 'idle') return null
  if (task === 'verify') {
    if (citationCount > MAX_VERIFICATION_ITEMS) {
      return t('outputPanel.task.verifyCapped', { count: citationCount, max: MAX_VERIFICATION_ITEMS })
    }
    return t('outputPanel.task.verify', { count: citationCount })
  }
  if (task === 'autocorrect') return t('outputPanel.task.autocorrect')
  return t('outputPanel.task.doi')
}
