import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

/**
 * Auth gate. Works two ways:
 *   1. As a layout route parent: <Route element={<ProtectedRoute/>}> …children
 *      render via <Outlet/>.
 *   2. As a wrapper: <ProtectedRoute><Page/></ProtectedRoute>
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children ?? <Outlet />
}
