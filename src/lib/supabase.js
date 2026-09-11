import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.APP_SUPABASE_URL
const supabaseAnonKey = import.meta.env.APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Don't crash the app in dev before env vars are set — just warn.
  console.warn(
    '[tappe] Missing APP_SUPABASE_URL / APP_SUPABASE_ANON_KEY environment variables. ' +
      'Create a .env.local file (see .env.example). Supabase calls will fail.',
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
)
