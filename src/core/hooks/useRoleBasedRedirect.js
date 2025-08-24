import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/context/AuthProvider";
import { useRedirectPath } from "@/auth/hooks/useRedirectPath";

export const useRoleBasedRedirect = () => {
  const { user, userRole, authStatus, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = useRedirectPath();

  useEffect(() => {
    if (loading) return; 
    if (!authStatus) return; 

    if (!user) return;

    if (!authStatus.can_access_app) {
      if (location.pathname !== redirectPath) {
        navigate(redirectPath, { replace: true });
      }
      return;
    }

    // 🔹 Case 3: Logged in & verified
    const entryRoutes = ["/", "/about", "/services", "/contact", "/login", "/signup", "/forgot-password"];
    if (entryRoutes.includes(location.pathname)) {
      const roleHome = {
        patient: "/patient/dashboard",
        staff: "/staff/dashboard",
        admin: "/admin/dashboard",
      };

      const target = roleHome[userRole] || "/unauthorized";
      if (location.pathname !== target) {
        navigate(target, { replace: true });
      }
    }

  }, [
    user,
    userRole,
    authStatus,
    loading,
    redirectPath,
    location.pathname,
    navigate,
  ]);
};
