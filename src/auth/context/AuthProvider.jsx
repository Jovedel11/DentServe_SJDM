import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { handleSupabaseError, supabase } from "../../../supabaseClient";
import { useSessionManager } from "../hooks/useSessionManager";
import { authService } from "../hooks/authService";

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // session management
  const {
    showWarning,
    extendSession,
    handleAutoLogout,
    sessionLogout,
    startSessionTimer,
    sessionTimeout,
  } = useSessionManager();

  useEffect(() => {
    (async () => {
      await getSession();
    })();

    // listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session);
      if (session?.user) {
        setUser(session?.user);
        await fetchUserProfile(session?.user?.id);
      } else {
        setUser(null);
        setUserProfile(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // user current session
  const getSession = async () => {
    setLoading(true);
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) console.error("Error fetching session:", error);
      if (session?.user) {
        setUser(session.user);
        await fetchUserProfile(session?.user?.id);
        startSessionTimer();
      }
    } catch (error) {
      console.error("Error fetching session:", error);
      setError(handleSupabaseError(error));
    } finally {
      setLoading(false);
    }
  };

  // fetch user profile
  const fetchUserProfile = async (authUserId) => {
    try {
      setLoading(true);

      // get user role and user_profile
      const { data: userProfileRole, error: roleError } = await supabase
        .from("users")
        .select("user_profiles(id, user_type)")
        .eq("auth_user_id", authUserId)
        .single();

      if (roleError) throw roleError;

      const { id: profileId, user_type } = userProfileRole.user_profiles;

      // fetch specific role
      let profileData;
      let profileError;

      switch (user_type) {
        case "staff":
          ({ data: profileData, error: profileError } = await supabase
            .from("staff_profiles")
            .select(
              `
                *,
                clinics (
                  id, name, location, address, city, phone, email, operating_hours, service_offer, rating
                )
              `
            )
            .eq("user_profile_id", profileId)
            .single());
          break;

        case "patient":
          ({ data: profileData, error: profileError } = await supabase
            .from("patient_profiles")
            .select("*")
            .eq("user_profile_id", profileId)
            .single());
          break;

        case "admin":
          ({ data: profileData, error: profileError } = await supabase
            .from("admin_profiles")
            .select("*")
            .eq("user_profile_id", profileId)
            .single());
          break;

        default:
          throw new Error(`Unknown user type: ${user_type}`);
      }

      if (profileError) throw profileError;

      setUserProfile({
        ...profileData,
        user_type,
      });
      setUserRole(user_type);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setError(handleSupabaseError(error));
    } finally {
      setLoading(false);
    }
  };

  // check verification stats
  const checkVerificationStatus = useCallback(async () => {
    return await authService.checkVerificationStatus();
  }, []);

  const getCurrentUserRole = async () => {
    try {
      const { data: role } = await supabase.rpc("get_current_user_role");
      if (!role) return null;
      setUserRole(role);
      return role;
    } catch (error) {
      console.error("Error fetching user role:", error);
      return null;
    }
  };

  const signInWithPassword = async (
    identifier,
    password,
    rememberMe = false
  ) => {
    setLoading(true);
    setError(null);
    const result = await authService.signInWithPassword(
      identifier,
      password,
      rememberMe
    );

    if (result.error) setError(result.error);

    setLoading(false);
    return result;
  };

  const verifyOTPLogin = async (
    identifier,
    otpCode,
    type = "email",
    rememberMe = false
  ) => {
    setLoading(true);
    setError(null);
    const result = await authService.verifyOTPToken(
      identifier,
      otpCode,
      type,
      rememberMe
    );

    if (result.error) setError(result.error);

    setLoading(false);
    return result;
  };

  const sendOTP = async (identifier, type = "email") => {
    setLoading(true);
    setError(null);
    const result = await authService.sendOTP(identifier, type);

    if (result.error) setError(result.error);

    setLoading(false);
    return result;
  };

  const signUpUser = async (userData) => {
    setLoading(true);
    setError(null);
    const result = await authService.signUpUser(userData);

    if (result.error) setError(result.error);

    setLoading(false);
    return result;
  };

  const signOut = async () => {
    setLoading(true);
    const result = await authService.signOut();

    if (result.success) {
      setUser(null);
      setUserProfile(null);
      setUserRole(null);
      sessionTimeout();
    }

    setLoading(false);
    return result;
  };

  // get user role
  const isPatient = () => userRole === "patient";
  const isStaff = () => userRole === "staff";
  const isAdmin = () => userRole === "admin";

  const getStaffClinic = () => {
    if (!isStaff()) return null;
    return isStaff() ? userProfile?.clinics || null : null;
  };

  const value = {
    // State
    user,
    userProfile,
    userRole,
    loading,
    error,
    showWarning,

    // Auth methods
    signInWithPassword,
    verifyOTPLogin,
    sendOTP,
    signUpUser,
    signOut,
    checkVerificationStatus,

    // session management
    handleAutoLogout,
    extendSession,
    sessionLogout,
    sessionTimeout,

    // helper methods
    isPatient,
    isStaff,
    isAdmin,
    getStaffClinic,
    getCurrentUserRole,
    refetchProfile: () => fetchUserProfile(user?.id),
    setError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
export default AuthProvider;
