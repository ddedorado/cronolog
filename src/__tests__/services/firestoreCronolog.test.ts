import { describe, expect, it, beforeEach, vi } from 'vitest'
import type { Category, Item } from '@/schemas/cronolog'
import { createCloudState } from '@/services/firestoreModel'

const firestoreMock = vi.hoisted(() => ({
  batches: [] as Array<{
    operations: Array<{
      type: 'set' | 'delete'
      path: string
      data?: unknown
      options?: unknown
    }>
    commit: ReturnType<typeof vi.fn>
  }>,
}))

vi.mock('@/lib/firebase', () => ({
  db: {},
}))

vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }),
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }),
  deleteField: () => ({ __deleteField: true }),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  writeBatch: vi.fn(() => {
    const batch = {
      operations: [] as Array<{
        type: 'set' | 'delete'
        path: string
        data?: unknown
        options?: unknown
      }>,
      set: vi.fn((ref: { path: string }, data: unknown, options?: unknown) => {
        batch.operations.push({ type: 'set', path: ref.path, data, options })
        return batch
      }),
      delete: vi.fn((ref: { path: string }) => {
        batch.operations.push({ type: 'delete', path: ref.path })
        return batch
      }),
      commit: vi.fn(async () => undefined),
    }
    firestoreMock.batches.push(batch)
    return batch
  }),
}))

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

describe('Firestore cronolog repository', () => {
  beforeEach(() => {
    firestoreMock.batches.length = 0
  })

  it('writes v2 documents before cleaning legacy fields from the user document', async () => {
    const { saveCronologCloudState } = await import('@/services/firestoreCronolog')
    const state = createCloudState({
      categories: [makeCategory()],
      items: [makeItem()],
      addedYears: [2026],
    })

    await saveCronologCloudState('user-1', state, null)

    expect(firestoreMock.batches).toHaveLength(2)

    const v2WritePaths = firestoreMock.batches[0].operations.map((operation) => operation.path)
    expect(v2WritePaths).toEqual(expect.arrayContaining([
      'users/user-1/settings/app',
      'users/user-1/meta/app',
      'users/user-1/categories/peliculas',
      'users/user-1/items/item-1',
      'users/user-1/years/2026',
    ]))
    expect(v2WritePaths).not.toContain('users/user-1')

    const cleanupOperation = firestoreMock.batches[1].operations[0]
    expect(cleanupOperation.path).toBe('users/user-1')
    expect(cleanupOperation.data).toMatchObject({
      schemaVersion: 2,
      categories: { __deleteField: true },
      items: { __deleteField: true },
      addedYears: { __deleteField: true },
      settings: { __deleteField: true },
    })
  })
})