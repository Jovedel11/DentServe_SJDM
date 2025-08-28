import {
  useState,
  useEffect,
  createContext,
  useContext,
  useMemo,
  useRef,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import { authService } from "../hooks/authService";
import { useVerification } from "../hooks/useVerification";
import { useRedirectPath } from "../hooks/useRedirectPath";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(undefined);
  const [authStatus, setAuthStatus] = useState(null);
  const [profile, setProfile] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  //prevent duplicate requests
  const lastFetchTime = useRef({ profile: 0, authStatus: 0 });
  const refreshTimeout = useRef(null);

  useEffect(() => {
    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.email);

      if (session?.user) {
        setSession(session);
        setUser(session.user);
        console.log("User logged in:", session.user.email);
        handleRefreshAuthStatus(session.user.id);
      } else {
        resetAuthState();
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      if (refreshTimeout.current) clearTimeout(refreshTimeout.current);
    };
  }, []);

  useEffect(() => {
    if (!user || !isInitialized) return;
    loadProfile(user.id);
  }, [user, isInitialized]);

  useEffect(() => {
    if (!user || !isInitialized) return;

    loadDashboardData(user.id, true);

    const interval = setInterval(() => {
      loadDashboardData(user.id, false);
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user, isInitialized]);

  const initializeAuth = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setSession(session);
        setUser(session.user);
        await refreshAuthStatus(session.user.id);
      }
    } catch (error) {
      console.error("Error initializing auth:", error);
      setError("Failed to initialize authentication");
    } finally {
      setLoading(false);
      setIsInitialized(true);
    }
  };

  // prevent spam calls
  const handleRefreshAuthStatus = (userId) => {
    if (refreshTimeout.current) {
      clearTimeout(refreshTimeout.current);
    }

    refreshTimeout.current = setTimeout(() => {
      refreshAuthStatus(userId);
    }, 500);
  };

  const refreshAuthStatus = async (authUserId = null) => {
    try {
      const targetId = authUserId || user?.id;
      if (!targetId) return;

      const now = Date.now();
      if (now - lastFetchTime.current.authStatus < 2000) {
        return;
      }
      lastFetchTime.current.authStatus = now;

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

  const loadProfile = async (userId) => {
    if (!userId) return;

    try {
      // spam prevention
      const now = Date.now();
      if (now - lastFetchTime.current.profile < 3000) {
        return;
      }
      lastFetchTime.current.profile = now;

      setLoading(true);
      const profile = await fetchUserProfile(userId);
      setProfile(profile);
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError("Failed to load profile");
    } finally {
      setLoading(false);
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

    // reset the timer to allow immediate fetch
    lastFetchTime.current.profile = 0;
    await loadProfile(user.id);
  };

  const resetAuthState = () => {
    setUser(null);
    setAuthStatus(null);
    setError(null);
    setProfile(null);
    setDashboardData(null);

    // reset timers
    lastFetchTime.current = { profile: 0, authStatus: 0 };
  };

  // auth status derived values
  const userRole = authStatus?.user_role;
  const isEmailVerified = authStatus?.email_verified || false;
  const isPhoneVerified = authStatus?.phone_verified || false;
  const phoneRequired = authStatus?.phone_required || false;
  const canAccessApp = authStatus?.can_access_app || false;
  const nextStep = authStatus?.next_step;

  console.log("AuthProvider -> user:", user);
  console.log("AuthProvider -> authStatus:", authStatus);
  console.log("AuthProvider -> userRole:", userRole);
  console.log("AuthProvider -> profile:", profile);

  // role checks
  const isPatient = () => userRole === "patient";
  const isStaff = () => userRole === "staff";
  const isAdmin = () => userRole === "admin";

  // wrap auth actions with loading/error handling
  const wrapAuthAction = (actionName, actionFunction) => {
    return async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const result = await actionFunction(...args);
        if (result.error) setError(result.error);
        return result;
      } catch (error) {
        const errorMessage = error.message || `Failed to ${actionName}`;
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    };
  };

  // Auth actions
  const signUpUser = wrapAuthAction("sign up", authService.signUpUser);
  const inviteStaff = wrapAuthAction(
    "invite staff",
    authService.staffInvitation
  );
  const inviteAdmin = wrapAuthAction(
    "invite admin",
    authService.adminInvitation
  );

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
        handleRefreshAuthStatus();
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
        handleRefreshAuthStatus();
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
        handleRefreshAuthStatus();
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

  const updateProfile = async (
    profileData,
    roleSpecificData = {},
    userId = null
  ) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authService.updateProfile(
        profileData,
        roleSpecificData,
        userId
      );
      if (result.success) {
        await handleRefreshProfile();
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || "Failed to update profile",
        };
      }
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async (userId, isShowLoading = true) => {
    if (!userId) return;

    if (isShowLoading) setLoading(true);
    setError(null);

    try {
      const result = await authService.getDashboardData(userId);

      if (result.success) {
        setDashboardData(result.data);
      } else {
        throw new Error(result.error || "Failed to fetch dashboard data");
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
      session,
      user,
      authStatus,
      loading,
      error,
      isInitialized,

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

      // Profile and dashboard
      profile,
      dashboardData,

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
      updateProfile,
      handleRefreshProfile,
      loadDashboardData,
      fetchUserProfile,

      // Navigation
      useRedirectPath,
    }),
    [
      user,
      authStatus,
      loading,
      error,
      isInitialized,
      userRole,
      isEmailVerified,
      isPhoneVerified,
      phoneRequired,
      canAccessApp,
      nextStep,
      profile,
      dashboardData,
      useRedirectPath,
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
