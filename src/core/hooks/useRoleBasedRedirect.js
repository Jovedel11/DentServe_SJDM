import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../../auth/context/AuthProvider"
import { useEffect } from "react"

export const useRoleBasedRedirect = () => {
  const { user, userRole, profileComplete, getRedirectPath, authStatus } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (user && userRole && authStatus.can_access_app) {
      // If there's a verification step needed, redirect there first
    if (!authStatus.can_access_app) {
      const redirectPath = getRedirectPath();
      if (location.pathname !== redirectPath) {
        navigate(redirectPath);
      }
      return;
    }
      // Otherwise redirect based on role
      switch (userRole) {
        case 'patient':
          navigate('/patient/dashboard', { replace: true });
          break;
        case 'staff':
          navigate('/staff/dashboard', { replace: true });
          break;
        case 'admin':
          navigate('/admin/dashboard', { replace: true });
          break;
        default:
          navigate('/unauthorized', { replace: true });
          break;
      }
    }
  }, [user, userRole, profileComplete, getRedirectPath, navigate])
}