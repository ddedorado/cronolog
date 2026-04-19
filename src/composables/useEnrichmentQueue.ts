import { ref, computed } from 'vue'
import { useCronologStore } from '@/stores/cronolog'
import { useSettingsStore } from '@/stores/settings'
import { enrich } from '@/services/enrichment'
import type { Item, Category, EnrichmentData } from '@/schemas/cronolog'

export type TaskStatus = 'pending' | 'running' | 'done' | 'error'

export interface EnrichmentTask {
  itemId: string
  itemTitle: string
  categoryName: string
  categoryColor: string
  status: TaskStatus
  error?: string
}

const queue = ref<EnrichmentTask[]>([])
const isProcessing = ref(false)
let dismissTimer: ReturnType<typeof setTimeout> | null = null

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function useEnrichmentQueue() {
  const store = useCronologStore()
  const settings = useSettingsStore()

  const activeTasks = computed(() => queue.value.filter((t) => t.status !== 'done'))
  const hasTasks = computed(() => queue.value.length > 0)
  const runningTask = computed(() => queue.value.find((t) => t.status === 'running'))
  const completedCount = computed(() => queue.value.filter((t) => t.status === 'done').length)
  const totalCount = computed(() => queue.value.length)
  const hasErrors = computed(() => queue.value.some((t) => t.status === 'error'))

  function enqueueItem(item: Item, category: Category) {
    // Don't add duplicates
    if (queue.value.some((t) => t.itemId === item.id && t.status !== 'error')) return
    // Remove old error entry for re-enrich
    queue.value = queue.value.filter((t) => !(t.itemId === item.id && t.status === 'error'))

    queue.value = [
      ...queue.value,
      {
        itemId: item.id,
        itemTitle: item.title,
        categoryName: category.name,
        categoryColor: category.color,
        status: 'pending',
      },
    ]

    if (dismissTimer) {
      clearTimeout(dismissTimer)
      dismissTimer = null
    }

    if (!isProcessing.value) {
      processQueue()
    }
  }

  async function processQueue() {
    isProcessing.value = true

    while (true) {
      const task = queue.value.find((t) => t.status === 'pending')
      if (!task) break

      // Rate limit: wait 350ms between requests to avoid API rate limits
      await delay(350)

      // Mark running
      queue.value = queue.value.map((t) =>
        t.itemId === task.itemId ? { ...t, status: 'running' as TaskStatus } : t,
      )

      try {
        const item = store.items.find((i) => i.id === task.itemId)
        const category = store.categories.find((c) => c.name === task.categoryName)

        if (!item || !category || category.dataSource === 'none') {
          throw new Error('Item o categoría no encontrada')
        }

        if (!settings.hasKeyForSource(category.dataSource)) {
          throw new Error('API key no configurada')
        }

        const apiKey = settings.getKey(category.dataSource)
        // Extract author from custom fields if available (for books)
        const authorField = (item.customFields?.autor ?? item.customFields?.author ?? '') as string
        const result = await enrich(item.title, category.dataSource, apiKey, category.name, authorField || undefined)

        if (!result) {
          throw new Error('No se encontraron resultados')
        }

        // Build enrichment data
        const enrichmentData: EnrichmentData = {
          source: category.dataSource,
          sourceId: result.sourceId,
          synopsis: result.synopsis,
          genres: result.genres,
          extra: result.extra,
          enrichedAt: new Date().toISOString(),
        }

        // Update item - only fill empty fields
        const updates: Partial<Item> = { enrichmentData }
        if (!item.imageUrl && result.imageUrl) {
          updates.imageUrl = result.imageUrl
        }
        if (!item.releaseYear && result.releaseYear) {
          updates.releaseYear = result.releaseYear
        }

        // Auto-fill author custom field if empty and enrichment has it
        if (result.extra?.author && !authorField) {
          const newCustomFields = { ...item.customFields, autor: result.extra.author }
          updates.customFields = newCustomFields
        }

        store.updateItem(task.itemId, updates)

        queue.value = queue.value.map((t) =>
          t.itemId === task.itemId ? { ...t, status: 'done' as TaskStatus } : t,
        )
      } catch (err: any) {
        queue.value = queue.value.map((t) =>
          t.itemId === task.itemId
            ? { ...t, status: 'error' as TaskStatus, error: err.message ?? 'Error desconocido' }
            : t,
        )
      }
    }

    isProcessing.value = false

    // Auto-dismiss after 4s if no errors
    if (!hasErrors.value && queue.value.length > 0) {
      dismissTimer = setTimeout(() => {
        queue.value = []
      }, 4000)
    }
  }

  function retryErrors() {
    queue.value = queue.value.map((t) =>
      t.status === 'error' ? { ...t, status: 'pending' as TaskStatus, error: undefined } : t,
    )
    if (!isProcessing.value) {
      processQueue()
    }
  }

  function dismiss() {
    queue.value = []
    if (dismissTimer) {
      clearTimeout(dismissTimer)
      dismissTimer = null
    }
  }

  return {
    queue,
    hasTasks,
    activeTasks,
    runningTask,
    completedCount,
    totalCount,
    hasErrors,
    isProcessing,
    enqueueItem,
    retryErrors,
    dismiss,
  }
}
