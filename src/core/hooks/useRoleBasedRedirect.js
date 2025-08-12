import { useNavigate } from "react-router-dom"
import { useAuth } from "../../auth/context/AuthProvider"
import { useEffect } from "react"

export const useRolebasedRedirect = () => {
  const { userProfile, isPatient, isStaff, isAdmin } = useAuth()

  const navigate = useNavigate()

  useEffect(() => {
    if (userProfile) {
      // use the helper methods 
      if (isPatient()) {
        navigate('/patient/dashboard', { replace: true });
      } else if (isStaff()) {
        navigate('/staff/dashboard', { replace: true });
      } else if (isAdmin()) {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/unauthorized', { replace: true });
      }
    }
  }, [userProfile, isPatient, isStaff, isAdmin, navigate])

}