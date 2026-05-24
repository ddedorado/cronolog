import { ref, computed } from 'vue'
import { auth } from '@/lib/firebase'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  getAdditionalUserInfo,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword as firebaseUpdatePassword,
  deleteUser as firebaseDeleteUser,
  type User,
} from 'firebase/auth'
import { useCronologStore } from '@/stores/cronolog'
import { useSettingsStore } from '@/stores/settings'
import { stopSyncWatchers } from '@/composables/syncLifecycle'

const user = ref<User | null>(null)
const loading = ref(true)
const initialized = ref(false)
const sessionExpired = ref(false)
let intentionalSignOut = false

function clearPersistedUserState() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem('cronolog')
    localStorage.removeItem('settings')
  } catch {
    // Ignore unavailable storage.
  }
}

async function clearLocalUserState() {
  stopSyncWatchers()
  useCronologStore().resetState()
  useSettingsStore().resetState()
  clearPersistedUserState()
}

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value)
  const displayName = computed(() => {
    if (!user.value) return ''
    return (
      user.value.displayName ??
      user.value.email?.split('@')[0] ??
      ''
    )
  })

  async function init() {
    if (initialized.value) return
    initialized.value = true
    loading.value = true

    return new Promise<void>((resolve) => {
      onAuthStateChanged(auth, (firebaseUser) => {
        const wasAuthenticated = !!user.value
        user.value = firebaseUser

        // Detect session expiry while app is open
        if (wasAuthenticated && !firebaseUser && !intentionalSignOut) {
          sessionExpired.value = true
        }

        if (!firebaseUser) {
          intentionalSignOut = false
        }

        if (loading.value) {
          loading.value = false
          resolve()
        }
      })
    })
  }

  async function signUp(email: string, password: string, name: string) {
    const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(newUser, { displayName: name })
    user.value = auth.currentUser
    return newUser
  }

  async function signIn(email: string, password: string) {
    const { user: loggedUser } = await signInWithEmailAndPassword(auth, email, password)
    return loggedUser
  }

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
    return {
      user: result.user,
      isNewUser: getAdditionalUserInfo(result)?.isNewUser ?? false,
    }
  }

  async function signOut() {
    intentionalSignOut = true
    await firebaseSignOut(auth)
    user.value = null
    await clearLocalUserState()
  }

  async function deleteCurrentUser() {
    if (!auth.currentUser) throw new Error('No authenticated user')
    intentionalSignOut = true
    await firebaseDeleteUser(auth.currentUser)
    user.value = null
    await clearLocalUserState()
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email)
  }

  async function updateUserProfile(data: { displayName?: string }) {
    if (!auth.currentUser) throw new Error('No authenticated user')
    await updateProfile(auth.currentUser, data)
    user.value = auth.currentUser
  }

  async function updateUserPassword(newPassword: string) {
    if (!auth.currentUser) throw new Error('No authenticated user')
    await firebaseUpdatePassword(auth.currentUser, newPassword)
  }

  return {
    user,
    loading,
    isAuthenticated,
    displayName,
    sessionExpired,
    init,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    deleteCurrentUser,
    resetPassword,
    updateUserProfile,
    updateUserPassword,
  }
}
