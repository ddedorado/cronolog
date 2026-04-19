import type { EnrichmentResult } from './types'

const BASE = 'https://api.jikan.moe/v4'

export async function searchJikanAnime(
  title: string,
): Promise<EnrichmentResult | null> {
  const params = new URLSearchParams({
    q: title,
    limit: '5',
    sfw: 'true',
  })

  const res = await fetch(`${BASE}/anime?${params}`)
  if (!res.ok) throw new Error(`Jikan error: ${res.status}`)

  const data = await res.json()
  const anime = data.data?.[0]
  if (!anime) return null

  const extra: Record<string, any> = {}
  extra.episodes = anime.episodes ?? null
  extra.status = anime.status ?? null
  extra.studio = (anime.studios ?? []).map((s: any) => s.name).join(', ')
  extra.source = anime.source ?? null
  extra.duration = anime.duration ?? null
  extra.score = anime.score ?? null
  extra.type = anime.type ?? null

  return {
    imageUrl: anime.images?.jpg?.large_image_url ?? anime.images?.jpg?.image_url ?? '',
    releaseYear: anime.year ?? (anime.aired?.from ? parseInt(anime.aired.from.split('-')[0], 10) : null),
    synopsis: anime.synopsis ?? '',
    genres: [
      ...(anime.genres ?? []).map((g: any) => g.name),
      ...(anime.themes ?? []).map((t: any) => t.name),
    ].slice(0, 6),
    sourceId: String(anime.mal_id ?? ''),
    extra,
  }
}

export async function searchJikanManga(
  title: string,
  author?: string,
): Promise<EnrichmentResult | null> {
  const params = new URLSearchParams({
    q: title,
    limit: '5',
    sfw: 'true',
  })

  const res = await fetch(`${BASE}/manga?${params}`)
  if (!res.ok) throw new Error(`Jikan error: ${res.status}`)

  const data = await res.json()
  const manga = data.data?.[0]
  if (!manga) return null

  const extra: Record<string, any> = {}
  extra.author = (manga.authors ?? []).map((a: any) => a.name).join(', ')
  extra.chapters = manga.chapters ?? null
  extra.volumes = manga.volumes ?? null
  extra.status = manga.status ?? null
  extra.score = manga.score ?? null
  extra.type = manga.type ?? null
  extra.serialization = (manga.serializations ?? []).map((s: any) => s.name).join(', ')

  return {
    imageUrl: manga.images?.jpg?.large_image_url ?? manga.images?.jpg?.image_url ?? '',
    releaseYear: manga.published?.from ? parseInt(manga.published.from.split('-')[0], 10) : null,
    synopsis: manga.synopsis ?? '',
    genres: [
      ...(manga.genres ?? []).map((g: any) => g.name),
      ...(manga.themes ?? []).map((t: any) => t.name),
    ].slice(0, 6),
    sourceId: String(manga.mal_id ?? ''),
    extra,
  }
}
