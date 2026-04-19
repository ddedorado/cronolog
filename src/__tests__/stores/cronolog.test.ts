import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCronologStore } from '@/stores/cronolog'
import type { Item, Category } from '@/schemas/cronolog'

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

describe('cronolog store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('has default categories', () => {
    const store = useCronologStore()
    expect(store.categories.length).toBeGreaterThanOrEqual(4)
    expect(store.categories.map((c) => c.id)).toContain('peliculas')
  })

  it('adds and removes years', () => {
    const store = useCronologStore()
    store.addYear(2026)
    expect(store.availableYears).toContain(2026)
    expect(store.activeYear).toBe(2026)

    store.addYear(2025)
    expect(store.availableYears).toEqual([2025, 2026])

    store.removeYear(2026)
    expect(store.availableYears).toEqual([2025])
    expect(store.activeYear).toBe(2025)
  })

  it('adds, updates, and removes items', () => {
    const store = useCronologStore()
    store.addYear(2026)
    const item = makeItem()

    store.addItem(item)
    expect(store.items).toHaveLength(1)
    expect(store.totalActiveItems).toBe(1)

    store.updateItem('item-1', { title: 'Updated' })
    expect(store.items[0].title).toBe('Updated')

    store.removeItem('item-1')
    expect(store.items).toHaveLength(0)
  })

  it('filters items by year and category', () => {
    const store = useCronologStore()
    store.addYear(2025)
    store.addYear(2026)
    store.setActiveYear(2026)

    store.addItem(makeItem({ id: 'a', year: 2026, categoryId: 'peliculas' }))
    store.addItem(makeItem({ id: 'b', year: 2025, categoryId: 'peliculas' }))
    store.addItem(makeItem({ id: 'c', year: 2026, categoryId: 'libros' }))

    expect(store.activeItems).toHaveLength(2) // a + c
    expect(store.itemsForCategory('peliculas')).toHaveLength(1) // only a
    expect(store.itemsForCategory('libros')).toHaveLength(1) // only c
  })

  it('reorders items within a category', () => {
    const store = useCronologStore()
    store.addYear(2026)
    store.addItem(makeItem({ id: 'x', order: 0, createdAt: '2026-01-01T00:00:00Z' }))
    store.addItem(makeItem({ id: 'y', order: 1, createdAt: '2026-01-02T00:00:00Z' }))
    store.addItem(makeItem({ id: 'z', order: 2, createdAt: '2026-01-03T00:00:00Z' }))

    store.reorderCategoryItems('peliculas', ['z', 'x', 'y'])

    const ordered = store.itemsForCategory('peliculas')
    expect(ordered.map((i) => i.id)).toEqual(['z', 'x', 'y'])
  })

  it('reorders categories', () => {
    const store = useCronologStore()
    const originalOrder = store.sortedCategories.map((c) => c.id)
    const reversed = [...originalOrder].reverse()

    store.reorderCategories(reversed)
    expect(store.sortedCategories.map((c) => c.id)).toEqual(reversed)
  })

  it('adds and removes categories', () => {
    const store = useCronologStore()
    const initial = store.categories.length

    const newCat: Category = {
      id: 'test-cat',
      name: 'Test',
      icon: 'folder',
      color: '#FF0000',
      fields: [],
      order: 99,
      dataSource: 'none',
    }

    store.addCategory(newCat)
    expect(store.categories).toHaveLength(initial + 1)

    store.removeCategory('test-cat')
    expect(store.categories).toHaveLength(initial)
  })

  it('removes items when removing a category', () => {
    const store = useCronologStore()
    store.addYear(2026)
    store.addItem(makeItem({ id: 'a', categoryId: 'peliculas' }))
    store.addItem(makeItem({ id: 'b', categoryId: 'libros' }))

    store.removeCategory('peliculas')
    expect(store.items).toHaveLength(1)
    expect(store.items[0].categoryId).toBe('libros')
  })

  it('removes year items and adjusts activeYear', () => {
    const store = useCronologStore()
    store.addYear(2025)
    store.addYear(2026)
    store.setActiveYear(2026)
    store.addItem(makeItem({ id: 'a', year: 2026 }))

    store.removeYear(2026)
    expect(store.items).toHaveLength(0)
    expect(store.activeYear).toBe(2025)
  })

  it('computes yearStats correctly', () => {
    const store = useCronologStore()
    store.addYear(2026)
    store.addItem(makeItem({ id: 'a', categoryId: 'peliculas' }))
    store.addItem(makeItem({ id: 'b', categoryId: 'peliculas' }))
    store.addItem(makeItem({ id: 'c', categoryId: 'libros' }))

    expect(store.yearStats['peliculas']).toBe(2)
    expect(store.yearStats['libros']).toBe(1)
    expect(store.totalActiveItems).toBe(3)
  })

  it('exports and imports data', () => {
    const store = useCronologStore()
    store.addYear(2026)
    store.addItem(makeItem())

    const exported = store.exportData()
    const parsed = JSON.parse(exported)
    expect(parsed.items).toHaveLength(1)
    expect(parsed.addedYears).toContain(2026)

    // Import into fresh store
    const store2 = useCronologStore()
    store2.importData(exported)
    expect(store2.items).toHaveLength(1)
  })

  it('migration adds dataSource to legacy categories', () => {
    const store = useCronologStore()
    // Manually remove dataSource to simulate legacy
    store.categories = store.categories.map((c) => {
      const { dataSource, ...rest } = c as any
      return rest
    }) as any

    store.migrateData()
    const peliculas = store.categories.find((c) => c.id === 'peliculas')
    expect(peliculas?.dataSource).toBe('tmdb')
  })

  it('removeItemWithUndo removes and restores item', () => {
    const store = useCronologStore()
    store.addYear(2026)
    const item = makeItem({ id: 'undo-test' })
    store.addItem(item)
    expect(store.items).toHaveLength(1)

    const restore = store.removeItemWithUndo('undo-test')
    expect(store.items).toHaveLength(0)
    expect(restore).not.toBeNull()

    restore!()
    expect(store.items).toHaveLength(1)
    expect(store.items[0].id).toBe('undo-test')
  })

  it('removeCategoryWithUndo removes and restores category with items', () => {
    const store = useCronologStore()
    store.addYear(2026)
    store.addItem(makeItem({ id: 'cat-item', categoryId: 'peliculas' }))

    const initialCatCount = store.categories.length
    const restore = store.removeCategoryWithUndo('peliculas')
    expect(store.categories).toHaveLength(initialCatCount - 1)
    expect(store.items).toHaveLength(0)
    expect(restore).not.toBeNull()

    restore!()
    expect(store.categories).toHaveLength(initialCatCount)
    expect(store.items).toHaveLength(1)
    expect(store.items[0].id).toBe('cat-item')
  })
})
