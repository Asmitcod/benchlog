import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

function isValidSupabaseUrl(value: string | undefined): value is string {
  if (!value) return false

  try {
    const url = new URL(value)
    return url.protocol === 'https:' || (url.protocol === 'http:' && url.hostname === 'localhost')
  } catch {
    return false
  }
}

export const supabaseConfigurationError = !supabaseUrl
  ? 'Set VITE_SUPABASE_URL in your local environment.'
  : !isValidSupabaseUrl(supabaseUrl)
    ? 'VITE_SUPABASE_URL must be a valid HTTPS URL (or localhost over HTTP).'
    : !supabasePublishableKey
      ? 'Set VITE_SUPABASE_PUBLISHABLE_KEY in your local environment.'
      : null

export const supabaseClient =
  supabaseConfigurationError === null
    ? createClient(supabaseUrl, supabasePublishableKey)
    : null
