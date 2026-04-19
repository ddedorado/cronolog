import { ref } from 'vue'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
  action?: {
    label: string
    handler: () => void
  }
}

const toasts = ref<Toast[]>([])

let idCounter = 0

function addToast(toast: Omit<Toast, 'id'>) {
  const id = `toast-${++idCounter}`
  const entry: Toast = { ...toast, id }
  toasts.value = [...toasts.value, entry]

  const duration = toast.duration ?? (toast.action ? 6000 : 3500)
  if (duration > 0) {
    setTimeout(() => removeToast(id), duration)
  }

  return id
}

function removeToast(id: string) {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

export function useToast() {
  function success(message: string, action?: Toast['action']) {
    return addToast({ message, type: 'success', action })
  }

  function error(message: string, action?: Toast['action']) {
    return addToast({ message, type: 'error', duration: 5000, action })
  }

  function info(message: string, action?: Toast['action']) {
    return addToast({ message, type: 'info', action })
  }

  function warning(message: string, action?: Toast['action']) {
    return addToast({ message, type: 'warning', duration: 5000, action })
  }

  return {
    toasts,
    success,
    error,
    info,
    warning,
    removeToast,
  }
}
