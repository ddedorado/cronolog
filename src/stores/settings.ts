import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DataSource } from '@/schemas/cronolog'

export interface ApiKeys {
  tmdb: string
  rawg: string
}

export const useSettingsStore = defineStore(
  'settings',
  () => {
    const apiKeys = ref<ApiKeys>({
      tmdb: '',
      rawg: '',
    })
    const autoEnrich = ref(true)

    function hasKeyForSource(source: DataSource): boolean {
      if (source === 'none') return false
      if (source === 'openlibrary') return true // no key needed
      return (apiKeys.value[source] ?? '').trim().length > 0
    }

    function getKey(source: DataSource): string {
      if (source === 'openlibrary') return ''
      if (source === 'none') return ''
      return apiKeys.value[source] ?? ''
    }

    return {
      apiKeys,
      autoEnrich,
      hasKeyForSource,
      getKey,
    }
  },
  {
    persist: true,
  },
)
