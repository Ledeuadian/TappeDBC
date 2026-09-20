import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'

import LandingPage from './pages/LandingPage.jsx'
import LoginPage from './pages/auth/LoginPage.jsx'
import SignupPage from './pages/auth/SignupPage.jsx'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

// Lazy-loaded routes — keeps the initial bundle small. The QR/NFC landing
// path (/signup) and public card page no longer pull in the editor code.
const DashboardHome = lazy(() => import('./pages/dashboard/DashboardHome.jsx'))
const CardEditorPage = lazy(() => import('./pages/dashboard/CardEditorPage.jsx'))
const CardLayoutPage = lazy(() => import('./pages/dashboard/CardLayoutPage.jsx'))
const MyCardsPage = lazy(() => import('./pages/dashboard/MyCardsPage.jsx'))
const SharePage = lazy(() => import('./pages/dashboard/SharePage.jsx'))
const SettingsPage = lazy(() => import('./pages/dashboard/SettingsPage.jsx'))
const InviteFriendsPage = lazy(() => import('./pages/dashboard/InviteFriendsPage.jsx'))
const PublicCardPage = lazy(() => import('./pages/public/PublicCardPage.jsx'))
const ClaimPage = lazy(() => import('./pages/ClaimPage.jsx'))

function RouteFallback() {
  return (
    <div className="min-h-screen grid place-items-center">
      <p className="text-sm text-slate-500">Loading…</p>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      {/* Landing — full-screen onboarding, no shared chrome */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth pages — full-screen mobile-first dark UI, no shared chrome */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Dashboard — auth required; ProtectedRoute renders an <Outlet/> */}
      <Route path="/dashboard" element={<ProtectedRoute />}>
        <Route index element={<DashboardHome />} />
        <Route path="share" element={<SharePage />} />
        <Route path="cards" element={<MyCardsPage />} />
        <Route path="cards/:cardId" element={<CardEditorPage />} />
        <Route path="cards/:cardId/layout" element={<CardLayoutPage />} />
        <Route path="cards/:cardId/share" element={<SharePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/invite" element={<InviteFriendsPage />} />
      </Route>

      {/* Public digital card view (no auth) */}
      <Route path="/c/preview" element={<PublicCardPage />} />
      <Route path="/c/:slug" element={<PublicCardPage />} />

      {/* Card claim — QR on a physical card points here */}
      <Route path="/claim/:code" element={<ClaimPage />} />

      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
    </Suspense>
  )
}
