import { ref, watch, onMounted } from 'vue'
import { useOnline } from '@vueuse/core'

interface QueuedAction {
  id: string
  type: 'add' | 'update' | 'delete'
  payload: any
  timestamp: number
}

const STORAGE_KEY = 'cronolog-offline-queue'

export function useOfflineQueue() {
  const queue = ref<QueuedAction[]>([])
  const isOnline = useOnline()
  const processing = ref(false)

  function loadQueue() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) queue.value = JSON.parse(stored)
    } catch {
      queue.value = []
    }
  }

  function saveQueue() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue.value))
  }

  function enqueue(action: Omit<QueuedAction, 'id' | 'timestamp'>) {
    queue.value.push({
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    })
    saveQueue()
  }

  function dequeue(id: string) {
    queue.value = queue.value.filter((a) => a.id !== id)
    saveQueue()
  }

  async function processQueue(handler: (action: QueuedAction) => Promise<void>) {
    if (processing.value || !isOnline.value || queue.value.length === 0) return
    processing.value = true
    const pending = [...queue.value]
    for (const action of pending) {
      try {
        await handler(action)
        dequeue(action.id)
      } catch {
        break // Stop on first failure, retry later
      }
    }
    processing.value = false
  }

  // Auto-process when coming back online
  watch(isOnline, (online) => {
    if (online && queue.value.length > 0) {
      // Will be processed by the sync watcher
    }
  })

  onMounted(loadQueue)

  return {
    queue,
    isOnline,
    processing,
    enqueue,
    dequeue,
    processQueue,
    pendingCount: () => queue.value.length,
  }
}
