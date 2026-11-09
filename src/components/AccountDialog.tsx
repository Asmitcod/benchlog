import { useState } from 'react'
import type { FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, LogOut, Mail, X } from 'lucide-react'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { supabaseConfigurationError } from '../lib/supabase'

type AccountDialogProps = {
  client: SupabaseClient | null
  hasLocalBackup: boolean
  onDownloadBackup: () => void
  user: User | null
  sessionError: string
  syncError: string
  syncStatus: 'local' | 'loading' | 'synced' | 'error'
  onClose: () => void
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected authentication error occurred.'
}

export default function AccountDialog({
  client,
  hasLocalBackup,
  onDownloadBackup,
  user,
  sessionError,
  syncError,
  syncStatus,
  onClose,
}: AccountDialogProps) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(sessionError)
  const [message, setMessage] = useState('')

  async function sendSignInLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!client) return

    setBusy(true)
    setError('')
    setMessage('')

    try {
      const { error: signInError } = await client.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: new URL(import.meta.env.BASE_URL, window.location.origin).toString(),
        },
      })
      if (signInError) {
        console.error('BenchLog could not send the sign-in link.', signInError)
        setError(signInError.message)
        return
      }
      setMessage(`A secure sign-in link was sent to ${email.trim()}.`)
    } catch (signInError: unknown) {
      console.error('BenchLog could not send the sign-in link.', signInError)
      setError(getErrorMessage(signInError))
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    if (!client) return

    setBusy(true)
    setError('')
    try {
      const { error: signOutError } = await client.auth.signOut()
      if (signOutError) {
        console.error('BenchLog could not sign out.', signOutError)
        setError(signOutError.message)
      } else {
        onClose()
      }
    } catch (signOutError: unknown) {
      console.error('BenchLog could not sign out.', signOutError)
      setError(getErrorMessage(signOutError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose()
        }}
      >
        <motion.section
          aria-labelledby="account-dialog-title"
          aria-modal="true"
          className="modal-card account-dialog"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          role="dialog"
        >
          <div className="modal-heading">
            <div>
              <span className="section-eyebrow">YOUR WORKSHOP ACCOUNT</span>
              <h2 id="account-dialog-title">{user ? 'Account connected' : 'Sign in to BenchLog'}</h2>
            </div>
            <button aria-label="Close account dialog" className="icon-button" onClick={onClose} type="button">
              <X size={18} />
            </button>
          </div>

          {user ? (
            <div className="account-content">
              <p className="account-identity"><Mail size={15} />{user.email ?? 'Signed-in account'}</p>
              <p className="account-note">
                {syncStatus === 'loading'
                  ? 'Saving or loading your workshop data…'
                  : syncStatus === 'error'
                    ? 'Your latest workshop changes may not be available on other devices yet.'
                    : 'Workshop changes sync automatically across your signed-in devices.'}
              </p>
              {syncError && <p className="account-feedback account-error" role="alert">{syncError}</p>}
              {error && <p className="account-feedback account-error" role="alert">{error}</p>}
              <div className="modal-actions">
                {hasLocalBackup && (
                  <button className="cancel-button" onClick={onDownloadBackup} type="button">Download local backup</button>
                )}
                <button className="cancel-button" onClick={onClose} type="button">Close</button>
                <button className="add-button" disabled={busy} onClick={() => void signOut()} type="button">
                  <LogOut size={14} /> {busy ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            </div>
          ) : (
            <form className="modal-form account-form" onSubmit={(event) => void sendSignInLink(event)}>
              <p className="account-note">We’ll email you a one-time sign-in link. No password to remember.</p>
              {!client && <p className="account-feedback account-error" role="alert">{supabaseConfigurationError} Add your project values to `.env.local` and restart the app.</p>}
              {error && <p className="account-feedback account-error" role="alert">{error}</p>}
              {message && <p className="account-feedback account-success" role="status"><Check size={14} />{message}</p>}
              <label>
                Email address
                <input
                  autoComplete="email"
                  autoFocus
                  disabled={!client || busy}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  type="email"
                  value={email}
                />
              </label>
              <div className="modal-actions">
                <button className="cancel-button" onClick={onClose} type="button">Not now</button>
                <button className="add-button" disabled={!client || busy} type="submit">
                  <Mail size={14} /> {busy ? 'Sending…' : 'Email sign-in link'}
                </button>
              </div>
            </form>
          )}
        </motion.section>
      </motion.div>
    </AnimatePresence>
  )
}
