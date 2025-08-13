import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/auth/context/AuthProvider";

export const AuthCallback = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { checkUserProfile, getVerificationStep, userRole } = useAuth();

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      const { data, error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(window.location.href);
      if (exchangeError) throw exchangeError;
      if (!data.session) throw new Error("No session found");

      //sync profile
      const user = data?.session?.user;

      await checkUserProfile(user);

      const verificationStep = getVerificationStep();
      if (verificationStep) {
        navigate(`/${verificationStep}`);
        return;
      }

      // redirect based on role
      switch (userRole) {
        case "patient":
          navigate("/patient/dashboard");
          break;
        case "staff":
          navigate("/staff/dashboard");
          break;
        case "admin":
          navigate("/admin/dashboard");
          break;
        default:
          navigate("/complete-profile");
      }
    } catch (err) {
      console.error("Auth callback error:", err);
      setError(err.message);
      setTimeout(() => navigate("/login"), 3000);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Verifying your account...</div>;
  if (error) return <div>{error}</div>;
  return <div>Account verified! Redirecting...</div>;
};
