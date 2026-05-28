import type { ReactNode } from 'react'
import { Tooltip } from './tooltip'

export type TabsOption<T extends string> = {
  value: T
  label: string
  /** Hover explanation for this tab */
  tooltip?: string
}

export function Tabs<T extends string>(props: {
  value: T
  onChange: (value: T) => void
  options: TabsOption<T>[]
  ariaLabel: string
  rightSlot?: ReactNode
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        role="tablist"
        aria-label={props.ariaLabel}
        className="inline-flex rounded-md border border-border bg-muted p-1"
      >
        {props.options.map((opt) => {
          const active = opt.value === props.value
          const btn = (
            <button
              key={opt.value}
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => props.onChange(opt.value)}
              className={[
                'rounded-sm px-3 py-1.5 text-xs font-medium transition-colors',
                active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              ].join(' ')}
            >
              {opt.label}
            </button>
          )
          if (!opt.tooltip) return btn
          return (
            <Tooltip key={opt.value} label={opt.tooltip} side="bottom">
              {btn}
            </Tooltip>
          )
        })}
      </div>
      {props.rightSlot}
    </div>
  )
}

