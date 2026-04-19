import type { Item } from '@/schemas/cronolog'
import { generateId, todayISO } from '@/utils/helpers'

export type ImportSource = 'csv' | 'letterboxd' | 'goodreads' | 'mal'

interface ImportedItem {
  title: string
  rating: number
  year: number
  releaseYear: number | null
  consumedDate: string
  categoryId: string
}

function parseCSVRows(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map((line) => {
    const values: string[] = []
    let current = ''
    let inQuotes = false
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = values[i] ?? ''
    })
    return row
  })
}

function parseLetterboxd(text: string, year: number): ImportedItem[] {
  const rows = parseCSVRows(text)
  return rows
    .filter((r) => r['Name'] || r['Title'])
    .map((r) => ({
      title: r['Name'] || r['Title'] || '',
      rating: parseFloat(r['Rating'] || '0') || 0,
      year,
      releaseYear: parseInt(r['Year'] || '', 10) || null,
      consumedDate: r['Watched Date'] || r['Date'] || '',
      categoryId: 'peliculas',
    }))
}

function parseGoodreads(text: string, year: number): ImportedItem[] {
  const rows = parseCSVRows(text)
  return rows
    .filter((r) => r['Title'])
    .map((r) => {
      const myRating = parseFloat(r['My Rating'] || '0') || 0
      return {
        title: r['Title'] || '',
        rating: myRating,
        year,
        releaseYear: parseInt(r['Original Publication Year'] || r['Year Published'] || '', 10) || null,
        consumedDate: r['Date Read'] || '',
        categoryId: 'libros',
      }
    })
}

function parseMAL(text: string, year: number): ImportedItem[] {
  const rows = parseCSVRows(text)
  return rows
    .filter((r) => r['series_title'] || r['Title'])
    .map((r) => ({
      title: r['series_title'] || r['Title'] || '',
      rating: (parseInt(r['my_score'] || r['Score'] || '0', 10) || 0) / 2,
      year,
      releaseYear: null,
      consumedDate: r['my_finish_date'] || r['Finish Date'] || '',
      categoryId: r['series_type'] === 'Manga' ? 'manga' : 'anime',
    }))
}

function parseGenericCSV(text: string, year: number, categoryId: string): ImportedItem[] {
  const rows = parseCSVRows(text)
  return rows
    .filter((r) => r['title'] || r['Title'] || r['nombre'] || r['Nombre'])
    .map((r) => ({
      title: r['title'] || r['Title'] || r['nombre'] || r['Nombre'] || '',
      rating: parseFloat(r['rating'] || r['Rating'] || r['nota'] || r['Nota'] || '0') || 0,
      year,
      releaseYear: parseInt(r['year'] || r['Year'] || r['año'] || '', 10) || null,
      consumedDate: r['date'] || r['Date'] || r['fecha'] || '',
      categoryId,
    }))
}

export function importFromFile(
  text: string,
  source: ImportSource,
  year: number,
  categoryId: string,
): Item[] {
  let imported: ImportedItem[]

  switch (source) {
    case 'letterboxd':
      imported = parseLetterboxd(text, year)
      break
    case 'goodreads':
      imported = parseGoodreads(text, year)
      break
    case 'mal':
      imported = parseMAL(text, year)
      break
    case 'csv':
    default:
      imported = parseGenericCSV(text, year, categoryId)
      break
  }

  const now = todayISO()
  return imported.map((imp, i) => ({
    id: generateId(),
    categoryId: imp.categoryId || categoryId,
    year: imp.year,
    title: imp.title,
    releaseYear: imp.releaseYear,
    consumedDate: imp.consumedDate,
    imageUrl: '',
    rating: Math.min(5, Math.max(0, imp.rating)),
    order: i,
    status: 'completed' as const,
    favorite: false,
    notes: '',
    tags: [],
    customFields: {},
    enrichmentData: null,
    createdAt: now,
  }))
}

export function detectImportSource(text: string): ImportSource {
  const lower = text.toLowerCase()
  if (lower.includes('watched date') || lower.includes('letterboxd')) return 'letterboxd'
  if (lower.includes('my rating') && lower.includes('bookshelves')) return 'goodreads'
  if (lower.includes('series_title') || lower.includes('my_score')) return 'mal'
  return 'csv'
}
