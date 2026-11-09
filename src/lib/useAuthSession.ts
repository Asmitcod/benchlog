import { useEffect, useState } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected authentication error occurred.'
}

export function useAuthSession(client: SupabaseClient | null) {
  const [session, setSession] = useState<Session | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!client) return

    let active = true
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession)
    })

    void client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      if (sessionError) {
        console.error('Could not restore the BenchLog sign-in session.', sessionError)
        setError(sessionError.message)
        return
      }
      setSession(data.session)
    }).catch((sessionError: unknown) => {
      if (!active) return
      console.error('Could not restore the BenchLog sign-in session.', sessionError)
      setError(getErrorMessage(sessionError))
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [client])

  return { session, error }
}
