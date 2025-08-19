import { useEffect } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useNavigate, useLocation } from "react-router-dom";
import Loader from "@/core/components/Loader";

const AuthGuard = ({
  children,
  requiredRole = null,
  requireVerification = true,
}) => {
  const { user, authStatus, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/login");
      return;
    }

    if (!authStatus) {
      return;
    }

    // wrong role (supports string or array)
    const roleIsValid = requiredRole
      ? requiredRole === authStatus.user_role
      : true;

    if (!roleIsValid) {
      navigate("/unauthorized");
      return;
    }

    // needs verification/completion
    if (requireVerification && !authStatus.can_access_app) {
      navigate("/complete-profile");
      return;
    }
  }, [
    user,
    authStatus,
    loading,
    location,
    navigate,
    requiredRole,
    requireVerification,
  ]);

  // always show loader until everything is ready
  if (loading || !user || !authStatus) {
    return <Loader message="Loading components..." />;
  }

  // Block rendering if not allowed
  const roleIsValid = requiredRole
    ? requiredRole === authStatus.user_role
    : true;

  if (!roleIsValid) return null;
  if (requireVerification && !authStatus.can_access_app) return null;

  return <>{children}</>;
};

export default AuthGuard;
