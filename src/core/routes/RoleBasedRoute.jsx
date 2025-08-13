import { useAuth } from "@/auth/context/AuthProvider";
import { Navigate } from "react-router-dom";
import Loading from "@/core/common/loading_error/Loading";

export const RoleBasedRoute = ({
  children,
  allowedRoles = [],
  redirectTo = "/unauthorized",
}) => {
  const { loading, userRole, user, verificationStep } = useAuth();

  if (loading) return <Loading />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    return <Navigate to={redirectTo} replace />;
  }

  if (verificationStep) {
    return <Navigate to={verificationStep} replace />;
  }

  return children;
};
