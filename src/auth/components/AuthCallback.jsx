// auth/components/AuthCallback.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/auth/context/AuthProvider";

const AuthCallback = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("Verifying your account...");
  const navigate = useNavigate();
  const { checkUserProfile } = useAuth(); // ✅ SIMPLIFIED: Just checkUserProfile

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      setStatus("Processing email verification...");

      const { data, error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(window.location.href);

      if (exchangeError) {
        throw new Error(exchangeError.message || "Session exchange failed");
      }

      if (!data?.session?.user) {
        throw new Error("No session found after verification");
      }

      const authUser = data.session.user;
      console.log("Email verification successful for:", authUser.email);

      setStatus("Updating verification status...");

      // Wait for database triggers to complete
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Re-check profile status after verification
      await checkUserProfile(authUser);

      setStatus("Redirecting...");

      // ✅ SIMPLIFIED: Let AuthProvider handle navigation via useAuthNavigation
      // Small delay to ensure state updates
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    } catch (err) {
      console.error("Auth callback error:", err);
      setError(err.message || "Email verification failed");
      setStatus("Verification failed");

      setTimeout(() => {
        navigate("/login", {
          replace: true,
          state: { error: "Email verification failed. Please try again." },
        });
      }, 3000);
    }
  };

  if (error) {
    return (
      <div className="auth-callback-container">
        <div className="auth-callback-error">
          <h2>Verification Failed</h2>
          <p>{error}</p>
          <p>Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-callback-container">
      <div className="auth-callback-loading">
        <div className="spinner"></div>
        <h2>{status}</h2>
        <p>Please wait while we complete your verification...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
