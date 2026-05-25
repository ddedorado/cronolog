import { describe, expect, it } from 'vitest'
import type { Category, Item } from '@/schemas/cronolog'
import {
  createCloudState,
  createCloudStateFromLegacy,
  createWritePlan,
  toYearDocuments,
} from '@/services/firestoreModel'

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'peliculas',
    name: 'Películas',
    icon: 'clapperboard',
    color: '#3B82F6',
    fields: [],
    order: 0,
    dataSource: 'tmdb',
    ...overrides,
  }
}

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
    categoryId: 'peliculas',
    year: 2026,
    title: 'Test Movie',
    releaseYear: 2026,
    consumedDate: '2026-01-15',
    imageUrl: '',
    rating: 4,
    order: 0,
    status: 'completed',
    favorite: false,
    notes: '',
    tags: [],
    customFields: {},
    enrichmentData: null,
    createdAt: '2026-01-15T10:00:00.000Z',
    ...overrides,
  }
}

describe('Firestore v2 model helpers', () => {
  it('converts the legacy single-document model into normalized cloud state', () => {
    const state = createCloudStateFromLegacy({
      categories: [makeCategory()],
      items: [makeItem()],
      addedYears: [2026, 2025, 2026],
      settings: {
        apiKeys: { tmdb: 'tmdb-key', rawg: '', googlebooks: '', comicvine: '' },
        autoEnrich: false,
      },
      updatedAt: '2026-05-25T10:00:00.000Z',
    })

    expect(state.categories).toHaveLength(1)
    expect(state.items).toHaveLength(1)
    expect(state.addedYears).toEqual([2025, 2026])
    expect(state.settings.apiKeys.tmdb).toBe('tmdb-key')
    expect(state.settings.autoEnrich).toBe(false)
    expect(state.settings.accentColor).toBe('#3B82F6')
    expect(state.deletedCategoryIds).toEqual([])
    expect(state.dashboardMode).toBe('cronolog')
  })

  it('plans a full write when there is no previous v2 state', () => {
    const state = createCloudState({
      categories: [makeCategory()],
      items: [makeItem()],
      addedYears: [2026],
    })

    const plan = createWritePlan(null, state)

    expect(plan.categories.upserts.map((category) => category.id)).toEqual(['peliculas'])
    expect(plan.items.upserts.map((item) => item.id)).toEqual(['item-1'])
    expect(plan.years.upserts).toEqual([{ id: '2026', year: 2026 }])
    expect(plan.settings).not.toBeNull()
    expect(plan.meta).not.toBeNull()
    expect(plan.hasChanges).toBe(true)
  })

  it('only writes changed entities and deletes missing documents', () => {
    const previous = createCloudState({
      categories: [makeCategory(), makeCategory({ id: 'libros', name: 'Libros', order: 1 })],
      items: [makeItem({ id: 'a', title: 'A' }), makeItem({ id: 'b', title: 'B' })],
      addedYears: [2025, 2026],
    })
    const next = createCloudState({
      categories: [makeCategory({ color: '#111111' })],
      items: [makeItem({ id: 'a', title: 'A changed' }), makeItem({ id: 'c', title: 'C' })],
      addedYears: [2026, 2027],
      dashboardMode: 'wishlist',
    })

    const plan = createWritePlan(previous, next)

    expect(plan.categories.upserts.map((category) => category.id)).toEqual(['peliculas'])
    expect(plan.categories.deletes).toEqual(['libros'])
    expect(plan.items.upserts.map((item) => item.id)).toEqual(['a', 'c'])
    expect(plan.items.deletes).toEqual(['b'])
    expect(plan.years.upserts).toEqual([{ id: '2027', year: 2027 }])
    expect(plan.years.deletes).toEqual(['2025'])
    expect(plan.settings).toBeNull()
    expect(plan.meta?.dashboardMode).toBe('wishlist')
    expect(plan.hasChanges).toBe(true)
  })

  it('stores years as stable document ids', () => {
    expect(toYearDocuments([2027, 2026, 2027])).toEqual([
      { id: '2026', year: 2026 },
      { id: '2027', year: 2027 },
    ])
  })

  it('creates immutable snapshots for diff baselines', () => {
    const categories = [makeCategory()]
    const items = [makeItem()]
    const state = createCloudState({ categories, items })

    categories[0].name = 'Mutated category'
    items[0].title = 'Mutated title'

    expect(state.categories[0].name).toBe('Películas')
    expect(state.items[0].title).toBe('Test Movie')
  })
})