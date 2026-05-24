import { ref, watch } from 'vue'
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useCronologStore } from '@/stores/cronolog'
import { useSettingsStore } from '@/stores/settings'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { DEFAULT_CATEGORIES } from '@/schemas/cronolog'
import {
  hasSyncWatchers,
  setSyncWatchers,
  stopSyncWatchers,
} from '@/composables/syncLifecycle'

let saveTimeout: ReturnType<typeof setTimeout> | null = null
let isSyncing = false
let lastSyncedAt: string | null = null

// Shared reactive sync state
export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline'
const syncStatus = ref<SyncStatus>('idle')
const isOnline = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
let pendingSave = false

// Listen for online/offline globally
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnline.value = true
  })
  window.addEventListener('offline', () => {
    isOnline.value = false
    syncStatus.value = 'offline'
  })
}

export function useFirebaseSync() {
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

  /** Load data from Firestore into stores */
  async function loadFromCloud() {
    if (!user.value) return false

    try {
      const docRef = doc(db, 'users', user.value.uid)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        syncStatus.value = isOnline.value ? 'idle' : 'offline'
        return false
      }

      const data = docSnap.data()
      isSyncing = true
      try {
        const cats = data.categories ?? DEFAULT_CATEGORIES
        const items = data.items ?? []
        const years = data.addedYears ?? []

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
        lastSyncedAt = data.updatedAt ?? null
      } finally {
        isSyncing = false
      }

      return true
    } catch (err: any) {
      if (!isOnline.value || err?.code === 'unavailable') {
        syncStatus.value = 'offline'
        console.info('Firestore unavailable, using local data')
        return false
      }

      syncStatus.value = 'error'
      console.error('Error loading from Firestore:', err?.message)
      toast.error('Error al cargar datos de la nube')
      return false
    }
  }

  /** Save current store state to Firestore with retry */
  async function saveToCloud() {
    if (!user.value) return false

    if (!isOnline.value) {
      syncStatus.value = 'offline'
      pendingSave = true
      return false
    }

    syncStatus.value = 'saving'

    try {
      await withRetry(async () => {
        const now = new Date().toISOString()
        const docRef = doc(db, 'users', user.value!.uid)

        await setDoc(docRef, {
          categories: store.categories,
          items: store.items,
          addedYears: store.addedYears,
          settings: {
            apiKeys: settings.apiKeys,
            autoEnrich: settings.autoEnrich,
          },
          updatedAt: now,
        })

        lastSyncedAt = now
      })

      syncStatus.value = 'saved'
      pendingSave = false
      // Reset to idle after 2s
      setTimeout(() => {
        if (syncStatus.value === 'saved') syncStatus.value = 'idle'
      }, 2000)
      return true
    } catch (err: any) {
      syncStatus.value = 'error'
      pendingSave = true
      console.error('Error saving to Firestore after retries:', err?.message)
      toast.error('Error al guardar en la nube', {
        label: 'Reintentar',
        handler: () => saveToCloud(),
      })
      return false
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
    if (hasSyncWatchers()) return

    const stopStoreWatch = watch(
      () => [store.categories, store.items, store.addedYears],
      () => debouncedSave(),
      { deep: true },
    )

    const stopSettingsWatch = watch(
      () => [settings.apiKeys, settings.autoEnrich],
      () => debouncedSave(),
      { deep: true },
    )

    // Re-save when coming back online
    const stopOnlineWatch = watch(isOnline, (online) => {
      if (online && pendingSave) {
        toast.info('Conexión restaurada — sincronizando...')
        saveToCloud()
      }
    })

    setSyncWatchers([stopStoreWatch, stopSettingsWatch, stopOnlineWatch])
  }

  function stopWatching() {
    stopSyncWatchers()

    if (saveTimeout) {
      clearTimeout(saveTimeout)
      saveTimeout = null
    }
  }

  /** Migrate local data for a first-time authenticated user */
  async function migrateLocalData() {
    if (!user.value) return false

    const hasLocalData = store.items.length > 0 || store.addedYears.length > 0
    if (!hasLocalData) return false

    try {
      const docRef = doc(db, 'users', user.value.uid)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return saveToCloud()
      }
    } catch (err: any) {
      syncStatus.value = !isOnline.value || err?.code === 'unavailable' ? 'offline' : 'error'
      console.error('Error checking local data migration:', err?.message)
    }

    return false
  }

  return {
    syncStatus,
    isOnline,
    loadFromCloud,
    saveToCloud,
    startWatching,
    stopWatching,
    migrateLocalData,
  }
}
