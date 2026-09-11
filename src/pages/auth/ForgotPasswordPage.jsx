import { useState } from 'react'
import { Link } from 'react-router-dom'
import { UserIcon, ArrowRightIcon } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // TODO: replace with real API call to send reset email
      await new Promise((r) => setTimeout(r, 800))
      setSent(true)
    } catch (err) {
      setError(err.message || 'Failed to send reset link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Status bar spacer (iOS-style) */}
      <div className="h-11" aria-hidden="true" />

      <div className="flex-1 px-6 pt-8 pb-6 flex flex-col max-w-md w-full mx-auto">
        <h1 className="text-3xl font-bold text-white">Forgot password?</h1>

        {sent ? (
          <div className="mt-10 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-red-500/10 grid place-items-center">
              <ArrowRightIcon className="h-7 w-7 text-red-500 rotate-90" />
            </div>
            <h2 className="mt-6 text-xl font-semibold text-white">Check your inbox</h2>
            <p className="mt-2 text-sm text-zinc-400">
              If an account exists for <span className="text-white font-medium">{email}</span>,
              a reset link is on its way.
            </p>
            <Link to="/login" className="mt-8 inline-flex text-white text-lg font-semibold hover:text-zinc-300">
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-10 space-y-4 flex-1">
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-dark pl-12"
                placeholder="Username or Email"
              />
            </div>
            <p className="flex items-start gap-2 text-sm text-zinc-400 pt-1">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-orange-500" />
              <span>We will send you an email to set or reset your new password.</span>
            </p>
            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex items-center justify-between mt-8">
              <button
                type="submit"
                disabled={loading}
                className="text-white text-xl font-semibold hover:text-zinc-200 transition"
              >
                {loading ? 'Sending…' : 'Send link'}
              </button>
              <button
                type="submit"
                disabled={loading}
                aria-label="Send reset link"
                className="h-16 w-16 rounded-full bg-gradient-to-br from-red-500 to-orange-500 grid place-items-center shadow-[0_0_30px_rgba(239,68,68,0.6)] hover:shadow-[0_0_40px_rgba(239,68,68,0.8)] hover:scale-105 active:scale-95 transition"
              >
                <ArrowRightIcon className="h-7 w-7 text-white" />
              </button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-zinc-500">
          Remembered it?{' '}
          <Link to="/login" className="text-white font-semibold hover:text-zinc-300">
            Back to login
          </Link>
        </p>
      </div>

      {/* Footer */}
      <div className="pb-8 pt-2 text-center">
        <p className="text-white font-bold text-lg tracking-wide">Tappe</p>
        <p className="text-zinc-500 text-xs mt-1">Into Everything.</p>
      </div>
    </div>
  )
}
