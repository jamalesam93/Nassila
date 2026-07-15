import type { IconType } from 'react-icons'
import { LuCircleAlert, LuInfo, LuTriangleAlert } from 'react-icons/lu'
import type { IssueSeverity } from '../../../engine/types'

const SEVERITY_ICON: Record<IssueSeverity, IconType> = {
  error: LuCircleAlert,
  warning: LuTriangleAlert,
  info: LuInfo
}

const SEVERITY_COLOR: Record<IssueSeverity, string> = {
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500'
}

type SeverityIconProps = {
  severity: IssueSeverity
  size?: 12 | 14
  className?: string
}

/** Inline issue severity marker — Lucide only; always paired with visible text. */
export function SeverityIcon({ severity, size = 12, className = '' }: SeverityIconProps) {
  const Ico = SEVERITY_ICON[severity]
  return (
    <Ico
      size={size}
      className={`inline-block shrink-0 ${SEVERITY_COLOR[severity]} ${className}`}
      aria-hidden
    />
  )
}
