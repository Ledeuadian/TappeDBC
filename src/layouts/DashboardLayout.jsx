import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const nav = [
  { to: '/dashboard', label: 'Overview', end: true },
  { to: '/dashboard/cards', label: 'My cards' },
  { to: '/dashboard/settings', label: 'Settings' },
]

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-full flex bg-slate-50">
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200">
        <div className="h-16 px-6 flex items-center border-b border-slate-200">
          <NavLink to="/" className="flex items-center gap-2">
            <Logo />
            <span className="font-bold text-slate-900">Tappe</span>
          </NavLink>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-tappe-50 text-tappe-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-tappe-100 text-tappe-700 grid place-items-center font-semibold">
              {user?.name?.[0]?.toUpperCase() || 'T'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
            <button onClick={handleLogout} className="text-xs text-slate-500 hover:text-slate-800">
              Logout
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
