import type { EnrichmentResult } from './types'

const BASE = 'https://api.rawg.io/api'

export async function searchRAWG(
  title: string,
  apiKey: string,
): Promise<EnrichmentResult | null> {
  const url = `${BASE}/games?key=${encodeURIComponent(apiKey)}&search=${encodeURIComponent(title)}&page_size=1`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`RAWG error: ${res.status}`)

  const data = await res.json()
  const game = data.results?.[0]
  if (!game) return null

  // Fetch detail for description
  const detailUrl = `${BASE}/games/${game.id}?key=${encodeURIComponent(apiKey)}`
  const detailRes = await fetch(detailUrl)
  const detail = detailRes.ok ? await detailRes.json() : null

  const extra: Record<string, any> = {}
  extra.platforms = (game.platforms ?? []).map((p: any) => p.platform.name)
  extra.metacritic = game.metacritic
  extra.playtime = game.playtime
  if (detail) {
    extra.developers = (detail.developers ?? []).map((d: any) => d.name).join(', ')
    extra.publishers = (detail.publishers ?? []).map((p: any) => p.name).join(', ')
  }

  // Strip HTML tags from description
  const rawSynopsis = detail?.description ?? ''
  const synopsis = rawSynopsis.replace(/<[^>]*>/g, '')

  return {
    imageUrl: game.background_image ?? '',
    releaseYear: game.released ? parseInt(game.released.split('-')[0], 10) : null,
    synopsis,
    genres: (game.genres ?? []).map((g: any) => g.name),
    sourceId: String(game.id),
    extra,
  }
}

export async function verifyRAWGKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/games?key=${encodeURIComponent(apiKey)}&page_size=1`)
    return res.ok
  } catch {
    return false
  }
}
