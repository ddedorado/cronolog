import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Hash-based routing (#/) breaks Supabase's automatic OAuth detection:
    //   - Implicit flow tokens end up as #/access_token=... (leading '/' corrupts parsing)
    //   - PKCE code ends up in ?code= query string (works, but we handle it manually too)
    // We disable auto-detection and handle both flows in useAuth → handleOAuthRedirect().
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
})
