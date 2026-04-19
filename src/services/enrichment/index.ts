import type { DataSource } from '@/schemas/cronolog'
import type { EnrichmentResult } from './types'
import { searchTMDB } from './tmdb'
import { searchOpenLibrary } from './openlibrary'
import { searchGoogleBooks } from './googlebooks'
import { searchRAWG } from './rawg'
import { searchMusicBrainz } from './musicbrainz'
import { searchJikanAnime, searchJikanManga } from './jikan'
import { searchComicVine } from './comicvine'

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
    case 'googlebooks':
      return searchGoogleBooks(title, author || undefined, apiKey || undefined)
    case 'openlibrary':
      return searchOpenLibrary(title, author || undefined)
    case 'rawg':
      return searchRAWG(title, apiKey)
    case 'musicbrainz':
      return searchMusicBrainz(title, author || undefined)
    case 'jikan': {
      // Detect if category is manga-like
      const isManga = categoryName
        ? /^(manga|comic|c[oó]mic)/i.test(categoryName.trim())
        : false
      return isManga
        ? searchJikanManga(title, author || undefined)
        : searchJikanAnime(title)
    }
    case 'comicvine':
      return searchComicVine(title, apiKey)
    default:
      return null
  }
}
