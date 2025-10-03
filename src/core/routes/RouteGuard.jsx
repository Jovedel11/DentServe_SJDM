import { useEffect, useMemo } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useNavigate } from "react-router-dom";
import { authService } from "@/auth/hooks/authService";
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

  // Memoize role check to prevent unnecessary re-renders
  const hasValidRole = useMemo(() => {
    if (!allowedRoles || !authStatus) return true;
    return Array.isArray(allowedRoles)
      ? allowedRoles.includes(authStatus.user_role)
      : allowedRoles === authStatus.user_role;
  }, [allowedRoles, authStatus?.user_role]);

  useEffect(() => {
    if (!isInitialized || loading) return;

    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    if (!authStatus) return;

    if (!hasValidRole) {
      navigate("/unauthorized", { replace: true });
      return;
    }

    if (!canAccessApp && authStatus?.next_step) {
      navigate(authStatus.next_step, { replace: true });
      return;
    }
  }, [
    user,
    authStatus,
    loading,
    isInitialized,
    canAccessApp,
    hasValidRole,
    navigate,
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
