import { create } from 'zustand'

export type ToastKind = 'success' | 'info' | 'warn' | 'error'

export type ToastItem = {
  id: string
  kind: ToastKind
  message: string
  timeoutMs: number
}

interface NotifyState {
  toasts: ToastItem[]
  push: (item: Omit<ToastItem, 'id'>) => string
  dismiss: (id: string) => void
  clear: () => void
}

let nextToastId = 0

export const useNotifyStore = create<NotifyState>((set, get) => ({
  toasts: [],

  push: (item) => {
    const id = `toast-${++nextToastId}`
    set({ toasts: [...get().toasts, { ...item, id }] })
    return id
  },

  dismiss: (id) => {
    set({ toasts: get().toasts.filter((t) => t.id !== id) })
  },

  clear: () => set({ toasts: [] })
}))
