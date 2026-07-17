import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode
} from 'react'
import { LuChevronDown } from 'react-icons/lu'
import { Icon } from './icon'

const DropdownCloseContext = createContext<() => void>(() => {})

interface DropdownMenuProps {
  label: string
  children: ReactNode
  align?: 'start' | 'end'
}

export function DropdownMenu({ label, children, align = 'start' }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [open])

  const close = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, [])

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault()
            setOpen(true)
          }
        }}
      >
        {label}
        <Icon icon={LuChevronDown} size={12} className="opacity-70" />
      </button>
      {open ? (
        <DropdownCloseContext.Provider value={close}>
          <DropdownMenuPanel id={menuId} align={align} onClose={close}>
            {children}
          </DropdownMenuPanel>
        </DropdownCloseContext.Provider>
      ) : null}
    </div>
  )
}

function DropdownMenuPanel({
  id,
  align,
  onClose,
  children
}: {
  id: string
  align: 'start' | 'end'
  onClose: () => void
  children: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus()
  }, [])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = panelRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])')
    if (!items?.length) return
    const list = Array.from(items)
    const idx = list.indexOf(document.activeElement as HTMLElement)

    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      list[(idx + 1) % list.length]?.focus()
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      list[(idx <= 0 ? list.length : idx) - 1]?.focus()
    }
    if (e.key === 'Home') {
      e.preventDefault()
      list[0]?.focus()
    }
    if (e.key === 'End') {
      e.preventDefault()
      list[list.length - 1]?.focus()
    }
  }

  return (
    <div
      ref={panelRef}
      id={id}
      role="menu"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className={`absolute top-full z-30 mt-1 min-w-[11rem] rounded-md border border-border bg-popover p-1 shadow-md ${
        align === 'end' ? 'end-0 rtl:start-0 rtl:end-auto' : 'start-0 rtl:end-0 rtl:start-auto'
      }`}
    >
      {children}
    </div>
  )
}

interface DropdownMenuItemProps {
  children: ReactNode
  disabled?: boolean
  destructive?: boolean
  onSelect: () => void
}

export function DropdownMenuItem({
  children,
  disabled,
  destructive,
  onSelect
}: DropdownMenuItemProps) {
  const close = useContext(DropdownCloseContext)
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className={`block w-full rounded px-2 py-1.5 text-start text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        destructive
          ? 'text-destructive hover:bg-destructive/10 disabled:opacity-40'
          : 'hover:bg-accent disabled:opacity-40'
      }`}
      onClick={() => {
        if (disabled) return
        onSelect()
        close()
      }}
    >
      {children}
    </button>
  )
}

export function DropdownMenuSeparator() {
  return <div className="my-1 h-px bg-border" role="separator" />
}
