import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { lookupClaim, redeemClaim } from '../../lib/claims.js'
import { UserIcon, LockIcon, EyeIcon, EyeOffIcon, ArrowRightIcon, KeyIcon } from 'lucide-react'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validatePassword(pw) {
  if (pw.length < 8) return 'Password must be at least 8 characters long.'
  if (!/[A-Z]/.test(pw)) return 'Password must contain at least 1 uppercase letter.'
  if (!/[0-9]/.test(pw)) return 'Password must contain at least 1 number.'
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Password must contain at least 1 special character.'
  return ''
}

export default function SignupPage() {
  const { signup, isAuthenticated, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  // QR / NFC landing — ?code=XXXX pre-fills the Activation Code field.
  const codeFromUrl = (searchParams.get('code') || '').trim()

  // Already signed in — skip the form
  if (!authLoading && isAuthenticated) {
    return <Navigate to={redirect} replace />
  }

  const [activationCode, setActivationCode] = useState(codeFromUrl)
  // True when the activation code was injected from the URL (QR/NFC scan).
  // Used to show a confirmation banner; the user can still edit the field.
  const [codeFromScan, setCodeFromScan] = useState(!!codeFromUrl)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [activationError, setActivationError] = useState('')
  const [generalError, setGeneralError] = useState('')
  const [loading, setLoading] = useState(false)

  const clearFieldErrors = () => {
    setEmailError('')
    setPasswordError('')
    setConfirmError('')
    setActivationError('')
    setGeneralError('')
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    clearFieldErrors()
    let hasError = false

    if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError('Please enter a valid email address.')
      hasError = true
    }
    const pwError = validatePassword(password)
    if (pwError) {
      setPasswordError(pwError)
      hasError = true
    }
    if (password !== confirmPassword) {
      setConfirmError('Passwords do not match.')
      hasError = true
    }
    const code = activationCode.trim()
    if (!code) {
      setActivationError('Activation code is required.')
      hasError = true
    }
    if (hasError) return
    setLoading(true)
    try {
      // 1) Validate the code BEFORE creating any account.
      //    Must exist in card_claims, be unclaimed, and unexpired.
      const claim = await lookupClaim(code)
      if (!claim) {
        setActivationError('Invalid activation code.')
        setLoading(false)
        return
      }
      if (claim.claimed_by) {
        setActivationError('This activation code has already been used.')
        setLoading(false)
        return
      }
      if (new Date(claim.expires_at) <= new Date()) {
        setActivationError('This activation code has expired.')
        setLoading(false)
        return
      }

      // 2) Create the auth account.
      await signup(email.split('@')[0], email, password)

      // 3) Consume the code. The DB trigger flips profiles.is_verified → true.
      await redeemClaim(code)

      navigate(redirect, { replace: true })
    } catch (err) {
      setGeneralError(err.message || 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Status bar spacer (iOS-style) */}
      <div className="h-11" aria-hidden="true" />

      <div className="flex-1 px-6 pt-8 pb-6 flex flex-col max-w-md w-full mx-auto">
        <h1 className="text-3xl font-bold text-white">Create an account</h1>

        <form onSubmit={onSubmit} className="mt-10 space-y-4 flex-1" noValidate>
          {/* Activation code */}
          <div>
            <div className="relative">
              <KeyIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
              <input
                type="text"
                value={activationCode}
                onChange={(e) => {
                  setActivationCode(e.target.value)
                  // If the user edits the prefilled code, treat it as no longer "from scan".
                  if (codeFromScan && e.target.value !== codeFromUrl) setCodeFromScan(false)
                  if (activationError) setActivationError('')
                }}
                className={`input-dark pl-12 ${activationError ? 'ring-2 ring-red-500/60' : ''}`}
                placeholder="Activation Code"
                aria-invalid={!!activationError}
                aria-describedby={activationError ? 'activation-error' : undefined}
              />
            </div>
            {codeFromScan && (
              <p className="mt-1.5 ml-1 flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle2Icon className="h-3.5 w-3.5" />
                Code applied from your card — finish creating your account to claim it.
              </p>
            )}
            {activationError && (
              <p id="activation-error" className="mt-1.5 ml-1 text-sm text-red-500">
                {activationError}
              </p>
            )}
          </div>

          {/* Username or Email */}
          <div>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
              <input
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (emailError) setEmailError('')
                }}
                className={`input-dark pl-12 ${emailError ? 'ring-2 ring-red-500/60' : ''}`}
                placeholder="Username or Email"
                aria-invalid={!!emailError}
                aria-describedby={emailError ? 'email-error' : undefined}
              />
            </div>
            {emailError && (
              <p id="email-error" className="mt-1.5 ml-1 text-sm text-red-500">
                {emailError}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="relative">
              <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (passwordError) setPasswordError('')
                }}
                className={`input-dark pl-12 pr-12 ${passwordError ? 'ring-2 ring-red-500/60' : ''}`}
                placeholder="Password"
                aria-invalid={!!passwordError}
                aria-describedby={passwordError ? 'password-error' : undefined}
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
            {passwordError && (
              <p id="password-error" className="mt-1.5 ml-1 text-sm text-red-500">
                {passwordError}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <div className="relative">
              <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
              <input
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  if (confirmError) setConfirmError('')
                }}
                className={`input-dark pl-12 pr-12 ${confirmError ? 'ring-2 ring-red-500/60' : ''}`}
                placeholder="Confirm Password"
                aria-invalid={!!confirmError}
                aria-describedby={confirmError ? 'confirm-error' : undefined}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                className="absolute inset-y-0 right-0 px-4 text-zinc-500 hover:text-zinc-300"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
            {confirmError && (
              <p id="confirm-error" className="mt-1.5 ml-1 text-sm text-red-500">
                {confirmError}
              </p>
            )}
          </div>

          {generalError && <p className="text-sm text-red-500">{generalError}</p>}

          {/* Terms */}
          <p className="text-xs text-zinc-400 leading-relaxed pt-2">
            By clicking the <span className="text-red-500 font-semibold">Register</span> button, you
            agree to the{' '}
            <a href="#" className="underline">Privacy Policy</a> and{' '}
            <a href="#" className="underline">Terms &amp; Conditions</a>.
          </p>

          {/* Action row: Register + glowing arrow button */}
          <div className="flex items-center justify-between mt-8">
            <button
              type="submit"
              disabled={loading}
              className="text-white text-xl font-semibold hover:text-zinc-200 transition"
            >
              {loading ? 'Registering…' : 'Register'}
            </button>
            <button
              type="submit"
              disabled={loading}
              aria-label="Register"
              className="h-16 w-16 rounded-full bg-gradient-to-br from-red-500 to-orange-500 grid place-items-center shadow-[0_0_30px_rgba(239,68,68,0.6)] hover:shadow-[0_0_40px_rgba(239,68,68,0.8)] hover:scale-105 active:scale-95 transition"
            >
              <ArrowRightIcon className="h-7 w-7 text-white" />
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{' '}
          <Link to="/login" className="text-white font-semibold hover:text-zinc-300">
            Sign in
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
