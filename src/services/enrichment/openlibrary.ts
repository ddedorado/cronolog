import type { EnrichmentResult } from './types'

const BASE = 'https://openlibrary.org'

export async function searchOpenLibrary(
  title: string,
  author?: string,
): Promise<EnrichmentResult | null> {
  // Build search params: use title field + optional author
  const params = new URLSearchParams({ limit: '5' })
  params.set('title', title)
  if (author) {
    params.set('author', author)
  }

  const url = `${BASE}/search.json?${params.toString()}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Open Library error: ${res.status}`)

  const data = await res.json()
  const book = data.docs?.[0]
  if (!book) return null

  const coverId = book.cover_i
  const imageUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : ''
  const year = book.first_publish_year ?? null

  // Try to fetch description from the work
  let synopsis = ''
  if (book.key) {
    try {
      const workRes = await fetch(`${BASE}${book.key}.json`)
      if (workRes.ok) {
        const work = await workRes.json()
        if (typeof work.description === 'string') {
          synopsis = work.description
        } else if (work.description?.value) {
          synopsis = work.description.value
        }
      }
    } catch {
      // ignore, synopsis stays empty
    }
  }

  const extra: Record<string, any> = {}
  extra.author = (book.author_name ?? []).join(', ')
  extra.pages = book.number_of_pages_median ?? null
  extra.publisher = (book.publisher ?? []).slice(0, 2).join(', ')
  extra.isbn = (book.isbn ?? [])[0] ?? null
  extra.language = (book.language ?? []).slice(0, 3).join(', ')

  return {
    imageUrl,
    releaseYear: year,
    synopsis,
    genres: (book.subject ?? []).slice(0, 5),
    sourceId: book.key ?? '',
    extra,
  }
}
