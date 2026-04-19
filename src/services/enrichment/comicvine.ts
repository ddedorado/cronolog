import type { EnrichmentResult } from './types'

const BASE = 'https://comicvine.gamespot.com/api'

export async function searchComicVine(
  title: string,
  apiKey: string,
): Promise<EnrichmentResult | null> {
  const params = new URLSearchParams({
    api_key: apiKey,
    format: 'json',
    query: title,
    resources: 'volume',
    limit: '5',
    field_list: 'id,name,image,start_year,description,publisher,count_of_issues',
  })

  // Comic Vine requires CORS proxy or direct access
  // The API supports JSONP but for fetch we use direct calls
  const res = await fetch(`${BASE}/search/?${params}`)
  if (!res.ok) throw new Error(`Comic Vine error: ${res.status}`)

  const data = await res.json()
  const volume = data.results?.[0]
  if (!volume) return null

  // Strip HTML from description
  const rawDesc = volume.description ?? ''
  const synopsis = rawDesc.replace(/<[^>]*>/g, '').trim()

  const extra: Record<string, any> = {}
  extra.publisher = volume.publisher?.name ?? null
  extra.issues = volume.count_of_issues ?? null

  // Fetch volume detail for more info
  if (volume.id) {
    try {
      const detailParams = new URLSearchParams({
        api_key: apiKey,
        format: 'json',
        field_list: 'id,name,characters,people,start_year,publisher,count_of_issues',
      })
      const detailRes = await fetch(`${BASE}/volume/4050-${volume.id}/?${detailParams}`)
      if (detailRes.ok) {
        const detail = await detailRes.json()
        const result = detail.results
        if (result) {
          extra.characters = (result.characters ?? []).slice(0, 5).map((c: any) => c.name)
          extra.creators = (result.people ?? []).slice(0, 5).map((p: any) => p.name)
        }
      }
    } catch {
      // ignore detail fetch errors
    }
  }

  return {
    imageUrl: volume.image?.medium_url ?? volume.image?.small_url ?? '',
    releaseYear: volume.start_year ? parseInt(volume.start_year, 10) : null,
    synopsis: synopsis.slice(0, 500),
    genres: [],
    sourceId: String(volume.id ?? ''),
    extra,
  }
}

export async function verifyComicVineKey(apiKey: string): Promise<boolean> {
  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      format: 'json',
      query: 'batman',
      resources: 'volume',
      limit: '1',
    })
    const res = await fetch(`${BASE}/search/?${params}`)
    return res.ok
  } catch {
    return false
  }
}
