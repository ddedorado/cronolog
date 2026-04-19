import * as XLSX from 'xlsx'
import type { Item, Category } from '@/schemas/cronolog'
import { generateId } from '@/utils/helpers'

// ═══════════════════════════════════════════════════════════════
//  CRONOLOG — Modelo de datos para importación/exportación
// ═══════════════════════════════════════════════════════════════
//
//  Cada fila (row) representa un item. Columnas del modelo:
//
//  | Columna        | Tipo     | Requerido | Descripción                            |
//  |----------------|----------|-----------|----------------------------------------|
//  | title          | texto    | ✅        | Título del item                         |
//  | category       | texto    | ✅        | Nombre de la categoría (ej: Películas)  |
//  | year           | número   | ✅        | Año del cronolog (ej: 2026)             |
//  | rating         | número   | ❌        | Puntuación de 0 a 5 (admite decimales)  |
//  | releaseYear    | número   | ❌        | Año de estreno/publicación original     |
//  | consumedDate   | texto    | ❌        | Fecha de consumo (YYYY-MM-DD)           |
//  | status         | texto    | ❌        | completed | in-progress | backlog       |
//  | favorite       | booleano | ❌        | true / false                            |
//  | notes          | texto    | ❌        | Notas personales                        |
//  | tags           | texto    | ❌        | Etiquetas separadas por coma            |
//  | imageUrl       | texto    | ❌        | URL de la imagen/portada                |
//
//  Formatos soportados: JSON (.json), CSV (.csv), Excel (.xlsx)
//
//  JSON exporta el objeto completo (categorías + items + años).
//  CSV y XLSX exportan una tabla plana con las columnas anteriores.
//
// ═══════════════════════════════════════════════════════════════

export type ExportFormat = 'json' | 'csv' | 'xlsx'

export interface ExportOptions {
  format: ExportFormat
  years: number[]       // qué años exportar (vacío = todos)
  categories: Category[]
  items: Item[]
  addedYears: number[]
}

export interface ImportResult {
  items: Item[]
  years: number[]
  errors: string[]
}

// ── Flat row model for CSV/XLSX ──
interface FlatRow {
  title: string
  category: string
  year: number
  rating: number
  releaseYear: number | null
  consumedDate: string
  status: string
  favorite: boolean
  notes: string
  tags: string
  imageUrl: string
}

// ═══════════════════════════════════════════════════════════
//  EXPORT
// ═══════════════════════════════════════════════════════════

function itemsToRows(items: Item[], categories: Category[]): FlatRow[] {
  const catMap = new Map(categories.map((c) => [c.id, c.name]))
  return items.map((item) => ({
    title: item.title,
    category: catMap.get(item.categoryId) ?? item.categoryId,
    year: item.year,
    rating: item.rating,
    releaseYear: item.releaseYear,
    consumedDate: item.consumedDate,
    status: item.status ?? 'completed',
    favorite: item.favorite ?? false,
    notes: item.notes ?? '',
    tags: (item.tags ?? []).join(', '),
    imageUrl: item.imageUrl,
  }))
}

export function exportJSON(opts: ExportOptions): string {
  const filteredItems = opts.years.length > 0
    ? opts.items.filter((i) => opts.years.includes(i.year))
    : opts.items
  const filteredYears = opts.years.length > 0
    ? opts.addedYears.filter((y) => opts.years.includes(y))
    : opts.addedYears
  return JSON.stringify(
    { categories: opts.categories, items: filteredItems, addedYears: filteredYears },
    null,
    2,
  )
}

export function exportCSV(opts: ExportOptions): string {
  const filteredItems = opts.years.length > 0
    ? opts.items.filter((i) => opts.years.includes(i.year))
    : opts.items
  const rows = itemsToRows(filteredItems, opts.categories)
  if (rows.length === 0) return ''

  const headers = ['title', 'category', 'year', 'rating', 'releaseYear', 'consumedDate', 'status', 'favorite', 'notes', 'tags', 'imageUrl']
  const escapeCSV = (val: unknown): string => {
    const str = val === null || val === undefined ? '' : String(val)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCSV(row[h as keyof FlatRow])).join(','))
  }
  return lines.join('\n')
}

export function exportXLSX(opts: ExportOptions): ArrayBuffer {
  const filteredItems = opts.years.length > 0
    ? opts.items.filter((i) => opts.years.includes(i.year))
    : opts.items
  const rows = itemsToRows(filteredItems, opts.categories)

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)

  // Column widths
  ws['!cols'] = [
    { wch: 30 }, // title
    { wch: 14 }, // category
    { wch: 6 },  // year
    { wch: 6 },  // rating
    { wch: 10 }, // releaseYear
    { wch: 12 }, // consumedDate
    { wch: 12 }, // status
    { wch: 8 },  // favorite
    { wch: 30 }, // notes
    { wch: 20 }, // tags
    { wch: 40 }, // imageUrl
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Cronolog')
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
}

export function doExport(opts: ExportOptions): { blob: Blob; filename: string } {
  const dateStr = new Date().toISOString().split('T')[0]
  const yearSuffix = opts.years.length === 1 ? `-${opts.years[0]}` : opts.years.length > 1 ? `-${opts.years[0]}-${opts.years[opts.years.length - 1]}` : ''

  switch (opts.format) {
    case 'json': {
      const data = exportJSON(opts)
      return {
        blob: new Blob([data], { type: 'application/json' }),
        filename: `cronolog${yearSuffix}-${dateStr}.json`,
      }
    }
    case 'csv': {
      const data = exportCSV(opts)
      return {
        blob: new Blob([data], { type: 'text/csv;charset=utf-8' }),
        filename: `cronolog${yearSuffix}-${dateStr}.csv`,
      }
    }
    case 'xlsx': {
      const data = exportXLSX(opts)
      return {
        blob: new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        filename: `cronolog${yearSuffix}-${dateStr}.xlsx`,
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════
//  IMPORT
// ═══════════════════════════════════════════════════════════

function parseFlatRows(rows: Record<string, unknown>[], categories: Category[]): ImportResult {
  const catNameMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]))
  const items: Item[] = []
  const years = new Set<number>()
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const lineNum = i + 2 // header is line 1

    const title = String(row['title'] || row['Title'] || row['nombre'] || row['Nombre'] || '').trim()
    if (!title) {
      errors.push(`Fila ${lineNum}: título vacío, omitida`)
      continue
    }

    const catName = String(row['category'] || row['Category'] || row['categoría'] || row['categoria'] || '').trim().toLowerCase()
    let categoryId = catNameMap.get(catName) ?? ''
    if (!categoryId) {
      // Try fuzzy match
      for (const [name, id] of catNameMap) {
        if (name.includes(catName) || catName.includes(name)) {
          categoryId = id
          break
        }
      }
    }
    if (!categoryId) {
      errors.push(`Fila ${lineNum}: categoría "${catName}" no encontrada, usando primera`)
      categoryId = categories[0]?.id ?? 'peliculas'
    }

    const year = parseInt(String(row['year'] || row['Year'] || row['año'] || ''), 10)
    if (!year || isNaN(year)) {
      errors.push(`Fila ${lineNum}: año no válido, omitida`)
      continue
    }
    years.add(year)

    const rating = Math.min(5, Math.max(0, parseFloat(String(row['rating'] || row['Rating'] || row['nota'] || '0')) || 0))
    const releaseYear = parseInt(String(row['releaseYear'] || row['ReleaseYear'] || ''), 10) || null
    const consumedDate = String(row['consumedDate'] || row['ConsumedDate'] || row['date'] || row['fecha'] || '').trim()
    const status = (['completed', 'in-progress', 'backlog'].includes(String(row['status'] || '').trim()))
      ? String(row['status']).trim() as 'completed' | 'in-progress' | 'backlog'
      : 'completed'
    const favorite = String(row['favorite'] || row['Favorite'] || '').toLowerCase() === 'true'
    const notes = String(row['notes'] || row['Notes'] || row['notas'] || '').trim()
    const tagsRaw = String(row['tags'] || row['Tags'] || row['etiquetas'] || '').trim()
    const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : []
    const imageUrl = String(row['imageUrl'] || row['ImageUrl'] || row['imagen'] || '').trim()

    items.push({
      id: generateId(),
      categoryId,
      year,
      title,
      releaseYear,
      consumedDate,
      imageUrl,
      rating,
      order: items.filter((it) => it.categoryId === categoryId && it.year === year).length,
      status,
      favorite,
      notes,
      tags,
      customFields: {},
      enrichmentData: null,
      createdAt: new Date().toISOString(),
    })
  }

  return { items, years: [...years], errors }
}

export function importJSON(text: string, categories: Category[]): ImportResult {
  try {
    const data = JSON.parse(text)
    // Full Cronolog backup format
    if (data.items && Array.isArray(data.items)) {
      const years = new Set<number>()
      const items: Item[] = data.items.map((item: any) => {
        years.add(item.year)
        return {
          id: item.id || generateId(),
          categoryId: item.categoryId ?? '',
          year: item.year ?? new Date().getFullYear(),
          title: item.title ?? '',
          releaseYear: item.releaseYear ?? null,
          consumedDate: item.consumedDate ?? '',
          imageUrl: item.imageUrl ?? '',
          rating: item.rating ?? 0,
          order: item.order ?? 0,
          status: item.status ?? 'completed',
          favorite: item.favorite ?? false,
          notes: item.notes ?? '',
          tags: item.tags ?? [],
          customFields: item.customFields ?? {},
          enrichmentData: item.enrichmentData ?? null,
          createdAt: item.createdAt ?? new Date().toISOString(),
        }
      })
      return { items, years: [...years], errors: [] }
    }
    // Array of flat rows
    if (Array.isArray(data)) {
      return parseFlatRows(data, categories)
    }
    return { items: [], years: [], errors: ['Formato JSON no reconocido'] }
  } catch {
    return { items: [], years: [], errors: ['JSON no válido'] }
  }
}

export function importCSV(text: string, categories: Category[]): ImportResult {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return { items: [], years: [], errors: ['CSV vacío o sin cabecera'] }

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = []
    let current = ''
    let inQuotes = false
    for (const char of lines[i]) {
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
    headers.forEach((h, j) => { row[h] = values[j] ?? '' })
    rows.push(row)
  }

  return parseFlatRows(rows, categories)
}

export function importXLSX(buffer: ArrayBuffer, categories: Category[]): ImportResult {
  try {
    const wb = XLSX.read(buffer, { type: 'array' })
    const sheetName = wb.SheetNames[0]
    if (!sheetName) return { items: [], years: [], errors: ['Archivo XLSX vacío'] }
    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)
    return parseFlatRows(rows, categories)
  } catch {
    return { items: [], years: [], errors: ['Error al leer archivo XLSX'] }
  }
}

export function detectFormatFromFile(filename: string): ExportFormat {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'xlsx' || ext === 'xls') return 'xlsx'
  if (ext === 'csv') return 'csv'
  return 'json'
}
