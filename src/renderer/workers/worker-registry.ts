/**
 * Renderer worker registry for the Ouroboros seven-worker shell.
 * Labels and copy live in i18n (`workers.*`); task ids stay in shared/nassila-agent-tasks.ts.
 */

export const WORKER_IDS = [
  'raqim',
  'tasnif',
  'sanad',
  'sharh',
  'maktab',
  'masdar',
  'shahid'
] as const

export type WorkerId = (typeof WORKER_IDS)[number]

export type WorkerAvailability = 'live' | 'partial' | 'stub'

export interface WorkerMeta {
  id: WorkerId
  /** i18n key for display name, e.g. workers.raqim.name */
  nameKey: string
  /** i18n key for short tagline / status chip */
  taglineKey: string
  availability: WorkerAvailability
}

export const WORKER_REGISTRY: readonly WorkerMeta[] = [
  {
    id: 'raqim',
    nameKey: 'workers.raqim.name',
    taglineKey: 'workers.raqim.tagline',
    availability: 'live'
  },
  {
    id: 'tasnif',
    nameKey: 'workers.tasnif.name',
    taglineKey: 'workers.tasnif.tagline',
    availability: 'live'
  },
  {
    id: 'sanad',
    nameKey: 'workers.sanad.name',
    taglineKey: 'workers.sanad.tagline',
    availability: 'live'
  },
  {
    id: 'sharh',
    nameKey: 'workers.sharh.name',
    taglineKey: 'workers.sharh.tagline',
    availability: 'partial'
  },
  {
    id: 'maktab',
    nameKey: 'workers.maktab.name',
    taglineKey: 'workers.maktab.tagline',
    availability: 'stub'
  },
  {
    id: 'masdar',
    nameKey: 'workers.masdar.name',
    taglineKey: 'workers.masdar.tagline',
    availability: 'stub'
  },
  {
    id: 'shahid',
    nameKey: 'workers.shahid.name',
    taglineKey: 'workers.shahid.tagline',
    availability: 'stub'
  }
] as const

export function isWorkerId(value: string): value is WorkerId {
  return (WORKER_IDS as readonly string[]).includes(value)
}

export function getWorkerMeta(id: WorkerId): WorkerMeta {
  const meta = WORKER_REGISTRY.find((w) => w.id === id)
  if (!meta) throw new Error(`Unknown worker id: ${id}`)
  return meta
}
