import { create } from 'zustand'

export type ToastKind = 'success' | 'error' | 'info'
interface Toast {
  id: string
  kind: ToastKind
  message: string
}
interface ToastState {
  toasts: Toast[]
  push: (kind: ToastKind, message: string, ttl?: number) => void
  dismiss: (id: string) => void
}

export const useToast = create<ToastState>((set, get) => ({
  toasts: [],
  push: (kind, message, ttl = 4000) => {
    const id = crypto.randomUUID()
    set({ toasts: [...get().toasts, { id, kind, message }] })
    setTimeout(() => get().dismiss(id), ttl)
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))

export const toast = {
  success: (m: string) => useToast.getState().push('success', m),
  error: (m: string) => useToast.getState().push('error', m, 6000),
  info: (m: string) => useToast.getState().push('info', m),
}

