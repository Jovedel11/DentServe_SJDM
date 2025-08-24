import { useState, useEffect, createContext, useContext, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { authService } from "../hooks/authService";
import { useVerification } from "../hooks/useVerification";
import { useRedirectPath } from "../hooks/useRedirectPath";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authStatus, setAuthStatus] = useState(null);
  const [profile, setProfile] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.email);

      if (session?.user) {
        setUser(session.user);
        console.log("User logged in:", session.user.email);
        setTimeout(() => refreshAuthStatus(session.user.id), 1000);
      } else {
        resetAuthState();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      try {
        setLoading(true);
        const profile = await fetchUserProfile(user.id);
        setProfile(profile);
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    loadDashboardData(user.id, true);

    const interval = setInterval(() => {
      loadDashboardData(user.id, false);
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user]);

  const initializeAuth = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await refreshAuthStatus(session.user.id);
      }
    } catch (error) {
      console.error("Error initializing auth:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshAuthStatus = async (authUserId = null) => {
    try {
      const targetId = authUserId || user?.id;
      if (!targetId) return;

      const result = await authService.getAuthStatus(targetId);

      if (result.success) {
        setAuthStatus(result.data);
        setError(null);
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error("Error refreshing auth status:", error);
      setError("Failed to get authentication status");
    }
  };

  const fetchUserProfile = async (userId) => {
    if (!userId) return null;

    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (userError) throw userError;
    if (!userRow) return null;

    const { data: profile, error: profileError } = await supabase.rpc(
      "get_user_complete_profile",
      { p_user_id: userRow.id }
    );

    if (profileError) throw profileError;
    return profile;
  };

  const handleRefreshProfile = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const profile = await fetchUserProfile(user.id);
      setProfile(profile);
    } catch (err) {
      console.error("Error refreshing profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const resetAuthState = () => {
    setUser(null);
    setAuthStatus(null);
    setError(null);
    setProfile(null);
    setDashboardData(null);
  };

  // from auth status
  const userRole = authStatus?.user_role;
  const isEmailVerified = authStatus?.email_verified || false;
  const isPhoneVerified = authStatus?.phone_verified || false;
  const phoneRequired = authStatus?.phone_required || false;
  const canAccessApp = authStatus?.can_access_app || false;
  const nextStep = authStatus?.next_step;

  console.log("AuthGuard -> user:", user);
  console.log("AuthGuard -> authStatus:", authStatus);
  console.log("AuthGuard -> userRole:", userRole);
  console.log("AuthGuard -> profile:", profile);

  // Role checks
  const isPatient = () => userRole === "patient";
  const isStaff = () => userRole === "staff";
  const isAdmin = () => userRole === "admin";

  // Auth actions
  const signUpUser = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authService.signUpUser(userData);
      if (result.error) setError(result.error);
      return result;
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const inviteStaff = async (inviteData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authService.staffInvitation(inviteData);
      if (result.error) setError(result.error);
      return result;
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const inviteAdmin = async (inviteData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authService.adminInvitation(inviteData);
      if (result.error) setError(result.error);
      return result;
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const sendPhoneOTP = async () => {
    setLoading(true);
    try {
      const result = await useVerification.sendPhoneOTP(user?.id);
      if (result.error) setError(result.error);
      return result;
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const verifyPhoneOTP = async (phone, otpCode) => {
    setLoading(true);
    try {
      const result = await useVerification.verifyPhoneOTP(phone, otpCode);
      if (result.success) {
        setTimeout(() => refreshAuthStatus(), 1000);
      }
      if (result.error) setError(result.error);
      return result;
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (newPassword) => {
    setLoading(true);
    try {
      const result = await authService.updatePassword(newPassword);
      if (result.success) {
        setTimeout(() => refreshAuthStatus(), 1000);
      }
      if (result.error) setError(result.error);
      return result;
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email) => {
    setLoading(true);
    try {
      const result = await authService.resetPassword(email);
      if (result.success) {
        setTimeout(() => refreshAuthStatus(), 1000);
      }
      if (result.error) setError(result.error);
      return result;
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      resetAuthState();
      return { success: true };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  const updateProfile = async (profileData, roleSpecificData = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authService.updateProfile(
        profileData,
        roleSpecificData
      );
      if (result.success) {
        await handleRefresh();
        return { success: true };
      } else {
        throw new Error(result.error || "Failed to update profile");
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  //dashboard data
  const loadDashboardData = async (userId, isShowLoading = true) => {
    if (isShowLoading) setLoading(true);
    setError(null);
    try {
      const result = await authService.getDashboardData(userId);

      if (result.success) {
        setDashboardData(result.data);
      } else {
        throw new Error(result.error || "Failed to fetch user list");
      }
    } catch (error) {
      setError(error.message);
    } finally {
      if (isShowLoading) setLoading(false);
    }
  };

  const value = useMemo(
    () => ({
      // Core state
      user,
      authStatus,
      loading,
      error,

      // Derived state
      userRole,
      isEmailVerified,
      isPhoneVerified,
      phoneRequired,
      canAccessApp,
      nextStep,

      // Role checks
      isPatient,
      isStaff,
      isAdmin,

      //users profile
      profile,
      dashboardData,

      // user functions
      updateProfile,
      handleRefreshProfile,

      // Navigation
      useRedirectPath,

      // Actions
      signUpUser,
      inviteStaff,
      inviteAdmin,
      sendPhoneOTP,
      verifyPhoneOTP,
      signOut,
      refreshAuthStatus,
      updatePassword,
      resetPassword,
      fetchUserProfile,
      loadDashboardData,
    }),
    [
      user,
      authStatus,
      loading,
      error,
      userRole,
      isEmailVerified,
      isPhoneVerified,
      phoneRequired,
      canAccessApp,
      nextStep,
      isPatient,
      isStaff,
      isAdmin,
      profile,
      dashboardData,
      useRedirectPath,
      signUpUser,
      inviteStaff,
      inviteAdmin,
      sendPhoneOTP,
      verifyPhoneOTP,
      signOut,
      refreshAuthStatus,
      updatePassword,
      resetPassword,
      fetchUserProfile,
      handleRefreshProfile,
      loadDashboardData,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
