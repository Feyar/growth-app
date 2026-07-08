import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseEnabled = !!(supabaseUrl && supabaseAnonKey)

let supabase: ReturnType<typeof createClient> | null = null

if (supabaseEnabled) {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
}

export { supabase }
