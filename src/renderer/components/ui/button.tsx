import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'secondary' | 'ghost' | 'destructive'
  size?: 'sm' | 'md'
}

const VARIANT: Record<NonNullable<Props['variant']>, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost: 'hover:bg-accent text-foreground',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
}

const SIZE: Record<NonNullable<Props['size']>, string> = {
  sm: 'h-8 px-2 text-xs',
  md: 'h-9 px-3 text-sm'
}

export function Button({ className = '', variant = 'default', size = 'md', ...props }: Props) {
  return (
    <button
      {...props}
      className={[
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:opacity-50 disabled:pointer-events-none',
        VARIANT[variant],
        SIZE[size],
        className
      ].join(' ')}
    />
  )
}

