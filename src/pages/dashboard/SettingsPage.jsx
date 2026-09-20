import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { supabase } from '../../lib/supabase.js'

// Inline icons — keep stroke currentColor so parent color drives them
const IconUser = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M20 21a8 8 0 0 0-16 0" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const IconBell = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
)

const IconStar = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)

const IconShare = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
)

const IconLogout = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

const IconChevron = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <polyline points="9 6 15 12 9 18" />
  </svg>
)

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [pwSent, setPwSent] = useState(false)

  const handleChangePassword = async () => {
    if (!user?.email || pwSent) return
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/login`,
      })
      if (error) throw error
      setPwSent(true)
    } catch (err) {
      console.error('[tappe] reset password error', err)
    }
  }

  const handleLogout = async () => {
    setSigningOut(true)
    try {
      await logout()
      navigate('/', { replace: true })
    } catch (err) {
      console.error('[tappe] logout error', err)
      setSigningOut(false)
      setConfirmOpen(false)
    }
  }

  const openConfirm = () => setConfirmOpen(true)
  const closeConfirm = () => {
    if (signingOut) return // don't close while signing out
    setConfirmOpen(false)
  }

  return (
    <div className="p-6 sm:p-10 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      <div className="mt-6 card overflow-hidden">        {/* Manage account */}
        <div className="border-b border-slate-200">
          <button
            onClick={() => setAccountOpen((v) => !v)}
            aria-expanded={accountOpen}
            className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-slate-50 transition"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              {IconUser}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-700">Manage account</p>
              <p className="text-sm text-slate-500">Email and password settings</p>
            </div>
            <span
              className={`text-slate-400 transition-transform ${accountOpen ? 'rotate-90' : ''}`}
              aria-hidden
            >
              {IconChevron}
            </span>
          </button>

          {accountOpen && (
            <div className="bg-slate-50/60">
              {/* Email */}
              <div className="flex items-center gap-4 px-6 py-4 pl-20 border-t border-slate-200">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700">Email</p>
                  <p className="text-sm text-slate-500 truncate">{user?.email ?? '—'}</p>
                </div>
              </div>

              {/* Change password */}
              <button
                onClick={handleChangePassword}
                className="w-full flex items-center gap-4 px-6 py-4 pl-20 border-t border-slate-200 text-left hover:bg-slate-100/70 transition"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">Change password</p>
                  <p className="text-sm text-slate-500">
                    {pwSent ? 'Reset link sent to your email' : "We'll email you a reset link"}
                  </p>
                </div>
                <span className="text-slate-400" aria-hidden>{IconChevron}</span>
              </button>
            </div>
          )}
        </div>

        {/* Notifications */}
        <button
          onClick={() => navigate('/dashboard/settings/notifications')}
          className="w-full flex items-center gap-4 px-6 py-5 border-b border-slate-200 text-left hover:bg-slate-50 transition"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            {IconBell}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-700">Notifications</p>
            <p className="text-sm text-slate-500">Manage how we contact you</p>
          </div>
          <span className="text-slate-400" aria-hidden>{IconChevron}</span>
        </button>

        {/* Leave a review */}
        <button
          onClick={() => navigate('/dashboard/settings/review')}
          className="w-full flex items-center gap-4 px-6 py-5 border-b border-slate-200 text-left hover:bg-slate-50 transition"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            {IconStar}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-700">Leave a review</p>
            <p className="text-sm text-slate-500">Share your experience with Tappe</p>
          </div>
          <span className="text-slate-400" aria-hidden>{IconChevron}</span>
        </button>

        {/* Invite friends */}
        <button
          onClick={() => navigate('/dashboard/settings/invite')}
          className="w-full flex items-center gap-4 px-6 py-5 border-b border-slate-200 text-left hover:bg-slate-50 transition"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            {IconShare}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-700">Invite friends</p>
            <p className="text-sm text-slate-500">Share Tappe with others</p>
          </div>
          <span className="text-slate-400" aria-hidden>{IconChevron}</span>
        </button>

        {/* Sign out */}
        <button
          onClick={openConfirm}
          disabled={signingOut}
          className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-slate-50 transition disabled:opacity-50"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            {IconLogout}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-600">
              {signingOut ? 'Signing out…' : 'Sign out'}
            </p>
            <p className="text-sm text-slate-500">You'll be returned to the landing page.</p>
          </div>
          <span className="text-slate-400" aria-hidden>{IconChevron}</span>
        </button>
      </div>

      {/* Sign-out confirmation modal */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeConfirm}
          role="dialog"
          aria-modal="true"
          aria-labelledby="signout-confirm-title"
        >
          <div
            className="card w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="signout-confirm-title" className="text-lg font-bold text-slate-900">
              Sign out?
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              You'll need to sign in again to manage your cards. Are you sure you want to sign out?
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={closeConfirm}
                disabled={signingOut}
                className="flex-1 rounded-full border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                disabled={signingOut}
                className="flex-1 rounded-full py-2.5 text-sm font-bold text-white bg-gradient-to-r from-red-500 to-orange-500 shadow-[0_0_25px_rgba(239,68,68,0.3)] hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50"
              >
                {signingOut ? 'Signing out…' : 'Yes, sign out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
