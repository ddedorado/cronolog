import type { Category, Item } from '@/schemas/cronolog'
import { DEFAULT_CATEGORIES } from '@/schemas/cronolog'

export const FIRESTORE_MODEL_VERSION = 2
export const FIRESTORE_BATCH_WRITE_LIMIT = 450
export const SETTINGS_DOC_ID = 'app'
export const META_DOC_ID = 'app'

export type DashboardMode = 'cronolog' | 'wishlist'

export interface CloudApiKeys {
  tmdb: string
  rawg: string
  googlebooks: string
  comicvine: string
}

export interface CloudSettings {
  apiKeys: CloudApiKeys
  autoEnrich: boolean
  accentColor: string
}

export interface CloudMeta {
  deletedCategoryIds: string[]
  dashboardMode: DashboardMode
}

export interface CronologCloudState extends CloudMeta {
  categories: Category[]
  items: Item[]
  addedYears: number[]
  settings: CloudSettings
  updatedAt: string | null
}

export interface LegacyUserDocument {
  categories?: Category[]
  items?: Item[]
  addedYears?: number[]
  settings?: Partial<CloudSettings>
  updatedAt?: string
  schemaVersion?: number
}

export interface YearDocument {
  id: string
  year: number
}

export interface EntityWritePlan<T> {
  upserts: T[]
  deletes: string[]
}

export interface CronologWritePlan {
  categories: EntityWritePlan<Category>
  items: EntityWritePlan<Item>
  years: EntityWritePlan<YearDocument>
  settings: CloudSettings | null
  meta: CloudMeta | null
  hasChanges: boolean
}

type CloudStateInput = Omit<Partial<CronologCloudState>, 'settings'> & {
  settings?: Partial<CloudSettings>
}

const DEFAULT_API_KEYS: CloudApiKeys = {
  tmdb: '',
  rawg: '',
  googlebooks: '',
  comicvine: '',
}

const DEFAULT_SETTINGS: CloudSettings = {
  apiKeys: { ...DEFAULT_API_KEYS },
  autoEnrich: true,
  accentColor: '#3B82F6',
}

const DEFAULT_META: CloudMeta = {
  deletedCategoryIds: [],
  dashboardMode: 'cronolog',
}

function cloneDefaultCategories(): Category[] {
  return DEFAULT_CATEGORIES.map((category) => ({
    ...category,
    fields: category.fields.map((field) => ({ ...field })),
  }))
}

function stableJson(value: unknown): string {
  return JSON.stringify(value)
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((entry): entry is string => typeof entry === 'string'))]
}

function normalizeYears(years: unknown): number[] {
  if (!Array.isArray(years)) return []
  return [...new Set(years.filter((year): year is number => Number.isInteger(year)))]
    .sort((a, b) => a - b)
}

export function normalizeSettings(settings?: Partial<CloudSettings>): CloudSettings {
  return {
    apiKeys: {
      ...DEFAULT_API_KEYS,
      ...(settings?.apiKeys ?? {}),
    },
    autoEnrich: typeof settings?.autoEnrich === 'boolean'
      ? settings.autoEnrich
      : DEFAULT_SETTINGS.autoEnrich,
    accentColor: typeof settings?.accentColor === 'string' && settings.accentColor.trim()
      ? settings.accentColor
      : DEFAULT_SETTINGS.accentColor,
  }
}

export function normalizeMeta(meta?: Partial<CloudMeta>): CloudMeta {
  return {
    deletedCategoryIds: normalizeStringArray(meta?.deletedCategoryIds),
    dashboardMode: meta?.dashboardMode === 'wishlist' ? 'wishlist' : DEFAULT_META.dashboardMode,
  }
}

export function createCloudState(input: CloudStateInput = {}): CronologCloudState {
  return {
    categories: input.categories ? cloneJson(input.categories) : cloneDefaultCategories(),
    items: input.items ? cloneJson(input.items) : [],
    addedYears: normalizeYears(input.addedYears),
    settings: normalizeSettings(input.settings),
    ...normalizeMeta(input),
    updatedAt: input.updatedAt ?? null,
  }
}

export function createCloudStateFromLegacy(data: LegacyUserDocument): CronologCloudState {
  return createCloudState({
    categories: data.categories,
    items: data.items,
    addedYears: data.addedYears,
    settings: data.settings,
    updatedAt: data.updatedAt ?? null,
  })
}

export function toYearDocuments(years: number[]): YearDocument[] {
  return normalizeYears(years).map((year) => ({ id: String(year), year }))
}

export function diffById<T extends { id: string }>(
  previous: T[] | null,
  next: T[],
): EntityWritePlan<T> {
  if (!previous) return { upserts: next, deletes: [] }

  const previousById = new Map(previous.map((entry) => [entry.id, entry]))
  const nextIds = new Set(next.map((entry) => entry.id))

  return {
    upserts: next.filter((entry) => stableJson(previousById.get(entry.id)) !== stableJson(entry)),
    deletes: previous.filter((entry) => !nextIds.has(entry.id)).map((entry) => entry.id),
  }
}

export function createWritePlan(
  previous: CronologCloudState | null,
  next: CronologCloudState,
): CronologWritePlan {
  const categories = diffById(previous?.categories ?? null, next.categories)
  const items = diffById(previous?.items ?? null, next.items)
  const years = diffById(previous ? toYearDocuments(previous.addedYears) : null, toYearDocuments(next.addedYears))
  const nextMeta = normalizeMeta(next)
  const nextSettings = normalizeSettings(next.settings)
  const settingsChanged = !previous || stableJson(normalizeSettings(previous.settings)) !== stableJson(nextSettings)
  const metaChanged = !previous || stableJson(normalizeMeta(previous)) !== stableJson(nextMeta)

  const hasChanges = categories.upserts.length > 0 || categories.deletes.length > 0
    || items.upserts.length > 0 || items.deletes.length > 0
    || years.upserts.length > 0 || years.deletes.length > 0
    || settingsChanged || metaChanged

  return {
    categories,
    items,
    years,
    settings: settingsChanged ? nextSettings : null,
    meta: metaChanged ? nextMeta : null,
    hasChanges,
  }
}

export function hasCloudStateChanges(previous: CronologCloudState | null, next: CronologCloudState): boolean {
  return createWritePlan(previous, next).hasChanges
}