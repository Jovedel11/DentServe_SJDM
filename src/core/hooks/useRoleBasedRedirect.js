import { useNavigate } from "react-router-dom"
import { useAuth } from "../../auth/context/AuthProvider"
import { useEffect } from "react"

export const useRolebasedRedirect = () => {
  const { user, userRole, profileComplete, getVerificationStep } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user && userRole && profileComplete) {
      // If there's a verification step needed, redirect there first
      const verificationStep = getVerificationStep();
      if (verificationStep) {
        navigate(`/${verificationStep}`, { replace: true });
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
  }, [user, userRole, profileComplete, getVerificationStep, navigate])
}