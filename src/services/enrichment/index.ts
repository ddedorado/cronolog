import type { DataSource } from '@/schemas/cronolog'
import type { EnrichmentResult } from './types'
import { searchTMDB } from './tmdb'
import { searchOpenLibrary } from './openlibrary'
import { searchRAWG } from './rawg'

export type { EnrichmentResult }

export async function enrich(
  title: string,
  source: DataSource,
  apiKey: string,
  categoryName?: string,
  author?: string,
): Promise<EnrichmentResult | null> {
  switch (source) {
    case 'tmdb': {
      // Detect if category is TV-like
      const isTV = categoryName
        ? /^(tv|series|serie)/i.test(categoryName.trim())
        : false
      return searchTMDB(title, apiKey, isTV ? 'tv' : 'movie')
    }
    case 'openlibrary':
      return searchOpenLibrary(title, author || undefined)
    case 'rawg':
      return searchRAWG(title, apiKey)
    default:
      return null
  }
}
