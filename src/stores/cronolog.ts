import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Category, Item } from '@/schemas/cronolog'
import { DEFAULT_CATEGORIES } from '@/schemas/cronolog'

export const useCronologStore = defineStore(
  'cronolog',
  () => {
    const categories = ref<Category[]>([...DEFAULT_CATEGORIES])
    const items = ref<Item[]>([])
    const activeYear = ref(new Date().getFullYear())
    const addedYears = ref<number[]>([])

    // ── Getters ──
    const sortedCategories = computed(() =>
      [...categories.value].sort((a, b) => a.order - b.order),
    )

    const itemsByYear = computed(() => {
      const map: Record<number, Item[]> = {}
      for (const item of items.value) {
        if (!map[item.year]) map[item.year] = []
        map[item.year].push(item)
      }
      return map
    })

    const activeItems = computed(() => itemsByYear.value[activeYear.value] ?? [])

    function itemsForCategory(categoryId: string): Item[] {
      return activeItems.value
        .filter((i) => i.categoryId === categoryId)
        .sort((a, b) => {
          const oa = a.order ?? 0
          const ob = b.order ?? 0
          if (oa !== ob) return oa - ob
          return a.createdAt.localeCompare(b.createdAt)
        })
    }

    function reorderCategoryItems(categoryId: string, orderedIds: string[]) {
      const newItems = [...items.value]
      for (let i = 0; i < orderedIds.length; i++) {
        const idx = newItems.findIndex((it) => it.id === orderedIds[i])
        if (idx !== -1) {
          newItems[idx] = { ...newItems[idx], order: i }
        }
      }
      items.value = newItems
    }

    function reorderCategories(orderedIds: string[]) {
      const newCats = [...categories.value]
      for (let i = 0; i < orderedIds.length; i++) {
        const idx = newCats.findIndex((c) => c.id === orderedIds[i])
        if (idx !== -1) {
          newCats[idx] = { ...newCats[idx], order: i }
        }
      }
      categories.value = newCats
    }

    const hasYears = computed(() => availableYears.value.length > 0)

    const availableYears = computed(() => {
      const years = new Set<number>([
        ...items.value.map((i) => i.year),
        ...addedYears.value,
      ])
      return [...years].sort((a, b) => a - b)
    })

    const yearStats = computed(() => {
      const stats: Record<string, number> = {}
      for (const cat of categories.value) {
        stats[cat.id] = activeItems.value.filter((i) => i.categoryId === cat.id).length
      }
      return stats
    })

    const totalActiveItems = computed(() => activeItems.value.length)

    // ── Actions: Items ──
    function addItem(item: Item) {
      items.value = [...items.value, item]
    }

    function updateItem(id: string, updates: Partial<Item>) {
      const idx = items.value.findIndex((i) => i.id === id)
      if (idx !== -1) {
        const updated = { ...items.value[idx], ...updates }
        const newItems = [...items.value]
        newItems[idx] = updated
        items.value = newItems
      }
    }

    function removeItem(id: string) {
      items.value = items.value.filter((i) => i.id !== id)
    }

    /** Remove item and return a restore function */
    function removeItemWithUndo(id: string): (() => void) | null {
      const item = items.value.find((i) => i.id === id)
      if (!item) return null
      const snapshot = { ...item }
      items.value = items.value.filter((i) => i.id !== id)
      return () => {
        items.value = [...items.value, snapshot]
      }
    }

    // ── Actions: Categories ──
    function addCategory(category: Category) {
      categories.value = [...categories.value, category]
    }

    function updateCategory(id: string, updates: Partial<Category>) {
      const idx = categories.value.findIndex((c) => c.id === id)
      if (idx !== -1) {
        const updated = { ...categories.value[idx], ...updates }
        const newCategories = [...categories.value]
        newCategories[idx] = updated
        categories.value = newCategories
      }
    }

    function removeCategory(id: string) {
      categories.value = categories.value.filter((c) => c.id !== id)
      items.value = items.value.filter((i) => i.categoryId !== id)
    }

    /** Remove category and return a restore function */
    function removeCategoryWithUndo(id: string): (() => void) | null {
      const category = categories.value.find((c) => c.id === id)
      if (!category) return null
      const catSnapshot = { ...category, fields: [...category.fields] }
      const itemSnapshots = items.value.filter((i) => i.categoryId === id).map((i) => ({ ...i }))
      categories.value = categories.value.filter((c) => c.id !== id)
      items.value = items.value.filter((i) => i.categoryId !== id)
      return () => {
        categories.value = [...categories.value, catSnapshot]
        items.value = [...items.value, ...itemSnapshots]
      }
    }

    // ── Actions: Year ──
    function setActiveYear(year: number) {
      activeYear.value = year
    }

    function addYear(year: number) {
      if (!addedYears.value.includes(year)) {
        addedYears.value = [...addedYears.value, year]
      }
      activeYear.value = year
    }

    function removeYear(year: number) {
      // Compute next active year BEFORE mutating
      const allYears = availableYears.value
      const remaining = allYears.filter((y) => y !== year)
      const nextYear = remaining.length > 0
        ? (remaining.includes(activeYear.value) && activeYear.value !== year
          ? activeYear.value
          : remaining[remaining.length - 1])
        : null

      // Now mutate
      addedYears.value = addedYears.value.filter((y) => y !== year)
      items.value = items.value.filter((i) => i.year !== year)

      if (nextYear !== null) {
        activeYear.value = nextYear
      }
    }

    // ── Actions: Import/Export ──
    function exportData() {
      return JSON.stringify(
        { categories: categories.value, items: items.value, addedYears: addedYears.value },
        null,
        2,
      )
    }

    function importData(json: string) {
      const data = JSON.parse(json)
      if (data.categories) categories.value = data.categories
      if (data.items) items.value = data.items
      if (data.addedYears) addedYears.value = data.addedYears
    }

    // ── Migration: ensure addedYears includes years from items + activeYear ──
    function migrateData() {
      const yearsFromItems = new Set(items.value.map((i) => i.year))
      const current = new Set(addedYears.value)
      let changed = false
      for (const y of yearsFromItems) {
        if (!current.has(y)) {
          current.add(y)
          changed = true
        }
      }
      if (changed) {
        addedYears.value = [...current]
      }
      // Ensure activeYear is valid
      if (availableYears.value.length > 0 && !availableYears.value.includes(activeYear.value)) {
        activeYear.value = availableYears.value[availableYears.value.length - 1]
      }

      // Migrate categories: add dataSource if missing
      const sourceMap: Record<string, string> = {
        peliculas: 'tmdb',
        tv: 'tmdb',
        libros: 'openlibrary',
        juegos: 'rawg',
      }
      let catChanged = false
      const newCats = categories.value.map((c) => {
        if (!c.dataSource || c.dataSource === ('none' as any)) {
          const ds = sourceMap[c.id]
          if (ds) {
            catChanged = true
            return { ...c, dataSource: ds }
          }
        }
        return c
      })
      if (catChanged) {
        categories.value = newCats as typeof categories.value
      }

      // Migrate Libros: add autor field if missing
      const libros = categories.value.find((c) => c.id === 'libros')
      if (libros && !libros.fields.some((f) => f.id === 'autor')) {
        const updated = {
          ...libros,
          fields: [
            { id: 'autor', name: 'Autor', type: 'text' as const, required: false },
            ...libros.fields,
          ],
        }
        categories.value = categories.value.map((c) => c.id === 'libros' ? updated : c)
      }
    }

    return {
      categories,
      items,
      activeYear,
      addedYears,
      hasYears,
      sortedCategories,
      itemsByYear,
      activeItems,
      availableYears,
      yearStats,
      totalActiveItems,
      itemsForCategory,
      addItem,
      updateItem,
      removeItem,
      removeItemWithUndo,
      reorderCategoryItems,
      reorderCategories,
      addCategory,
      updateCategory,
      removeCategory,
      removeCategoryWithUndo,
      setActiveYear,
      addYear,
      removeYear,
      exportData,
      importData,
      migrateData,
    }
  },
  {
    persist: true,
  },
)
