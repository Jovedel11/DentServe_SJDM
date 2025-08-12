// RoleBasedRoute.jsx - SIMPLIFIED
import { useAuth } from "../../auth/context/AuthProvider";
import { Navigate } from "react-router-dom";
import Loading from "../common/loading_error/Loading";

export const RoleBasedRoute = ({
  children,
  allowedRoles = [],
  redirectTo = "/unauthorized",
}) => {
  const { userProfile, loading, userRole, user } = useAuth();

  if (loading) return <Loading />;

  if (!userProfile) return <Navigate to="/login" replace />;

  // ✅ SIMPLIFIED: Only check email verification
  const emailVerified = user?.email_confirmed_at !== null;

  if (!emailVerified) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <h3>📧 Email Verification Required</h3>
        <p>
          Please check your email and click the verification link to continue.
        </p>
        <p>
          Email: <strong>{user?.email}</strong>
        </p>
        <a
          href="https://gmail.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            padding: "10px 20px",
            backgroundColor: "#dc3545",
            color: "white",
            textDecoration: "none",
            borderRadius: "4px",
          }}
        >
          📧 Open Gmail
        </a>
      </div>
    );
  }

  // Check role authorization
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};
