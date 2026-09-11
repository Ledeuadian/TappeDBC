import { useState } from 'react'
import { Link, Navigate, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { UserIcon, LockIcon, EyeIcon, EyeOffIcon, ArrowRightIcon } from 'lucide-react'

export default function LoginPage() {
  const { login, isAuthenticated, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Already signed in — skip straight to the dashboard (or redirect target).
  if (!authLoading && isAuthenticated) {
    const to =
      location.state?.from?.pathname ||
      searchParams.get('redirect') ||
      '/dashboard'
    return <Navigate to={to} replace />
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      const to =
        location.state?.from?.pathname ||
        searchParams.get('redirect') ||
        '/dashboard'
      navigate(to, { replace: true })
    } catch (err) {
      setError(err.message || 'Failed to log in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Status bar spacer (iOS-style) */}
      <div className="h-11" aria-hidden="true" />

      <div className="flex-1 px-6 pt-8 pb-6 flex flex-col max-w-md w-full mx-auto">
        <h1 className="text-3xl font-bold text-white">Welcome back</h1>
        <p className="mt-2 text-sm text-zinc-400">Sign in to continue</p>

        <form onSubmit={onSubmit} className="mt-10 space-y-4 flex-1">
          {/* Username or Email */}
          <div className="relative">
            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
            <input
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

          {/* Password */}
          <div className="relative">
            <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-dark pl-12 pr-12"
              placeholder="Password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute inset-y-0 right-0 px-4 text-zinc-500 hover:text-zinc-300"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>

          <div className="text-right">
            <Link to="/forgot-password" className="text-sm text-orange-500 hover:text-orange-400">
              Forgot password?
            </Link>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex items-center justify-between mt-8">
            <button
              type="submit"
              disabled={loading}
              className="text-white text-xl font-semibold hover:text-zinc-200 transition"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
            <button
              type="submit"
              disabled={loading}
              aria-label="Sign in"
              className="h-16 w-16 rounded-full bg-gradient-to-br from-red-500 to-orange-500 grid place-items-center shadow-[0_0_30px_rgba(239,68,68,0.6)] hover:shadow-[0_0_40px_rgba(239,68,68,0.8)] hover:scale-105 active:scale-95 transition"
            >
              <ArrowRightIcon className="h-7 w-7 text-white" />
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          No Tappe yet?{' '}
          <Link to="/signup" className="text-white font-semibold hover:text-zinc-300">
            Shop Now!
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
