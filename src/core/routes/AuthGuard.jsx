import { useEffect, useRef } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useNavigate, useLocation } from "react-router-dom";
import Loader from "@/core/components/Loader";

const AuthGuard = ({
  children,
  requiredRole = null,
  requireVerification = true,
}) => {
  const { user, authStatus, loading, isInitialized, canAccessApp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const lastNavigation = useRef({ path: "", time: 0 });

  // Simple debounced navigation
  const navigateIfNeeded = (path, options = {}) => {
    const now = Date.now();

    // Prevent same navigation within 1 second
    if (
      lastNavigation.current.path === path &&
      now - lastNavigation.current.time < 1000
    ) {
      return;
    }

    lastNavigation.current = { path, time: now };
    navigate(path, options);
  };

  useEffect(() => {
    // Wait for initialization
    if (!isInitialized || loading) return;

    const currentPath = location.pathname;

    // 1. Check if user exists
    if (!user) {
      const protectedRoutes = ["/patient/", "/staff/", "/admin/"];
      const isProtected = protectedRoutes.some((route) =>
        currentPath.startsWith(route)
      );

      if (isProtected) {
        console.log("Redirecting unauthenticated user to login");
        navigateIfNeeded("/login", { replace: true });
      }
      return;
    }

    // 2. Wait for auth status
    if (!authStatus) return;

    // 3. Check role permission
    if (requiredRole && authStatus.user_role !== requiredRole) {
      console.log(
        `Access denied: need ${requiredRole}, user is ${authStatus.user_role}`
      );
      navigateIfNeeded("/unauthorized", { replace: true });
      return;
    }

    // 4. Prevent cross-role access
    const roleRoutes = {
      patient: "/patient/",
      staff: "/staff/",
      admin: "/admin/",
    };

    for (const [role, routePrefix] of Object.entries(roleRoutes)) {
      if (
        role !== authStatus.user_role &&
        currentPath.startsWith(routePrefix)
      ) {
        console.log(
          `Blocking cross-role access: ${authStatus.user_role} -> ${role}`
        );
        navigateIfNeeded("/unauthorized", { replace: true });
        return;
      }
    }

    // 5. Check verification
    if (requireVerification && !canAccessApp) {
      const verificationRoutes = [
        "/verify-email",
        "/verify-phone",
        "/complete-profile",
        "/change-password",
      ];
      const onVerificationRoute = verificationRoutes.some((route) =>
        currentPath.startsWith(route)
      );

      if (!onVerificationRoute && authStatus.next_step) {
        console.log("Redirecting to verification:", authStatus.next_step);
        navigateIfNeeded(authStatus.next_step, { replace: true });
      }
    }
  }, [
    user,
    authStatus,
    loading,
    isInitialized,
    location.pathname,
    requiredRole,
    requireVerification,
    canAccessApp,
  ]);

  // Show loading
  if (!isInitialized || loading || !user || !authStatus) {
    return <Loader message="Loading..." />;
  }

  // Block if no permission
  if (requiredRole && authStatus.user_role !== requiredRole) return null;
  if (requireVerification && !canAccessApp) return null;

  return <>{children}</>;
};

export default AuthGuard;
