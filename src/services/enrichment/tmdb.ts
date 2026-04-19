import type { EnrichmentResult } from './types'

const BASE = 'https://api.themoviedb.org/3'
const IMG_BASE = 'https://image.tmdb.org/t/p/w500'

export async function searchTMDB(
  title: string,
  apiKey: string,
  type: 'movie' | 'tv' = 'movie',
): Promise<EnrichmentResult | null> {
  const endpoint = type === 'movie' ? 'search/movie' : 'search/tv'
  const url = `${BASE}/${endpoint}?api_key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(title)}&language=es-ES`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`)

  const data = await res.json()
  const item = data.results?.[0]
  if (!item) return null

  const titleField = type === 'movie' ? 'title' : 'name'
  const dateField = type === 'movie' ? 'release_date' : 'first_air_date'
  const year = item[dateField] ? parseInt(item[dateField].split('-')[0], 10) : null

  // Fetch details for more info
  const detailUrl = `${BASE}/${type === 'movie' ? 'movie' : 'tv'}/${item.id}?api_key=${encodeURIComponent(apiKey)}&language=es-ES&append_to_response=credits`
  const detailRes = await fetch(detailUrl)
  const detail = detailRes.ok ? await detailRes.json() : null

  const extra: Record<string, any> = {}

  if (type === 'movie' && detail) {
    const directors = detail.credits?.crew?.filter((c: any) => c.job === 'Director') ?? []
    extra.director = directors.map((d: any) => d.name).join(', ')
    extra.cast = (detail.credits?.cast ?? []).slice(0, 5).map((a: any) => a.name)
    extra.runtime = detail.runtime
    extra.voteAverage = detail.vote_average
  } else if (type === 'tv' && detail) {
    extra.seasons = detail.number_of_seasons
    extra.episodes = detail.number_of_episodes
    extra.cast = (detail.credits?.cast ?? []).slice(0, 5).map((a: any) => a.name)
    extra.status = detail.status
    extra.voteAverage = detail.vote_average
  }

  return {
    imageUrl: item.poster_path ? `${IMG_BASE}${item.poster_path}` : '',
    releaseYear: year,
    synopsis: item.overview ?? '',
    genres: (detail?.genres ?? []).map((g: any) => g.name),
    sourceId: String(item.id),
    extra,
  }
}

export async function verifyTMDBKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/configuration?api_key=${encodeURIComponent(apiKey)}`)
    return res.ok
  } catch {
    return false
  }
}
