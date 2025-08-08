import { useNavigate } from "react-router-dom"
import { useAuth } from "../../auth/context/AuthProvider"
import { useEffect } from "react"

export const useRolebasedRedirect = () => {
  const { userProfile, getUserRole } = useAuth()

  const navigate = useNavigate()

  useEffect(() => {
    if (userProfile) {
      const role = getUserRole()

      switch (role) {
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
  }, [userProfile, getUserRole, navigate])

}