import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DataSource } from '@/schemas/cronolog'

export interface ApiKeys {
  tmdb: string
  rawg: string
  googlebooks: string
  comicvine: string
}

// Sources that work without API keys
const NO_KEY_SOURCES: DataSource[] = ['openlibrary', 'musicbrainz', 'jikan']
// Sources that have optional keys (work without but better with)
const OPTIONAL_KEY_SOURCES: DataSource[] = ['googlebooks']

export const useSettingsStore = defineStore(
  'settings',
  () => {
    const apiKeys = ref<ApiKeys>({
      tmdb: '',
      rawg: '',
      googlebooks: '',
      comicvine: '',
    })
    const autoEnrich = ref(true)
    const accentColor = ref('#3B82F6')

    function hasKeyForSource(source: DataSource): boolean {
      if (source === 'none') return false
      if (NO_KEY_SOURCES.includes(source)) return true
      if (OPTIONAL_KEY_SOURCES.includes(source)) return true
      return (apiKeys.value[source as keyof ApiKeys] ?? '').trim().length > 0
    }

    function getKey(source: DataSource): string {
      if (source === 'none') return ''
      if (NO_KEY_SOURCES.includes(source)) return ''
      return apiKeys.value[source as keyof ApiKeys] ?? ''
    }

    return {
      apiKeys,
      autoEnrich,
      accentColor,
      hasKeyForSource,
      getKey,
    }
  },
  {
    persist: true,
  },
)
