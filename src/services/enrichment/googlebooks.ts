import type { EnrichmentResult } from './types'

const BASE = 'https://www.googleapis.com/books/v1'

export async function searchGoogleBooks(
  title: string,
  author?: string,
  apiKey?: string,
): Promise<EnrichmentResult | null> {
  let q = `intitle:${title}`
  if (author) q += `+inauthor:${author}`

  const params = new URLSearchParams({
    q,
    maxResults: '5',
    langRestrict: 'es',
    printType: 'books',
  })
  if (apiKey) params.set('key', apiKey)

  const res = await fetch(`${BASE}/volumes?${params}`)
  if (!res.ok) throw new Error(`Google Books error: ${res.status}`)

  const data = await res.json()

  // If no results with Spanish restriction, retry without it
  if (!data.items?.length && !author) {
    const params2 = new URLSearchParams({
      q: `intitle:${title}`,
      maxResults: '5',
      printType: 'books',
    })
    if (apiKey) params2.set('key', apiKey)

    const res2 = await fetch(`${BASE}/volumes?${params2}`)
    if (res2.ok) {
      const data2 = await res2.json()
      if (data2.items?.length) {
        return parseBook(data2.items[0])
      }
    }
  }

  const book = data.items?.[0]
  if (!book) return null

  return parseBook(book)
}

function parseBook(book: any): EnrichmentResult {
  const info = book.volumeInfo ?? {}
  const imageUrl =
    info.imageLinks?.thumbnail?.replace('http://', 'https://') ??
    info.imageLinks?.smallThumbnail?.replace('http://', 'https://') ??
    ''

  const year = info.publishedDate
    ? parseInt(info.publishedDate.split('-')[0], 10)
    : null

  const extra: Record<string, any> = {}
  extra.author = (info.authors ?? []).join(', ')
  extra.pages = info.pageCount ?? null
  extra.publisher = info.publisher ?? null
  extra.isbn =
    (info.industryIdentifiers ?? []).find((id: any) => id.type === 'ISBN_13')
      ?.identifier ??
    (info.industryIdentifiers ?? []).find((id: any) => id.type === 'ISBN_10')
      ?.identifier ??
    null
  extra.language = info.language ?? null
  extra.averageRating = info.averageRating ?? null

  return {
    imageUrl,
    releaseYear: year,
    synopsis: info.description ?? '',
    genres: (info.categories ?? []).slice(0, 5),
    sourceId: book.id ?? '',
    extra,
  }
}

export async function verifyGoogleBooksKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${BASE}/volumes?q=test&maxResults=1&key=${encodeURIComponent(apiKey)}`,
    )
    return res.ok
  } catch {
    return false
  }
}
