import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DataSource } from '@/schemas/cronolog'

export interface ApiKeys {
  tmdb: string
  rawg: string
  googlebooks: string
  comicvine: string
}

const DEFAULT_API_KEYS: ApiKeys = {
  tmdb: '',
  rawg: '',
  googlebooks: '',
  comicvine: '',
}

const DEFAULT_ACCENT_COLOR = '#3B82F6'

// Sources that work without API keys
const NO_KEY_SOURCES: DataSource[] = ['openlibrary', 'musicbrainz', 'jikan']
// Sources that have optional keys (work without but better with)
const OPTIONAL_KEY_SOURCES: DataSource[] = ['googlebooks']

export const useSettingsStore = defineStore(
  'settings',
  () => {
    const apiKeys = ref<ApiKeys>({ ...DEFAULT_API_KEYS })
    const autoEnrich = ref(true)
    const accentColor = ref(DEFAULT_ACCENT_COLOR)

    // Ensure all apiKeys fields exist (handles persisted state missing newer keys)
    function ensureApiKeys() {
      const defaults: ApiKeys = { tmdb: '', rawg: '', googlebooks: '', comicvine: '' }
      const current = apiKeys.value
      let patched = false
      for (const key of Object.keys(defaults) as (keyof ApiKeys)[]) {
        if (current[key] === undefined) {
          current[key] = defaults[key]
          patched = true
        }
      }
      if (patched) {
        apiKeys.value = { ...current }
      }
    }

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

    function resetState() {
      apiKeys.value = { ...DEFAULT_API_KEYS }
      autoEnrich.value = true
      accentColor.value = DEFAULT_ACCENT_COLOR
    }

    return {
      apiKeys,
      autoEnrich,
      accentColor,
      hasKeyForSource,
      getKey,
      ensureApiKeys,
      resetState,
    }
  },
  {
    persist: true,
  },
)
