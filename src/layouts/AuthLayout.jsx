import { Link, Outlet } from 'react-router-dom'
import Logo from '../components/Logo.jsx'

export default function AuthLayout() {
  return (
    <div className="min-h-full grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-tappe-600 to-tappe-800 text-white">
        <Link to="/" className="flex items-center gap-2">
          <Logo className="bg-white/10" />
          <span className="font-bold text-white">Tappe</span>
        </Link>
        <div>
          <h2 className="text-3xl font-bold leading-tight">
            One tap to share who you are.
          </h2>
          <p className="mt-4 text-tappe-100 max-w-md">
            Build a beautiful digital business card in minutes and share it
            with anyone, anywhere — no app required.
          </p>
        </div>
        <p className="text-xs text-tappe-200">© {new Date().getFullYear()} Tappe</p>
      </div>

      <div className="flex items-center justify-center bg-white">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
