import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Disable automatic detection: it fails with hash-based routing because
    // the OAuth params end up inside the hash fragment (e.g. #/access_token=...)
    // and supabase-js can't parse them with the route prefix. We handle it
    // manually in useAuth.ts → handleOAuthRedirectInHash().
    detectSessionInUrl: false,
  },
})
