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

  /**
   * Hash-based routing (/#/) breaks Supabase's automatic OAuth detection.
   *
   * PKCE flow (default in Supabase v2):
   *   GoTrue appends ?code=xxx to the redirectTo URL. With hash-routing the
   *   code lands in window.location.search, NOT inside the hash fragment.
   *   Example: https://app.com/?code=xxx#/
   *
   * Implicit flow (legacy):
   *   Tokens are placed in the hash: #access_token=xxx&refresh_token=yyy
   *   With hash-routing this becomes #/access_token=xxx&... or #/#access_token=...
   *
   * We handle all cases manually because detectSessionInUrl is disabled
   * (it doesn't work with hash-based routing).
   */
  async function handleOAuthRedirect(): Promise<boolean> {
    // --- 1. PKCE flow: code in query string (most common with Supabase v2) ---
    const searchParams = new URLSearchParams(window.location.search)
    const codeInQuery = searchParams.get('code')
    if (codeInQuery) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(codeInQuery)
      if (error) {
        console.warn('OAuth PKCE exchange failed:', error.message)
        return false
      }
      session.value = data.session
      user.value = data.session?.user ?? null
      // Clean URL: remove query string, keep hash router base
      window.history.replaceState(null, '', window.location.pathname + '#/')
      return true
    }

    // --- 2. Check hash fragment for tokens or code (fallback / implicit flow) ---
    const hash = window.location.hash
    if (!hash) return false

    // Strip '#' and any leading route chars ('/', '/?') to get raw params
    const raw = hash.replace(/^#\/?(\?)?/, '')
    if (!raw || !raw.includes('=')) return false

    const params = new URLSearchParams(raw)

    // Implicit flow: access_token + refresh_token in hash
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    if (accessToken && refreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      if (error) {
        console.warn('OAuth implicit session failed:', error.message)
        return false
      }
      session.value = data.session
      user.value = data.session?.user ?? null
      window.history.replaceState(null, '', window.location.pathname + '#/')
      return true
    }

    // PKCE flow: code in hash (edge case)
    const code = params.get('code')
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        console.warn('OAuth PKCE exchange failed:', error.message)
        return false
      }
      session.value = data.session
      user.value = data.session?.user ?? null
      window.history.replaceState(null, '', window.location.pathname + '#/')
      return true
    }

    return false
  }

  async function init() {
    if (initialized.value) return
    initialized.value = true
    loading.value = true

    try {
      // First, try to handle OAuth tokens/code from the redirect (hash routing quirk)
      const handled = await handleOAuthRedirect()
      if (!handled) {
        const { data } = await supabase.auth.getSession()
        session.value = data.session
        user.value = data.session?.user ?? null
      }
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
        // Don't include /#/ — the hash fragment causes the PKCE code to be
        // misplaced. We redirect to the origin and handleOAuthRedirect()
        // picks up the ?code= from the query string.
        redirectTo: window.location.origin + window.location.pathname,
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
