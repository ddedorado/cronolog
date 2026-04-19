import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

const user = ref<User | null>(null)
const session = ref<Session | null>(null)
const loading = ref(true)
const initialized = ref(false)
const sessionExpired = ref(false)

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value)
  const displayName = computed(() => {
    if (!user.value) return ''
    return (
      user.value.user_metadata?.display_name ??
      user.value.email?.split('@')[0] ??
      ''
    )
  })

  async function init() {
    if (initialized.value) return
    initialized.value = true
    loading.value = true

    try {
      const { data } = await supabase.auth.getSession()
      session.value = data.session
      user.value = data.session?.user ?? null
    } finally {
      loading.value = false
    }

    supabase.auth.onAuthStateChange((event, newSession) => {
      const wasAuthenticated = !!user.value
      session.value = newSession
      user.value = newSession?.user ?? null

      // Detect session expiry while app is open
      if (wasAuthenticated && !newSession && event === 'SIGNED_OUT') {
        sessionExpired.value = true
      }
    })
  }

  async function signUp(email: string, password: string, displayName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    })
    if (error) throw error
    return data
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) throw error
    return data
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    user.value = null
    session.value = null
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#/reset-password`,
    })
    if (error) throw error
  }

  return {
    user,
    session,
    loading,
    isAuthenticated,
    displayName,
    sessionExpired,
    init,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
  }
}
