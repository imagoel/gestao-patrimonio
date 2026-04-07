import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { Perfil } from '../types/enums'

interface ProtectedRouteProps {
  allowedPerfis?: Perfil[]
}

export function ProtectedRoute({ allowedPerfis }: ProtectedRouteProps) {
  const location = useLocation()
  const { isAuthenticated, session } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (
    allowedPerfis?.length &&
    (!session.user?.perfil || !allowedPerfis.includes(session.user.perfil))
  ) {
    return <Navigate to="/403" replace />
  }

  return <Outlet />
}
