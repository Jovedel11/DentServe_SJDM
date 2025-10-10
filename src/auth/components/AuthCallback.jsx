import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/auth/context/AuthProvider";
import Loader from "@/core/components/Loader";
import styles from "../styles/AuthCallback.module.scss";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { refreshAuthStatus } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get session from Supabase
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (session) {
          // Refresh auth status
          await refreshAuthStatus(session.user.id);

          // Check if staff needs profile completion
          const userMeta = session.user.user_metadata;
          if (
            userMeta?.user_type === "staff" &&
            userMeta?.profile_completion_required
          ) {
            navigate("/staff/complete-profile", {
              state: {
                clinicId: userMeta.clinic_id,
                invitationId: userMeta.invitation_id,
              },
              replace: true,
            });
            return;
          }

          // Redirect based on user type
          const userType = userMeta?.user_type;
          if (userType === "patient") {
            navigate("/patient/dashboard", { replace: true });
          } else if (userType === "staff") {
            navigate("/staff/dashboard", { replace: true });
          } else if (userType === "admin") {
            navigate("/admin/dashboard", { replace: true });
          } else {
            navigate("/", { replace: true });
          }
        } else {
          navigate("/login", { replace: true });
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        setError(err.message || "Authentication failed. Please try again.");
      }
    };

    handleAuthCallback();
  }, [navigate, refreshAuthStatus]);

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorCard}>
          <div className={styles.errorIcon}>
            <svg
              className={styles.icon}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className={styles.errorTitle}>Authentication Error</h2>
          <p className={styles.errorMessage}>{error}</p>
          <button
            type="button"
            onClick={() => navigate("/login", { replace: true })}
            className={styles.errorButton}
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.loaderWrapper}>
        <Loader className={styles.loader} />
        <p className={styles.loadingText}>Authenticating your account...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
