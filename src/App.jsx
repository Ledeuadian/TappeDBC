import { Routes, Route, Navigate } from 'react-router-dom'

import LandingPage from './pages/LandingPage.jsx'
import LoginPage from './pages/auth/LoginPage.jsx'
import SignupPage from './pages/auth/SignupPage.jsx'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage.jsx'
import DashboardHome from './pages/dashboard/DashboardHome.jsx'
import CardEditorPage from './pages/dashboard/CardEditorPage.jsx'
import MyCardsPage from './pages/dashboard/MyCardsPage.jsx'
import SharePage from './pages/dashboard/SharePage.jsx'
import SettingsPage from './pages/dashboard/SettingsPage.jsx'
import PublicCardPage from './pages/public/PublicCardPage.jsx'
import ClaimPage from './pages/ClaimPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

export default function App() {
  return (
    <Routes>
      {/* Landing — full-screen onboarding, no shared chrome */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth pages — full-screen mobile-first dark UI, no shared chrome */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Dashboard — public for now, full-screen mobile-first, no shared chrome */}
      <Route path="/dashboard" element={<DashboardHome />} />
      <Route path="/dashboard/cards" element={<MyCardsPage />} />
      <Route path="/dashboard/cards/:cardId" element={<CardEditorPage />} />
      <Route path="/dashboard/cards/:cardId/share" element={<SharePage />} />
      <Route path="/dashboard/settings" element={<SettingsPage />} />

      {/* Public digital card view (no auth) */}
      <Route path="/c/preview" element={<PublicCardPage />} />
      <Route path="/c/:slug" element={<PublicCardPage />} />

      {/* Card claim — QR on a physical card points here */}
      <Route path="/claim/:code" element={<ClaimPage />} />

      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  )
}
