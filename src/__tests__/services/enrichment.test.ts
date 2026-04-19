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

vi.mock('@/services/enrichment/googlebooks', () => ({
  searchGoogleBooks: vi.fn().mockResolvedValue({
    imageUrl: 'https://books.google.com/test.jpg',
    releaseYear: 2021,
    synopsis: 'A great book via Google',
    genres: ['Fiction'],
    sourceId: 'gb-123',
    extra: { author: 'Google Author', pages: 250 },
  }),
}))

vi.mock('@/services/enrichment/musicbrainz', () => ({
  searchMusicBrainz: vi.fn().mockResolvedValue({
    imageUrl: 'https://coverartarchive.org/test.jpg',
    releaseYear: 2024,
    synopsis: '',
    genres: ['Rock'],
    sourceId: 'mb-123',
    extra: { artist: 'Test Artist', trackCount: 12 },
  }),
}))

vi.mock('@/services/enrichment/jikan', () => ({
  searchJikanAnime: vi.fn().mockResolvedValue({
    imageUrl: 'https://cdn.myanimelist.net/anime.jpg',
    releaseYear: 2023,
    synopsis: 'A great anime',
    genres: ['Action', 'Shonen'],
    sourceId: 'mal-123',
    extra: { episodes: 24, studio: 'MAPPA' },
  }),
  searchJikanManga: vi.fn().mockResolvedValue({
    imageUrl: 'https://cdn.myanimelist.net/manga.jpg',
    releaseYear: 2019,
    synopsis: 'A great manga',
    genres: ['Adventure'],
    sourceId: 'mal-456',
    extra: { author: 'Manga Author', chapters: 150 },
  }),
}))

vi.mock('@/services/enrichment/comicvine', () => ({
  searchComicVine: vi.fn().mockResolvedValue({
    imageUrl: 'https://comicvine.gamespot.com/test.jpg',
    releaseYear: 2011,
    synopsis: 'A great comic',
    genres: [],
    sourceId: 'cv-123',
    extra: { publisher: 'DC Comics', issues: 52 },
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

  it('routes to Google Books for googlebooks source', async () => {
    const result = await enrich('Test Book', 'googlebooks', 'api-key', 'Libros', 'Author')
    expect(result).not.toBeNull()
    expect(result!.sourceId).toBe('gb-123')
    expect(result!.extra.author).toBe('Google Author')
  })

  it('routes to MusicBrainz for music categories', async () => {
    const result = await enrich('Test Album', 'musicbrainz', '', 'Música', 'Artist')
    expect(result).not.toBeNull()
    expect(result!.sourceId).toBe('mb-123')
    expect(result!.extra.artist).toBe('Test Artist')
  })

  it('routes to Jikan anime for anime categories', async () => {
    const result = await enrich('Test Anime', 'jikan', '', 'Anime')
    expect(result).not.toBeNull()
    expect(result!.sourceId).toBe('mal-123')
    expect(result!.extra.studio).toBe('MAPPA')
  })

  it('routes to Jikan manga for manga categories', async () => {
    const result = await enrich('Test Manga', 'jikan', '', 'Manga', 'Author')
    expect(result).not.toBeNull()
    expect(result!.sourceId).toBe('mal-456')
    expect(result!.extra.author).toBe('Manga Author')
  })

  it('routes to Comic Vine for comic categories', async () => {
    const result = await enrich('Test Comic', 'comicvine', 'api-key', 'Cómics')
    expect(result).not.toBeNull()
    expect(result!.sourceId).toBe('cv-123')
    expect(result!.extra.publisher).toBe('DC Comics')
  })

  it('returns null for unknown sources', async () => {
    const result = await enrich('Test', 'none', '')
    expect(result).toBeNull()
  })
})
