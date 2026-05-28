export const DUPLICATE_COLOR_COUNT = 6

const DUPLICATE_PALETTE = [
  {
    row: 'ring-2 ring-rose-500/60 bg-rose-50 dark:bg-rose-950/30',
    card: 'border-rose-500/40 bg-rose-500/10',
    text: 'text-rose-700 dark:text-rose-300',
    chip: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
  },
  {
    row: 'ring-2 ring-amber-500/60 bg-amber-50 dark:bg-amber-950/30',
    card: 'border-amber-500/40 bg-amber-500/10',
    text: 'text-amber-700 dark:text-amber-300',
    chip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
  },
  {
    row: 'ring-2 ring-violet-500/60 bg-violet-50 dark:bg-violet-950/30',
    card: 'border-violet-500/40 bg-violet-500/10',
    text: 'text-violet-700 dark:text-violet-300',
    chip: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
  },
  {
    row: 'ring-2 ring-teal-500/60 bg-teal-50 dark:bg-teal-950/30',
    card: 'border-teal-500/40 bg-teal-500/10',
    text: 'text-teal-700 dark:text-teal-300',
    chip: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
  },
  {
    row: 'ring-2 ring-sky-500/60 bg-sky-50 dark:bg-sky-950/30',
    card: 'border-sky-500/40 bg-sky-500/10',
    text: 'text-sky-700 dark:text-sky-300',
    chip: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
  },
  {
    row: 'ring-2 ring-lime-500/60 bg-lime-50 dark:bg-lime-950/30',
    card: 'border-lime-500/40 bg-lime-500/10',
    text: 'text-lime-700 dark:text-lime-300',
    chip: 'bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300'
  }
] as const

export function duplicateColors(index: number) {
  return DUPLICATE_PALETTE[index % DUPLICATE_PALETTE.length]
}
