import { NavLink, Outlet } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import Footer from '../components/Footer.jsx'

export default function PublicLayout() {
  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200">
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2">
            <Logo />
            <span className="font-bold text-slate-900">Tappe</span>
          </NavLink>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-700">
            <a href="#features" className="hover:text-tappe-600">Features</a>
            <a href="#how" className="hover:text-tappe-600">How it works</a>
            <a href="#pricing" className="hover:text-tappe-600">Pricing</a>
          </div>
          <div className="flex items-center gap-2">
            <NavLink to="/login" className="btn-ghost">Log in</NavLink>
            <NavLink to="/signup" className="btn-primary">Get started</NavLink>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  )
}
