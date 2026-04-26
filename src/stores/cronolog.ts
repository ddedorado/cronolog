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
    const deletedCategoryIds = ref<string[]>([])
    const dashboardMode = ref<'cronolog' | 'wishlist'>('cronolog')

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
        ...items.value.map((i) => i.year).filter((y) => y !== 0),
        ...addedYears.value,
      ])
      return [...years].sort((a, b) => a - b)
    })

    // ── Wishlist getters ──
    const isWishlistMode = computed(() => dashboardMode.value === 'wishlist')

    const wishlistItems = computed(() =>
      items.value.filter((i) => i.year === 0 && i.status === 'backlog'),
    )

    function wishlistItemsForCategory(categoryId: string): Item[] {
      return wishlistItems.value
        .filter((i) => i.categoryId === categoryId)
        .sort((a, b) => {
          const oa = a.order ?? 0
          const ob = b.order ?? 0
          if (oa !== ob) return oa - ob
          return a.createdAt.localeCompare(b.createdAt)
        })
    }

    const wishlistStats = computed(() => {
      const stats: Record<string, number> = {}
      for (const cat of categories.value) {
        stats[cat.id] = wishlistItems.value.filter((i) => i.categoryId === cat.id).length
      }
      return stats
    })

    const totalWishlistItems = computed(() => wishlistItems.value.length)

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
      if (!deletedCategoryIds.value.includes(id)) {
        deletedCategoryIds.value = [...deletedCategoryIds.value, id]
      }
    }

    /** Remove category and return a restore function */
    function removeCategoryWithUndo(id: string): (() => void) | null {
      const category = categories.value.find((c) => c.id === id)
      if (!category) return null
      const catSnapshot = { ...category, fields: [...category.fields] }
      const itemSnapshots = items.value.filter((i) => i.categoryId === id).map((i) => ({ ...i }))
      categories.value = categories.value.filter((c) => c.id !== id)
      items.value = items.value.filter((i) => i.categoryId !== id)
      if (!deletedCategoryIds.value.includes(id)) {
        deletedCategoryIds.value = [...deletedCategoryIds.value, id]
      }
      return () => {
        categories.value = [...categories.value, catSnapshot]
        items.value = [...items.value, ...itemSnapshots]
        deletedCategoryIds.value = deletedCategoryIds.value.filter((d) => d !== id)
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

    // ── Actions: Dashboard mode ──
    function setDashboardMode(mode: 'cronolog' | 'wishlist') {
      dashboardMode.value = mode
    }

    function addWishlistItem(item: Item) {
      items.value = [...items.value, { ...item, year: 0, status: 'backlog', rating: 0, consumedDate: '' }]
    }

    function markAsConsumed(itemId: string, options?: { year?: number; rating?: number; consumedDate?: string }) {
      const year = options?.year ?? new Date().getFullYear()
      const rating = options?.rating ?? 0
      const consumedDate = options?.consumedDate ?? new Date().toISOString().split('T')[0]
      updateItem(itemId, { year, rating, consumedDate, status: 'completed' })
      // Ensure the target year exists
      if (!addedYears.value.includes(year)) {
        addedYears.value = [...addedYears.value, year]
      }
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
        libros: 'googlebooks',
        juegos: 'rawg',
        musica: 'musicbrainz',
        anime: 'jikan',
        manga: 'jikan',
        comics: 'comicvine',
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

      // Migrate Libros from openlibrary to googlebooks
      if (libros && libros.dataSource === ('openlibrary' as any)) {
        categories.value = categories.value.map((c) =>
          c.id === 'libros' ? { ...c, dataSource: 'googlebooks' as const } : c,
        )
      }

      // Add new default categories if missing (for existing users, skip deleted ones)
      // Also skip if a category with the same name already exists (user may have created one manually)
      // Normalize names by stripping diacritics so "Peliculas" matches "Películas"
      const normalizeName = (n: string) => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      const existingIds = new Set(categories.value.map((c) => c.id))
      const existingNames = new Set(categories.value.map((c) => normalizeName(c.name)))
      const deletedIds = new Set(deletedCategoryIds.value)
      const newDefaults = DEFAULT_CATEGORIES.filter((c) =>
        !existingIds.has(c.id) && !deletedIds.has(c.id) && !existingNames.has(normalizeName(c.name)),
      )
      if (newDefaults.length > 0) {
        const maxOrder = Math.max(...categories.value.map((c) => c.order), -1)
        const toAdd = newDefaults.map((c, i) => ({ ...c, order: maxOrder + 1 + i }))
        categories.value = [...categories.value, ...toAdd]
      }

      // Deduplicate categories by name (keep the one with items, or the first one)
      // Uses accent-normalized comparison so "Peliculas" and "Películas" are treated as duplicates
      const seenNames = new Map<string, number>()
      const dupeIds: string[] = []
      const dupeToKeeper = new Map<string, string>() // map removed cat id → keeper cat id
      for (let i = 0; i < categories.value.length; i++) {
        const key = normalizeName(categories.value[i].name)
        if (seenNames.has(key)) {
          const prevIdx = seenNames.get(key)!
          const prevCat = categories.value[prevIdx]
          const currCat = categories.value[i]
          const prevHasItems = items.value.some((it) => it.categoryId === prevCat.id)
          const currHasItems = items.value.some((it) => it.categoryId === currCat.id)
          // Keep the one with items; if both or neither have items, keep the first
          if (currHasItems && !prevHasItems) {
            dupeIds.push(prevCat.id)
            dupeToKeeper.set(prevCat.id, currCat.id)
            seenNames.set(key, i)
          } else {
            dupeIds.push(currCat.id)
            dupeToKeeper.set(currCat.id, prevCat.id)
          }
        } else {
          seenNames.set(key, i)
        }
      }
      if (dupeIds.length > 0) {
        categories.value = categories.value.filter((c) => !dupeIds.includes(c.id))
        // Migrate items from removed duplicates to the kept category
        items.value = items.value.map((it) => {
          const keeperId = dupeToKeeper.get(it.categoryId)
          return keeperId ? { ...it, categoryId: keeperId } : it
        })
      }

      // Migrate items: add new fields if missing
      let itemMigrated = false
      const migratedItems = items.value.map((item) => {
        const updates: Partial<typeof item> = {}
        if (item.status === undefined) { updates.status = 'completed'; itemMigrated = true }
        if (item.favorite === undefined) { updates.favorite = false; itemMigrated = true }
        if (item.notes === undefined) { updates.notes = ''; itemMigrated = true }
        if (item.tags === undefined) { updates.tags = []; itemMigrated = true }
        return Object.keys(updates).length > 0 ? { ...item, ...updates } : item
      })
      if (itemMigrated) {
        items.value = migratedItems
      }
    }

    return {
      categories,
      items,
      activeYear,
      addedYears,
      deletedCategoryIds,
      dashboardMode,
      hasYears,
      sortedCategories,
      itemsByYear,
      activeItems,
      availableYears,
      yearStats,
      totalActiveItems,
      isWishlistMode,
      wishlistItems,
      wishlistItemsForCategory,
      wishlistStats,
      totalWishlistItems,
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
      setDashboardMode,
      addWishlistItem,
      markAsConsumed,
      migrateData,
    }
  },
  {
    persist: true,
  },
)
