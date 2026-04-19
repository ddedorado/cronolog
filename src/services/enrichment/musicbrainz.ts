import type { EnrichmentResult } from './types'

const BASE = 'https://musicbrainz.org/ws/2'
const COVER_BASE = 'https://coverartarchive.org'
const USER_AGENT = 'Cronolog/1.0 (https://cronolog.vercel.app)'

export async function searchMusicBrainz(
  title: string,
  artist?: string,
): Promise<EnrichmentResult | null> {
  let query = `release:${title}`
  if (artist) query += ` AND artist:${artist}`

  const params = new URLSearchParams({
    query,
    fmt: 'json',
    limit: '5',
  })

  const res = await fetch(`${BASE}/release/?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
  })
  if (!res.ok) throw new Error(`MusicBrainz error: ${res.status}`)

  const data = await res.json()
  const release = data.releases?.[0]
  if (!release) return null

  // Try to get cover art
  let imageUrl = ''
  try {
    const coverRes = await fetch(`${COVER_BASE}/release/${release.id}`, {
      headers: { 'User-Agent': USER_AGENT },
    })
    if (coverRes.ok) {
      const coverData = await coverRes.json()
      const front = coverData.images?.find((img: any) => img.front)
      imageUrl = front?.thumbnails?.large ?? front?.image ?? ''
    }
  } catch {
    // Cover art not available
  }

  const year = release.date
    ? parseInt(release.date.split('-')[0], 10)
    : null

  const artistNames = (release['artist-credit'] ?? [])
    .map((ac: any) => ac.name ?? ac.artist?.name)
    .filter(Boolean)

  const extra: Record<string, any> = {}
  extra.artist = artistNames.join(', ')
  extra.label = (release['label-info'] ?? [])
    .map((li: any) => li.label?.name)
    .filter(Boolean)
    .join(', ')
  extra.trackCount = release['track-count'] ?? null
  extra.country = release.country ?? null
  extra.status = release.status ?? null

  // Try to get tags from release-group
  let genres: string[] = []
  if (release['release-group']?.id) {
    try {
      const rgRes = await fetch(
        `${BASE}/release-group/${release['release-group'].id}?inc=tags&fmt=json`,
        { headers: { 'User-Agent': USER_AGENT } },
      )
      if (rgRes.ok) {
        const rg = await rgRes.json()
        genres = (rg.tags ?? [])
          .sort((a: any, b: any) => (b.count ?? 0) - (a.count ?? 0))
          .slice(0, 5)
          .map((t: any) => t.name)
      }
    } catch {
      // ignore
    }
  }

  return {
    imageUrl,
    releaseYear: year,
    synopsis: '',
    genres,
    sourceId: release.id ?? '',
    extra,
  }
}
