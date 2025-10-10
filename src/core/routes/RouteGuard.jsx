import { useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useNavigate, useLocation } from "react-router-dom";
import Loader from "@/core/components/Loader";

const RouteGuard = ({ children, allowedRoles = null }) => {
  const {
    user,
    authStatus,
    loading,
    isInitialized,
    canAccessApp,
    isStaff,
    profile,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ PRODUCTION: Prevent redirect loops
  const redirectAttempts = useRef(0);
  const lastRedirect = useRef(null);
  const MAX_REDIRECTS = 3;

  // Memoize role check to prevent unnecessary re-renders
  const hasValidRole = useMemo(() => {
    if (!allowedRoles || !authStatus) return true;
    return Array.isArray(allowedRoles)
      ? allowedRoles.includes(authStatus.user_role)
      : allowedRoles === authStatus.user_role;
  }, [allowedRoles, authStatus?.user_role]);

  useEffect(() => {
    if (!isInitialized || loading) return;

    // ✅ PRODUCTION: Check for redirect loop
    if (redirectAttempts.current >= MAX_REDIRECTS) {
      console.error("🚨 Redirect loop detected! Stopping navigation.");
      redirectAttempts.current = 0;
      navigate("/", { replace: true });
      return;
    }

    const currentPath = location.pathname;

    if (!user) {
      // ✅ PRODUCTION: Avoid redirecting to login if already there
      if (currentPath !== "/login") {
        if (lastRedirect.current !== "/login") {
          lastRedirect.current = "/login";
          redirectAttempts.current++;
          console.log(
            `🔐 Redirecting to login (attempt ${redirectAttempts.current})`
          );
          navigate("/login", { replace: true });
        }
      }
      return;
    }

    if (!authStatus) return;

    if (!hasValidRole) {
      if (currentPath !== "/unauthorized") {
        if (lastRedirect.current !== "/unauthorized") {
          lastRedirect.current = "/unauthorized";
          redirectAttempts.current++;
          console.log(
            `🚫 Redirecting to unauthorized (attempt ${redirectAttempts.current})`
          );
          navigate("/unauthorized", { replace: true });
        }
      }
      return;
    }

    if (!canAccessApp && authStatus?.next_step) {
      if (currentPath !== authStatus.next_step) {
        if (lastRedirect.current !== authStatus.next_step) {
          lastRedirect.current = authStatus.next_step;
          redirectAttempts.current++;
          console.log(
            `➡️ Redirecting to next step: ${authStatus.next_step} (attempt ${redirectAttempts.current})`
          );
          navigate(authStatus.next_step, { replace: true });
        }
      }
      return;
    }

    // ✅ PRODUCTION: Reset redirect counter if user is on valid route
    redirectAttempts.current = 0;
    lastRedirect.current = null;
  }, [
    user,
    authStatus,
    loading,
    isInitialized,
    canAccessApp,
    hasValidRole,
    navigate,
    location.pathname,
  ]);

  // Simple loading state
  if (!isInitialized || loading) {
    return <Loader message="Loading..." />;
  }

  // Block if no user or invalid role
  if (!user || !authStatus || !hasValidRole || !canAccessApp) {
    return <Loader message="Checking permissions..." />;
  }

  return children;
};

export default RouteGuard;
