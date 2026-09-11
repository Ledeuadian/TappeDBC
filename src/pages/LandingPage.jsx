import { Link, Navigate } from 'react-router-dom'
import { Suspense, Component } from 'react'
import CardScene from '../components/three/CardScene.jsx'
import { useAuth } from '../context/AuthContext.jsx'

/**
 * Defensive boundary for the 3D scene. If WebGL fails (no GPU, locked-down
 * browser, CSP blocks an asset) we fall back to a static gradient circle
 * instead of a blank screen.
 */
class SceneBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err) { console.warn('[tappe] CardScene failed:', err) }
  render() {
    if (this.state.failed) return null
    return this.props.children
  }
}

export default function LandingPage() {
  const { isAuthenticated, loading } = useAuth()

  // Signed-in users landing on "/" should go straight to the dashboard.
  // Wait for the session restore to finish first, so a refresh doesn't
  // flash the landing page before the redirect fires.
  if (!loading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* iOS-style status bar area */}
      <div className="h-11 flex items-center justify-between px-8" aria-hidden="true">
        <span className="text-white text-xs font-semibold"></span>
        <span className="h-6 w-24 rounded-full bg-zinc-900" />
        <span className="text-white text-xs"></span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-between px-6 pt-8 pb-8 max-w-md w-full mx-auto">
        {/* Header */}
        <div className="w-full text-left">
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            Welcome to{' '}
            <span className="block bg-gradient-to-b from-zinc-100 via-zinc-300 to-zinc-500 bg-clip-text text-transparent">
              Tappe
            </span>
          </h1>
          <p className="mt-3 text-base text-zinc-400">
            Everything you need. One Tap.
          </p>
        </div>

        {/* Hero graphic: pastel gradient orb + interactive 3D Tappe card */}
        <div className="relative w-full h-80 flex items-center justify-center">
          {/* Pastel radial circle (pink → purple → white) */}
          <div
            className="absolute h-72 w-72 rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, #ffffff 0%, #fde2f3 25%, #f3c6e8 50%, #d8b4fe 78%, #c4a3f5 100%)',
            }}
            aria-hidden="true"
          />

          {/* 3D card — rotates with drag, auto-spins when idle */}
          <div className="relative w-72 h-72 cursor-grab active:cursor-grabbing">
            <SceneBoundary>
              <Suspense fallback={null}>
                <CardScene />
              </Suspense>
            </SceneBoundary>
          </div>
        </div>

        {/* CTA */}
        <div className="w-full">
          <Link
            to="/signup"
            className="block w-full text-center rounded-full py-4 text-white text-lg font-bold bg-gradient-to-r from-red-500 to-orange-500 shadow-[0_0_35px_rgba(239,68,68,0.45)] hover:shadow-[0_0_45px_rgba(239,68,68,0.65)] hover:brightness-110 active:scale-[0.98] transition"
          >
            Get Started
          </Link>
        </div>
      </div>

      {/* iOS-style home indicator */}
      <div className="flex justify-center pb-4" aria-hidden="true">
        <div className="h-1.5 w-36 rounded-full bg-zinc-700" />
      </div>
    </div>
  )
}
