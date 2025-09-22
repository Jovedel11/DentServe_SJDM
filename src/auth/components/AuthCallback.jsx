import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/auth/context/AuthProvider";

const AuthCallback = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("Verifying your account...");
  const navigate = useNavigate();
  const { refreshAuthStatus } = useAuth();

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      setStatus("Processing email verification...");

      // Handle the email verification callback
      const { data, error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(window.location.href);

      if (exchangeError) {
        throw new Error(exchangeError.message || "Email verification failed");
      }

      if (!data?.session?.user) {
        throw new Error("No session found after verification");
      }

      const authUser = data.session.user;
      console.log("✅ Email verification successful for:", authUser.email);

      setStatus("Updating verification status...");

      // Wait for database triggers to complete
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Refresh auth status to get updated verification state
      await refreshAuthStatus(authUser.id);

      setStatus("Redirecting to dashboard...");

      // The AuthProvider and NavigationManager will handle the redirect
      setTimeout(() => {
        setLoading(false);
        // Let the navigation system handle where to go
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Verification Failed
          </h2>
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{status}</h2>
        <p className="text-gray-600">
          Please wait while we complete your verification...
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;
