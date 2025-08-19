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
    if (loading) return; // wait for auth state
    if (!authStatus) return; // walang authStatus info

    // 🔹 Case 1: Not logged in → do nothing (can access public pages)
    if (!user) return;

    // 🔹 Case 2: Logged in but cannot access app yet (verify/profile incomplete)
    if (!authStatus.can_access_app) {
      if (location.pathname !== redirectPath) {
        navigate(redirectPath, { replace: true });
      }
      return;
    }

    // 🔹 Case 3: Logged in & verified
    const entryRoutes = ["/", "/about", "/services", "/contact", "/login", "/signup", "/forgot-password"];
    if (entryRoutes.includes(location.pathname)) {
      // If nasa public routes pero authenticated, redirect to role home
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

    // 🔹 Else: already in a protected route (e.g. /patient/appointments) → do nothing
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
