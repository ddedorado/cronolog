import { db } from '@/lib/firebase'
import type { Category, Item } from '@/schemas/cronolog'
import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
  type WriteBatch,
} from 'firebase/firestore'
import {
  FIRESTORE_BATCH_WRITE_LIMIT,
  FIRESTORE_MODEL_VERSION,
  META_DOC_ID,
  SETTINGS_DOC_ID,
  createCloudState,
  createCloudStateFromLegacy,
  createWritePlan,
  normalizeMeta,
  normalizeSettings,
  type CloudMeta,
  type CloudSettings,
  type CronologCloudState,
  type LegacyUserDocument,
} from '@/services/firestoreModel'

export type CloudLoadSource = 'empty' | 'legacy' | 'v2'

export interface CloudLoadResult {
  source: CloudLoadSource
  state: CronologCloudState | null
}

export interface CloudSaveResult {
  state: CronologCloudState
  wrote: boolean
  updatedAt: string | null
}

function userDocument(uid: string) {
  return doc(db, 'users', uid)
}

function categoriesCollection(uid: string) {
  return collection(db, 'users', uid, 'categories')
}

function itemsCollection(uid: string) {
  return collection(db, 'users', uid, 'items')
}

function yearsCollection(uid: string) {
  return collection(db, 'users', uid, 'years')
}

function settingsDocument(uid: string) {
  return doc(db, 'users', uid, 'settings', SETTINGS_DOC_ID)
}

function metaDocument(uid: string) {
  return doc(db, 'users', uid, 'meta', META_DOC_ID)
}

function categoryDocument(uid: string, categoryId: string) {
  return doc(db, 'users', uid, 'categories', categoryId)
}

function itemDocument(uid: string, itemId: string) {
  return doc(db, 'users', uid, 'items', itemId)
}

function yearDocument(uid: string, yearId: string) {
  return doc(db, 'users', uid, 'years', yearId)
}

function hasLegacyPayload(data: DocumentData | undefined): data is LegacyUserDocument {
  return !!data && (
    Array.isArray(data.categories)
    || Array.isArray(data.items)
    || Array.isArray(data.addedYears)
    || typeof data.settings === 'object'
  )
}

function categoryFromDocument(snapshot: QueryDocumentSnapshot<DocumentData>): Category {
  return { ...snapshot.data(), id: snapshot.id } as Category
}

function itemFromDocument(snapshot: QueryDocumentSnapshot<DocumentData>): Item {
  return { ...snapshot.data(), id: snapshot.id } as Item
}

function yearFromDocument(snapshot: QueryDocumentSnapshot<DocumentData>): number | null {
  const data = snapshot.data()
  if (Number.isInteger(data.year)) return data.year
  const year = Number(snapshot.id)
  return Number.isInteger(year) ? year : null
}

function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => {
    const order = (a.order ?? 0) - (b.order ?? 0)
    return order !== 0 ? order : a.id.localeCompare(b.id)
  })
}

function sortItems(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    const category = a.categoryId.localeCompare(b.categoryId)
    if (category !== 0) return category
    const order = (a.order ?? 0) - (b.order ?? 0)
    if (order !== 0) return order
    const createdAt = a.createdAt.localeCompare(b.createdAt)
    return createdAt !== 0 ? createdAt : a.id.localeCompare(b.id)
  })
}

async function commitInChunks(operations: Array<(batch: WriteBatch) => void>) {
  for (let i = 0; i < operations.length; i += FIRESTORE_BATCH_WRITE_LIMIT) {
    const batch = writeBatch(db)
    for (const operation of operations.slice(i, i + FIRESTORE_BATCH_WRITE_LIMIT)) {
      operation(batch)
    }
    await batch.commit()
  }
}

export async function loadCronologCloudState(uid: string): Promise<CloudLoadResult> {
  const [
    userSnapshot,
    categoriesSnapshot,
    itemsSnapshot,
    yearsSnapshot,
    settingsSnapshot,
    metaSnapshot,
  ] = await Promise.all([
    getDoc(userDocument(uid)),
    getDocs(categoriesCollection(uid)),
    getDocs(itemsCollection(uid)),
    getDocs(yearsCollection(uid)),
    getDoc(settingsDocument(uid)),
    getDoc(metaDocument(uid)),
  ])

  const userData = userSnapshot.exists() ? userSnapshot.data() : undefined
  const categories = categoriesSnapshot.docs.map(categoryFromDocument)
  const items = itemsSnapshot.docs.map(itemFromDocument)
  const years = yearsSnapshot.docs
    .map(yearFromDocument)
    .filter((year): year is number => year !== null)

  const hasV2Data = userData?.schemaVersion === FIRESTORE_MODEL_VERSION
    || categories.length > 0
    || items.length > 0
    || years.length > 0
    || settingsSnapshot.exists()
    || metaSnapshot.exists()

  if (hasV2Data) {
    const settingsData = settingsSnapshot.exists()
      ? settingsSnapshot.data() as Partial<CloudSettings>
      : userData?.settings as Partial<CloudSettings> | undefined
    const metaData = metaSnapshot.exists()
      ? metaSnapshot.data() as Partial<CloudMeta>
      : undefined

    return {
      source: 'v2',
      state: createCloudState({
        categories: sortCategories(categories),
        items: sortItems(items),
        addedYears: years,
        settings: normalizeSettings(settingsData),
        ...normalizeMeta(metaData),
        updatedAt: typeof userData?.updatedAt === 'string' ? userData.updatedAt : null,
      }),
    }
  }

  if (hasLegacyPayload(userData)) {
    return {
      source: 'legacy',
      state: createCloudStateFromLegacy(userData),
    }
  }

  return { source: 'empty', state: null }
}

export async function saveCronologCloudState(
  uid: string,
  nextState: CronologCloudState,
  previousState: CronologCloudState | null,
): Promise<CloudSaveResult> {
  const updatedAt = new Date().toISOString()
  const state = createCloudState({ ...nextState, updatedAt })
  const plan = createWritePlan(previousState, state)

  if (!plan.hasChanges && previousState) {
    return { state: previousState, wrote: false, updatedAt: previousState.updatedAt }
  }

  const operations: Array<(batch: WriteBatch) => void> = []

  if (plan.settings) {
    operations.push((batch) => batch.set(settingsDocument(uid), { ...plan.settings, updatedAt }))
  }

  if (plan.meta) {
    operations.push((batch) => batch.set(metaDocument(uid), { ...plan.meta, updatedAt }))
  }

  for (const category of plan.categories.upserts) {
    operations.push((batch) => batch.set(categoryDocument(uid, category.id), category))
  }

  for (const item of plan.items.upserts) {
    operations.push((batch) => batch.set(itemDocument(uid, item.id), item))
  }

  for (const year of plan.years.upserts) {
    operations.push((batch) => batch.set(yearDocument(uid, year.id), { year: year.year, updatedAt }))
  }

  for (const categoryId of plan.categories.deletes) {
    operations.push((batch) => batch.delete(categoryDocument(uid, categoryId)))
  }

  for (const itemId of plan.items.deletes) {
    operations.push((batch) => batch.delete(itemDocument(uid, itemId)))
  }

  for (const yearId of plan.years.deletes) {
    operations.push((batch) => batch.delete(yearDocument(uid, yearId)))
  }

  await commitInChunks(operations)

  const metadataBatch = writeBatch(db)
  metadataBatch.set(userDocument(uid), {
    schemaVersion: FIRESTORE_MODEL_VERSION,
    updatedAt,
    categories: deleteField(),
    items: deleteField(),
    addedYears: deleteField(),
    settings: deleteField(),
  }, { merge: true })
  await metadataBatch.commit()

  return { state, wrote: true, updatedAt }
}