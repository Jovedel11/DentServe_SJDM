import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/lib/supabaseClient";
import { authService } from "@/auth/hooks/authService";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Get initial session
    getSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);

      if (session?.user) {
        setUser(session.user);
        await checkUserProfile(session.user);
      } else {
        setUser(null);
        setUserRole(null);
        setProfileComplete(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const getSession = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await checkUserProfile(session.user);
      }
    } catch (error) {
      console.error("Error getting session:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkUserProfile = async (authUser) => {
    try {
      // use your existing function to get user role
      const { data: role, error: roleError } = await supabase.rpc(
        "get_current_user_role"
      );

      if (roleError) {
        console.error("Error getting user role:", roleError);
        return;
      }

      setUserRole(role);

      // Check if profile is complete using your function
      const { data: profileData, error: profileError } = await supabase.rpc(
        "is_user_profile_complete"
      );

      if (profileError) {
        console.error("Error checking profile:", profileError);
        return;
      }

      setProfileComplete(profileData?.complete || false);

      // Store in metadata for easy access
      const metadata = authUser.user_metadata || {};
      metadata.role = role;
      metadata.profile_complete = profileData?.complete || false;
    } catch (error) {
      console.error("Error checking user profile:", error);
    }
  };

  const signUpUser = async (userData) => {
    setLoading(true);
    setError(null);
    const result = await authService.signUpUser(userData);

    if (result?.error) setError(result?.error);

    setLoading(false);
    return result;
  };

  const staffInvitation = async (inviteData) => {
    setLoading(true);
    setError(null);

    const result = await authService.staffInvitation(inviteData);

    if (result?.error) setError(result?.error);

    setLoading(false);
    return result;
  };

  const adminInvitation = async (inviteData) => {
    setLoading(true);
    setError(null);

    const result = await authService.adminInvitation(inviteData);

    if (result?.error) setError(result?.error);

    setLoading(false);
    return result;
  };

  const resetPassword = async (email) => {
    setLoading(true);
    setError(null);

    const result = await authService.resetPassword(email);

    if (result?.error) setError(result?.error);

    setLoading(false);
    return result;
  };

  const updatePassword = async (newPassword) => {
    setLoading(true);
    setError(null);

    const result = await authService.updatePassword(newPassword);

    if (result?.error) setError(result?.error);

    setLoading(false);
    return result;
  };

  const isVerifiedEmail = !!user?.email_confirmed_at;
  const isVerifiedPhone = !!user?.phone_confirmed_at;

  const isPatient = () => userRole === "patient";
  const isStaff = () => userRole === "staff";
  const isAdmin = () => userRole === "admin";

  const getVerificationStep = () => {
    if (!user) return null;
    if (!profileComplete) {
      if (!isVerifiedEmail) return "verify-email";
      if ((isStaff() || isAdmin()) && !isVerifiedPhone) return "verify-phone";
      return "complete-profile";
    }
    return null;
  };

  const value = {
    // state
    user,
    userRole,
    loading,
    error,
    profileComplete,

    // auth verification
    isVerifiedEmail,
    isVerifiedPhone,

    // auth action
    signUpUser,
    staffInvitation,
    adminInvitation,
    resetPassword,
    updatePassword,
    checkUserProfile,
    getVerificationStep,

    // auth roles
    isPatient,
    isStaff,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
