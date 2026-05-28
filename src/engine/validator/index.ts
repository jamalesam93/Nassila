import type { CslItem, ValidationIssue } from '../types'
import { STYLE_RULES } from './rules/index'

export function validateCitations(
  items: CslItem[],
  styleId?: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  for (const item of items) {
    const applicableRules = STYLE_RULES.filter((rule) => {
      // No target style: only universal rules (missing title, DOI format, etc.).
      // Style-specific rules (Vancouver, IEEE, APA, …) run only after the user picks a style.
      const styleMatch = !styleId
        ? rule.styleIds === '*'
        : rule.styleIds === '*' ||
          (Array.isArray(rule.styleIds) && rule.styleIds.includes(styleId))

      const typeMatch =
        rule.itemTypes === '*' ||
        rule.itemTypes.includes(item.type)

      return styleMatch && typeMatch
    })

    for (const rule of applicableRules) {
      const ruleIssues = rule.validate(item, styleId ?? '')
      issues.push(...ruleIssues)
    }
  }

  return issues
}

export function getIssueSummary(issues: ValidationIssue[]): {
  errors: number
  warnings: number
  infos: number
} {
  let errors = 0
  let warnings = 0
  let infos = 0
  for (const issue of issues) {
    if (issue.severity === 'error') errors++
    else if (issue.severity === 'warning') warnings++
    else infos++
  }
  return { errors, warnings, infos }
}
