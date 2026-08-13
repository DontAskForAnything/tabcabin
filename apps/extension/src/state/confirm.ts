import { create } from 'zustand'

export interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel: string
  cancelLabel: string
  danger?: boolean
}

interface ConfirmState {
  request: (ConfirmOptions & { resolve: (ok: boolean) => void }) | null
  open: (options: ConfirmOptions) => Promise<boolean>
  settle: (ok: boolean) => void
}

export const useConfirm = create<ConfirmState>()((set, get) => ({
  request: null,
  open: (options) =>
    new Promise<boolean>((resolve) => {
      get().request?.resolve(false)
      set({ request: { ...options, resolve } })
    }),
  settle: (ok) => {
    get().request?.resolve(ok)
    set({ request: null })
  },
}))

export const confirmDialog = (options: ConfirmOptions) => useConfirm.getState().open(options)
