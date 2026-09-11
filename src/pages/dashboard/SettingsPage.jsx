import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

export default function SettingsPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  const handleLogout = async () => {
    setSigningOut(true)
    try {
      await logout()
      navigate('/', { replace: true })
    } catch (err) {
      console.error('[tappe] logout error', err)
      setSigningOut(false)
    }
  }

  return (
    <div className="p-6 sm:p-10 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      <p className="text-sm text-slate-500 mt-1">Account preferences (coming soon).</p>

      <div className="mt-8 card p-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700">Display name</label>
          <input className="input mt-1" placeholder="Your name" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Email</label>
          <input className="input mt-1" placeholder="you@example.com" />
        </div>
        <button className="btn-primary" disabled>Save changes</button>
      </div>

      {/* Sign out */}
      <div className="mt-8 card p-6">
        <h2 className="text-sm font-semibold text-slate-700">Session</h2>
        <button
          onClick={handleLogout}
          disabled={signingOut}
          className="mt-3 w-full rounded-full py-3 text-white font-bold bg-gradient-to-r from-red-500 to-orange-500 shadow-[0_0_35px_rgba(239,68,68,0.35)] hover:shadow-[0_0_45px_rgba(239,68,68,0.55)] hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50"
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
        <p className="mt-2 text-xs text-slate-400 text-center">
          You'll be returned to the landing page.
        </p>
      </div>
    </div>
  )
}
