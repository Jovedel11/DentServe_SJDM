import { useEffect } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useNavigate, useLocation } from "react-router-dom";
import { useRedirectPath } from "@/auth/hooks/useRedirectPath";
import Loading from "../common/loading_error/Loading";

const AuthGuard = ({
  children,
  requiredRole = null,
  requireVerification = true,
}) => {
  const { user, authStatus, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = useRedirectPath();

  useEffect(() => {
    if (loading) return;

    // Not authenticated
    if (!user) {
      navigate("/login");
      return;
    }

    // No auth status yet
    if (!authStatus) {
      return;
    }

    // Wrong role
    if (requiredRole && authStatus.user_role !== requiredRole) {
      navigate("/unauthorized");
      return;
    }

    // Handle verification/completion requirements
    if (requireVerification && !authStatus.can_access_app) {
      if (location.pathname !== redirectPath) {
        navigate(redirectPath);
      }
      return;
    }
  }, [user, authStatus, loading, location, useRedirectPath]);

  // Loading state
  if (loading) return <Loading />;

  // Not authenticated or wrong role
  if (!user || !authStatus) {
    return null;
  }

  if (requiredRole && authStatus.user_role !== requiredRole) {
    return null;
  }

  // Needs verification/completion
  if (requireVerification && !authStatus.can_access_app) {
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;
