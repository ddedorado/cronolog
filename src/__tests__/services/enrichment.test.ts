import { describe, it, expect, vi, beforeEach } from 'vitest'
import { enrich } from '@/services/enrichment'

// Mock the individual services
vi.mock('@/services/enrichment/tmdb', () => ({
  searchTMDB: vi.fn().mockResolvedValue({
    imageUrl: 'https://image.tmdb.org/test.jpg',
    releaseYear: 2026,
    synopsis: 'A great movie',
    genres: ['Action', 'Drama'],
    sourceId: 'tmdb-123',
    extra: { director: 'Test Director', cast: ['Actor 1'] },
  }),
}))

vi.mock('@/services/enrichment/openlibrary', () => ({
  searchOpenLibrary: vi.fn().mockResolvedValue({
    imageUrl: 'https://covers.openlibrary.org/test.jpg',
    releaseYear: 2020,
    synopsis: 'A great book',
    genres: ['Fiction'],
    sourceId: 'ol-123',
    extra: { author: 'Test Author', pages: 300 },
  }),
}))

vi.mock('@/services/enrichment/rawg', () => ({
  searchRAWG: vi.fn().mockResolvedValue({
    imageUrl: 'https://media.rawg.io/test.jpg',
    releaseYear: 2023,
    synopsis: 'A great game',
    genres: ['RPG'],
    sourceId: 'rawg-123',
    extra: { metacritic: 90, platforms: ['PC', 'PS5'] },
  }),
}))

describe('enrichment service router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('routes to TMDB for movie categories', async () => {
    const result = await enrich('Test Movie', 'tmdb', 'api-key', 'Películas')
    expect(result).not.toBeNull()
    expect(result!.sourceId).toBe('tmdb-123')
    expect(result!.extra.director).toBe('Test Director')
  })

  it('detects TV categories for TMDB', async () => {
    const { searchTMDB } = await import('@/services/enrichment/tmdb')
    await enrich('Test Show', 'tmdb', 'api-key', 'TV')
    expect(searchTMDB).toHaveBeenCalledWith('Test Show', 'api-key', 'tv')
  })

  it('routes to Open Library for book categories', async () => {
    const result = await enrich('Test Book', 'openlibrary', '', 'Libros', 'Author Name')
    expect(result).not.toBeNull()
    expect(result!.extra.author).toBe('Test Author')
  })

  it('passes author to Open Library', async () => {
    const { searchOpenLibrary } = await import('@/services/enrichment/openlibrary')
    await enrich('Test Book', 'openlibrary', '', 'Libros', 'My Author')
    expect(searchOpenLibrary).toHaveBeenCalledWith('Test Book', 'My Author')
  })

  it('routes to RAWG for game categories', async () => {
    const result = await enrich('Test Game', 'rawg', 'api-key', 'Juegos')
    expect(result).not.toBeNull()
    expect(result!.extra.metacritic).toBe(90)
  })

  it('returns null for unknown sources', async () => {
    const result = await enrich('Test', 'none', '')
    expect(result).toBeNull()
  })
})
