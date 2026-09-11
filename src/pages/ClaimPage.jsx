import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { redeemClaim } from '../lib/claims.js'
import { useAuth } from '../context/AuthContext.jsx'

/**
 * Claim page — /claim/:code
 * Reached by scanning the QR on a physical Tappe card.
 * If signed out, prompts login/signup first (code is kept in the URL),
 * then redeems the code and marks the account verified.
 */
export default function ClaimPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, loading } = useAuth()
  const [status, setStatus] = useState('idle') // idle | working | success | error
  const [message, setMessage] = useState('')

  const handleClaim = async () => {
    setStatus('working')
    setMessage('')
    try {
      await redeemClaim(code)
      setStatus('success')
      setMessage('Your card has been claimed and your account is now verified!')
    } catch (err) {
      setStatus('error')
      setMessage(err.message || 'Something went wrong.')
    }
  }

  // Auth is still loading
  if (loading) {
    return (
      <div className="min-h-screen bg-black grid place-items-center">
        <p className="text-zinc-500 text-sm">Loading…</p>
      </div>
    )
  }

  // Signed out — send to login, remember where to come back to
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 max-w-md mx-auto text-center">
        <h1 className="text-2xl font-bold text-white">Claim your Tappe card</h1>
        <p className="mt-3 text-sm text-zinc-400">
          Sign in or create an account to claim code
          <span className="block mt-1 font-mono text-zinc-200">{code}</span>
        </p>
        <div className="mt-8 w-full space-y-3">
          <Link
            to={`/login?redirect=/claim/${code}`}
            className="block w-full text-center rounded-full py-3.5 text-white font-bold bg-gradient-to-r from-red-500 to-orange-500"
          >
            Sign in
          </Link>
          <Link
            to={`/signup?redirect=/claim/${code}&code=${encodeURIComponent(code)}`}
            className="block w-full text-center rounded-full py-3.5 text-zinc-300 font-semibold border border-zinc-700"
          >
            Create account
          </Link>
          <p className="pt-2 text-[11px] text-zinc-500">
            Already have the activation code in this URL? Sign up — it will be applied automatically.
          </p>
        </div>
      </div>
    )
  }

  // Signed in — show the claim action / result
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 max-w-md mx-auto text-center">
      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-red-500 to-orange-500 grid place-items-center text-2xl">
        🎉
      </div>
      <h1 className="mt-6 text-2xl font-bold text-white">Claim your card</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Code <span className="font-mono text-zinc-200">{code}</span>
      </p>

      {status === 'success' ? (
        <>
          <p className="mt-6 text-sm text-green-400">{message}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-8 w-full rounded-full py-3.5 text-white font-bold bg-gradient-to-r from-red-500 to-orange-500"
          >
            Go to dashboard
          </button>
        </>
      ) : (
        <>
          {message && <p className="mt-6 text-sm text-red-400">{message}</p>}
          <button
            onClick={handleClaim}
            disabled={status === 'working'}
            className="mt-8 w-full rounded-full py-3.5 text-white font-bold bg-gradient-to-r from-red-500 to-orange-500 disabled:opacity-50"
          >
            {status === 'working' ? 'Claiming…' : 'Claim this card'}
          </button>
        </>
      )}
    </div>
  )
}
