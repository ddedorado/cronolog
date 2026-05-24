/**
 * Migration script: Supabase → Firebase
 *
 * Migrates:
 *   1. Auth users (preserving UIDs)
 *   2. cronolog_data → Firestore users/{uid}
 *
 * Usage:
 *   1. Set environment variables (see below)
 *   2. Run: node --env-file=.env.migration scripts/migrate-to-firebase.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

// ─── Config ──────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  console.error('❌ Missing Firebase service account credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)')
  process.exit(1)
}

// ─── Initialize clients ──────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const firebaseApp = initializeApp({
  credential: cert({
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey: FIREBASE_PRIVATE_KEY,
  }),
})

const firebaseAuth = getAuth(firebaseApp)
const firestore = getFirestore(firebaseApp)

// ─── Step 1: Get users from Supabase Auth ────────────────────────────
async function getSupabaseUsers() {
  console.log('\n📋 Fetching users from Supabase Auth...')
  const { data, error } = await supabase.auth.admin.listUsers()
  if (error) {
    console.error('❌ Error fetching users:', error.message)
    process.exit(1)
  }
  console.log(`   Found ${data.users.length} user(s)`)
  return data.users
}

// ─── Step 2: Get data from cronolog_data ─────────────────────────────
async function getCronologData() {
  console.log('\n📋 Fetching cronolog_data from Supabase...')
  const { data, error } = await supabase
    .from('cronolog_data')
    .select('*')
  if (error) {
    console.error('❌ Error fetching data:', error.message)
    process.exit(1)
  }
  console.log(`   Found ${data.length} row(s)`)
  return data
}

// ─── Step 3: Import users to Firebase Auth ───────────────────────────
async function importUsersToFirebase(supabaseUsers) {
  console.log('\n🔐 Importing users to Firebase Auth...')

  for (const user of supabaseUsers) {
    const displayName = user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? ''

    try {
      // Check if user already exists in Firebase
      try {
        await firebaseAuth.getUser(user.id)
        console.log(`   ⏭️  User ${user.email} already exists in Firebase (uid: ${user.id})`)
        continue
      } catch (e) {
        // User doesn't exist, import them
      }

      await firebaseAuth.createUser({
        uid: user.id,
        email: user.email,
        displayName,
        emailVerified: !!user.email_confirmed_at,
        disabled: false,
      })
      console.log(`   ✅ Imported: ${user.email} (uid: ${user.id})`)
    } catch (err) {
      console.error(`   ❌ Failed to import ${user.email}: ${err.message}`)
    }
  }
}

// ─── Step 4: Write data to Firestore ─────────────────────────────────
async function writeDataToFirestore(cronologRows) {
  console.log('\n💾 Writing data to Firestore...')

  for (const row of cronologRows) {
    const uid = row.user_id
    const docRef = firestore.collection('users').doc(uid)

    // Check if already migrated
    const existing = await docRef.get()
    if (existing.exists) {
      console.log(`   ⏭️  User ${uid} already has data in Firestore, skipping`)
      continue
    }

    const firestoreData = {
      categories: row.categories ?? [],
      items: row.items ?? [],
      addedYears: row.added_years ?? [],
      settings: row.settings ?? {},
      updatedAt: row.updated_at ?? new Date().toISOString(),
    }

    await docRef.set(firestoreData)
    const itemCount = firestoreData.items.length
    console.log(`   ✅ Migrated uid ${uid}: ${itemCount} items, ${firestoreData.categories.length} categories`)
  }
}

// ─── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Starting Supabase → Firebase migration...')
  console.log(`   Supabase: ${SUPABASE_URL}`)
  console.log(`   Firebase: ${FIREBASE_PROJECT_ID}`)

  const users = await getSupabaseUsers()
  const data = await getCronologData()

  await importUsersToFirebase(users)
  await writeDataToFirestore(data)

  console.log('\n✨ Migration complete!')
  console.log('\n⚠️  IMPORTANT: Users will need to reset their passwords on first Firebase login')
  console.log('   (Supabase password hashes cannot be transferred to Firebase)')
  process.exit(0)
}

main().catch((err) => {
  console.error('\n💥 Migration failed:', err)
  process.exit(1)
})
