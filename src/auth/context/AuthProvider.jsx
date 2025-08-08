import { createContext, useContext, useEffect, useState } from "react";
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
  const { showWarning, extendSession, handleAutoLogout, sessionLogout } =
    useSessionManager();

  useEffect(() => {
    getSession();

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
        await fetchUserProfile(session.user.id);
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

      const { data, error } = await supabase
        .from("users")
        .select(
          `
          *,
            user_profiles (
              *,
              patient_profiles (*),
              staff_profiles (
              *,
              clinics (
              id, name, address, phone, email, location, service_offered, rating
              )
              ),
              admin_profiles (*)
          )
          `
        )
        .eq("auth_user_id", authUserId)
        .single();
      if (error) throw error;
      setUserProfile(data);
      setUserRole(data?.user_profiles?.user_type);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setError(handleSupabaseError(error));
    } finally {
      setLoading(false);
    }
  };

  const getCurrentUserRole = async () => {
    try {
      const { data: role } = await supabase.rpc("get_current_user_role");
      setUserRole(role);
      return role;
    } catch (error) {
      console.error("Error fetching user role:", error);
      return null;
    }
  };

  const signInWithPassword = async (email, password) => {
    setLoading(true);
    setError(null);
    const result = await authService.signInWithPassword(email, password);

    if (result.error) setError(result.error);

    setLoading(false);
    return result;
  };

  const signInWithOTP = async (identifier, otpCode, type = "email") => {
    setLoading(true);
    setError(null);
    const result = await authService.verifyOTPToken(identifier, otpCode, type);

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
    return userProfile?.user_profiles?.staff_profiles?.clinics || null;
  };

  const value = {
    // State
    user,
    userProfile,
    loading,
    error,
    showWarning,

    // Auth methods
    signInWithPassword,
    signInWithOTP,
    sendOTP,
    signUpUser,
    signOut,

    // session management
    handleAutoLogout,
    extendSession,
    sessionLogout,

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
