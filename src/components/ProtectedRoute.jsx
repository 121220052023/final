import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const SuspendedBanner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="max-w-md text-center p-8 bg-destructive/10 rounded-xl border border-destructive/30">
      <div className="text-4xl mb-4 font-bold text-destructive">!</div>
      <h1 className="text-2xl font-bold text-destructive mb-2">Account Suspended</h1>
      <p className="text-muted-foreground">
        This account has been suspended by an administrator. If you believe this is an error, please contact support.
      </p>
    </div>
  </div>
)

const ProtectedRoute = ({ children, requireParent = false, requireAdmin = false }) => {
  const { user, profile, loading } = useAuth()
  const { pathname } = useLocation()

  // If loading, show spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  // If not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (profile?.deleted_at || profile?.is_suspended) {
    return <SuspendedBanner />
  }

  if (requireParent && profile?.role !== 'parent' && profile?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  if (requireAdmin && profile?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  // Redirect admin users away from user-facing pages to /admin
  if (profile?.role === 'admin' && !requireAdmin) {
    return <Navigate to="/admin" replace />
  }

  return children
}

export default ProtectedRoute
