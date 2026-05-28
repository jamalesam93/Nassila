import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode
} from 'react'
import { createPortal } from 'react-dom'

const VIEWPORT_PAD = 10

function computePlacement(
  trigger: DOMRect,
  tipWidth: number,
  tipHeight: number,
  side: 'top' | 'bottom'
): { top: number; left: number; transform: string } {
  const vw = window.innerWidth
  const vh = window.innerHeight

  let top = side === 'bottom' ? trigger.bottom + 6 : trigger.top - 6
  let left = trigger.left + trigger.width / 2
  let transform = side === 'bottom' ? 'translate(-50%, 0)' : 'translate(-50%, -100%)'

  const halfW = tipWidth / 2
  if (left - halfW < VIEWPORT_PAD) {
    left = Math.max(VIEWPORT_PAD, trigger.left)
    transform = side === 'bottom' ? 'translate(0, 0)' : 'translate(0, -100%)'
  } else if (left + halfW > vw - VIEWPORT_PAD) {
    left = Math.min(vw - VIEWPORT_PAD, trigger.right)
    transform = side === 'bottom' ? 'translate(-100%, 0)' : 'translate(-100%, -100%)'
  }

  if (side === 'bottom') {
    const bottom = top + tipHeight
    if (bottom > vh - VIEWPORT_PAD) {
      top = trigger.top - 6
      transform = transform.replace('translate(-50%, 0)', 'translate(-50%, -100%)')
        .replace('translate(0, 0)', 'translate(0, -100%)')
        .replace('translate(-100%, 0)', 'translate(-100%, -100%)')
    }
  } else if (top - tipHeight < VIEWPORT_PAD) {
    top = trigger.bottom + 6
    transform = transform.replace('translate(-50%, -100%)', 'translate(-50%, 0)')
      .replace('translate(0, -100%)', 'translate(0, 0)')
      .replace('translate(-100%, -100%)', 'translate(-100%, 0)')
  }

  return { top, left, transform }
}

/**
 * Accessible hover helper. Floating tooltips render in a portal so they are not
 * clipped by app regions with overflow:hidden; position is clamped to the viewport.
 */
export function Tooltip(props: {
  label: ReactNode
  children: ReactNode
  preferredMode?: 'floating' | 'aria-title'
  side?: 'top' | 'bottom'
}) {
  if (props.preferredMode === 'aria-title') {
    const title =
      typeof props.label === 'string' || typeof props.label === 'number' ? String(props.label) : undefined
    return (
      <span className="inline-flex" title={title}>
        {props.children}
      </span>
    )
  }

  const tooltipId = useId()
  const triggerRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState<CSSProperties>({
    position: 'fixed',
    top: 0,
    left: 0,
    transform: 'translate(0, 0)',
    zIndex: 10000,
    visibility: 'hidden'
  })
  const side = props.side ?? 'bottom'

  const reposition = useCallback(() => {
    const trigger = triggerRef.current
    const tip = tooltipRef.current
    if (!trigger || !tip) return

    const triggerRect = trigger.getBoundingClientRect()
    const tipRect = tip.getBoundingClientRect()
    const placement = computePlacement(triggerRect, tipRect.width, tipRect.height, side)

    setStyle({
      position: 'fixed',
      top: placement.top,
      left: placement.left,
      transform: placement.transform,
      zIndex: 10000,
      visibility: 'visible'
    })
  }, [side])

  const show = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    setStyle({
      position: 'fixed',
      top: side === 'bottom' ? rect.bottom + 6 : rect.top - 6,
      left: rect.left,
      transform: 'translate(0, 0)',
      zIndex: 10000,
      visibility: 'hidden'
    })
    setOpen(true)
  }, [side])

  const hide = useCallback(() => setOpen(false), [])

  useLayoutEffect(() => {
    if (!open) return
    reposition()
    const onScrollOrResize = () => reposition()
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open, reposition, props.label])

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex align-middle"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      aria-describedby={open ? tooltipId : undefined}
    >
      {props.children}
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <span
            ref={tooltipRef}
            id={tooltipId}
            role="tooltip"
            style={style}
            className="pointer-events-none box-border max-w-[min(18rem,calc(100vw-1.25rem))] rounded-md border border-border bg-popover px-2.5 py-1.5 text-left text-[11px] leading-snug text-popover-foreground shadow-md"
          >
            {props.label}
          </span>,
          document.body
        )}
    </span>
  )
}
