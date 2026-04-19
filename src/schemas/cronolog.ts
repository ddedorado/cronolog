import { z } from 'zod'

export const fieldTypes = ['text', 'number', 'date', 'rating'] as const
export type FieldType = (typeof fieldTypes)[number]

export const dataSources = ['none', 'tmdb', 'openlibrary', 'rawg'] as const
export type DataSource = (typeof dataSources)[number]

export const categoryFieldSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.enum(fieldTypes),
  required: z.boolean().default(false),
})

export const categorySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  icon: z.string().default('folder'),
  color: z.string().default('#3B82F6'),
  fields: z.array(categoryFieldSchema).default([]),
  order: z.number().int().min(0),
  dataSource: z.enum(dataSources).default('none'),
})

export const enrichmentDataSchema = z.object({
  source: z.enum(dataSources).nullable().default(null),
  sourceId: z.string().nullable().default(null),
  synopsis: z.string().default(''),
  genres: z.array(z.string()).default([]),
  extra: z.record(z.string(), z.any()).default({}),
  enrichedAt: z.string().default(''),
})

export type EnrichmentData = z.infer<typeof enrichmentDataSchema>

export const itemSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  year: z.number().int(),
  title: z.string().min(1),
  releaseYear: z.number().int().nullable().default(null),
  consumedDate: z.string().default(''),
  imageUrl: z.string().default(''),
  rating: z.number().min(0).max(5).default(0),
  order: z.number().default(0),
  customFields: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
  enrichmentData: enrichmentDataSchema.nullable().default(null),
  createdAt: z.string(),
})

export type CategoryField = z.infer<typeof categoryFieldSchema>
export type Category = z.infer<typeof categorySchema>
export type Item = z.infer<typeof itemSchema>

export interface CronologState {
  categories: Category[]
  items: Item[]
  activeYear: number
}

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'peliculas',
    name: 'Películas',
    icon: 'clapperboard',
    color: '#3B82F6',
    fields: [],
    order: 0,
    dataSource: 'tmdb',
  },
  {
    id: 'libros',
    name: 'Libros',
    icon: 'book-open',
    color: '#22C55E',
    fields: [
      { id: 'autor', name: 'Autor', type: 'text', required: false },
    ],
    order: 1,
    dataSource: 'openlibrary',
  },
  {
    id: 'tv',
    name: 'TV',
    icon: 'tv',
    color: '#EAB308',
    fields: [
      { id: 'temporada', name: 'Temporada', type: 'text', required: false },
    ],
    order: 2,
    dataSource: 'tmdb',
  },
  {
    id: 'juegos',
    name: 'Juegos',
    icon: 'gamepad-2',
    color: '#F97316',
    fields: [
      { id: 'observaciones', name: 'Observaciones', type: 'text', required: false },
    ],
    order: 3,
    dataSource: 'rawg',
  },
]
