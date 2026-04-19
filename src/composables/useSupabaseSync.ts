import { ref, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { useCronologStore } from '@/stores/cronolog'
import { useSettingsStore } from '@/stores/settings'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { DEFAULT_CATEGORIES } from '@/schemas/cronolog'

let saveTimeout: ReturnType<typeof setTimeout> | null = null
let isSyncing = false
let lastSyncedAt: string | null = null

// Shared reactive sync state
export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline'
const syncStatus = ref<SyncStatus>('idle')
const isOnline = ref(navigator.onLine)
let pendingSave = false

// Listen for online/offline globally
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnline.value = true
    if (pendingSave) {
      pendingSave = false
      // Will be picked up by the next debouncedSave call from any instance
    }
  })
  window.addEventListener('offline', () => {
    isOnline.value = false
    syncStatus.value = 'offline'
  })
}

export function useSupabaseSync() {
  const store = useCronologStore()
  const settings = useSettingsStore()
  const { user, isAuthenticated } = useAuth()
  const toast = useToast()

  /** Retry with exponential backoff */
  async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
  ): Promise<T> {
    let lastError: unknown
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (err) {
        lastError = err
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * 2 ** attempt, 8000)
          await new Promise((r) => setTimeout(r, delay))
        }
      }
    }
    throw lastError
  }

  /** Load data from Supabase into stores */
  async function loadFromCloud() {
    if (!user.value) return

    const { data, error } = await supabase
      .from('cronolog_data')
      .select('*')
      .eq('user_id', user.value.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        await saveToCloud()
        return
      }
      console.error('Error loading from Supabase:', error.message)
      return
    }

    if (data) {
      isSyncing = true
      try {
        const cats = data.categories ?? DEFAULT_CATEGORIES
        const items = data.items ?? []
        const years = data.added_years ?? []

        store.categories = cats
        store.items = items
        store.addedYears = years

        if (data.settings) {
          if (data.settings.apiKeys) {
            settings.apiKeys = data.settings.apiKeys
          }
          if (typeof data.settings.autoEnrich === 'boolean') {
            settings.autoEnrich = data.settings.autoEnrich
          }
        }

        store.migrateData()
        syncStatus.value = 'saved'
        lastSyncedAt = data.updated_at ?? null
      } finally {
        isSyncing = false
      }
    }
  }

  /** Save current store state to Supabase with retry */
  async function saveToCloud() {
    if (!user.value) return

    if (!isOnline.value) {
      syncStatus.value = 'offline'
      pendingSave = true
      return
    }

    syncStatus.value = 'saving'

    try {
      await withRetry(async () => {
        const now = new Date().toISOString()
        const { error } = await supabase
          .from('cronolog_data')
          .upsert({
            user_id: user.value!.id,
            categories: store.categories,
            items: store.items,
            added_years: store.addedYears,
            settings: {
              apiKeys: settings.apiKeys,
              autoEnrich: settings.autoEnrich,
            },
            updated_at: now,
          })

        if (error) throw error
        lastSyncedAt = now
      })

      syncStatus.value = 'saved'
      // Reset to idle after 2s
      setTimeout(() => {
        if (syncStatus.value === 'saved') syncStatus.value = 'idle'
      }, 2000)
    } catch (err: any) {
      syncStatus.value = 'error'
      console.error('Error saving to Supabase after retries:', err?.message)
      toast.error('Error al guardar en la nube', {
        label: 'Reintentar',
        handler: () => saveToCloud(),
      })
    }
  }

  /** Debounced save — waits 1.5s after last change */
  function debouncedSave() {
    if (isSyncing || !isAuthenticated.value) return
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      saveToCloud()
    }, 1500)
  }

  /** Watch store changes and auto-save */
  function startWatching() {
    watch(
      () => [store.categories, store.items, store.addedYears],
      () => debouncedSave(),
      { deep: true },
    )

    watch(
      () => [settings.apiKeys, settings.autoEnrich],
      () => debouncedSave(),
      { deep: true },
    )

    // Re-save when coming back online
    watch(isOnline, (online) => {
      if (online && pendingSave) {
        pendingSave = false
        toast.info('Conexión restaurada — sincronizando...')
        saveToCloud()
      }
    })
  }

  /** Migrate local data for a first-time authenticated user */
  async function migrateLocalData() {
    if (!user.value) return

    const { data } = await supabase
      .from('cronolog_data')
      .select('user_id')
      .eq('user_id', user.value.id)
      .single()

    if (!data && store.items.length > 0) {
      await saveToCloud()
    }
  }

  return {
    syncStatus,
    isOnline,
    loadFromCloud,
    saveToCloud,
    startWatching,
    migrateLocalData,
  }
}
