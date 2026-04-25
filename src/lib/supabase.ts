import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Force PKCE flow: the auth code lands in the query string (?code=xxx)
    // which is NOT affected by hash-based routing. With detectSessionInUrl
    // enabled (default), Supabase auto-detects and exchanges the code.
    flowType: 'pkce',
  },
})
