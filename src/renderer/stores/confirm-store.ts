import { create } from 'zustand'

interface ConfirmState {
  open: boolean
  message: string
  title: string
  resolve: ((value: boolean) => void) | null
  requestConfirm: (message: string, title?: string) => Promise<boolean>
  confirm: () => void
  cancel: () => void
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  message: '',
  title: '',
  resolve: null,
  requestConfirm: (message, title = '') =>
    new Promise<boolean>((resolve) => {
      set({ open: true, message, title, resolve })
    }),
  confirm: () => {
    const { resolve } = get()
    resolve?.(true)
    set({ open: false, resolve: null })
  },
  cancel: () => {
    const { resolve } = get()
    resolve?.(false)
    set({ open: false, resolve: null })
  }
}))

export async function requestConfirm(message: string, title?: string): Promise<boolean> {
  return useConfirmStore.getState().requestConfirm(message, title)
}
