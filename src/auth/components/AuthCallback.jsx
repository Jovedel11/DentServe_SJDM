import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/auth/context/AuthProvider";
import Loader from "@/core/components/Loader";

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshAuthStatus } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      // Get session from Supabase
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) throw error;

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
          });
          return;
        }

        // Redirect based on user type
        const userType = userMeta?.user_type;
        if (userType === "patient") navigate("/patient/dashboard");
        else if (userType === "staff") navigate("/staff/dashboard");
        else if (userType === "admin") navigate("/admin/dashboard");
        else navigate("/");
      } else {
        navigate("/login");
      }
    } catch (err) {
      console.error("Auth callback error:", err);
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return null;
};

export default AuthCallback;
