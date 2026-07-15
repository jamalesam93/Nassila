import type { IconType } from 'react-icons'

export type IconSize = 12 | 14 | 16

type IconProps = {
  icon: IconType
  size?: IconSize
  className?: string
  /** When set, icon is not decorative — use for icon-only controls. */
  label?: string
}

/** Lucide icons via `react-icons/lu` only. Inherits color from parent (`currentColor`). */
export function Icon({ icon: Ico, size = 14, className = '', label }: IconProps) {
  return (
    <Ico
      size={size}
      className={`inline-block shrink-0 ${className}`}
      aria-hidden={label ? undefined : true}
      aria-label={label}
    />
  )
}
