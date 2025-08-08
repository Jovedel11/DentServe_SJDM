import { useAuth } from "../../auth/context/AuthProvider";
import { Navigate } from "react-router-dom";
import Loading from "../common/loading_error/Loading"

export const RoleBasedRoute = ({
  children,
  allowedRoles = [],
  redirectTo = "/unauthorized",
}) => {
  const { userProfile, loading, getUserRole } = useAuth();

  if (loading) return <Loading />;

  if (userProfile) return <Navigate to="login" replace />;

  const userRole = getUserRole();

  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;

}