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

  // Prevent duplicate requests
  const lastFetchTime = useRef({ profile: 0, authStatus: 0 });
  const refreshTimeout = useRef(null);

  useEffect(() => {
    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔄 Auth state changed:", event, session?.user?.email);

      if (session?.user) {
        setSession(session);
        setUser(session.user);
        console.log("✅ User logged in:", session.user.email);
        handleRefreshAuthStatus(session.user.id);
      } else {
        console.log("🚪 User logged out");
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
    // Listen for storage changes (when another tab logs out)
    const handleStorageChange = (e) => {
      // If the Supabase session was cleared in another tab
      if (e.key === "sb-oswcjyrerzlfsnztqqwf-auth-token" && !e.newValue) {
        console.log("⚠️ Session cleared in another tab, logging out...");
        // Force logout in this tab too
        window.location.href = "/login";
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (!user || !isInitialized) return;
    loadProfile(user.id);
  }, [user, isInitialized]);

  useEffect(() => {
    if (!user || !isInitialized) return;

    loadDashboardData(user.id, true);

    // Refresh dashboard data every 15 minutes
    const interval = setInterval(() => {
      loadDashboardData(user.id, false);
    }, 15 * 60 * 1000);

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
      console.error("❌ Error initializing auth:", error);
      setError("Failed to initialize authentication");
    } finally {
      setLoading(false);
      setIsInitialized(true);
    }
  };

  // Prevent spam calls with timeout
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
        return; // Prevent spam calls
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
      console.error("❌ Error refreshing auth status:", error);
      setError("Failed to get authentication status");
    }
  };

  const loadProfile = async (userId) => {
    if (!userId) return;

    try {
      // Spam prevention
      const now = Date.now();
      if (now - lastFetchTime.current.profile < 3000) {
        return;
      }
      lastFetchTime.current.profile = now;

      setLoading(true);
      const profile = await fetchUserProfile(userId);
      setProfile(profile);
    } catch (err) {
      console.error("❌ Error fetching profile:", err);
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async (userId) => {
    if (!userId) return null;

    // Single call - get_user_complete_profile handles auth.uid() lookup internally
    const { data: profile, error: profileError } = await supabase.rpc(
      "get_user_complete_profile"
    );

    if (profileError) throw profileError;
    return profile;
  };

  const handleRefreshProfile = async () => {
    if (!user) return;

    // Reset the timer to allow immediate fetch
    lastFetchTime.current.profile = 0;
    await loadProfile(user.id);
  };

  const resetAuthState = () => {
    setUser(null);
    setSession(null);
    setAuthStatus(null);
    setError(null);
    setProfile(null);
    setDashboardData(null);

    // Reset timers
    lastFetchTime.current = { profile: 0, authStatus: 0 };
  };

  // Auth status derived values - SIMPLIFIED (no phone verification)
  const userRole = authStatus?.user_role;
  const isEmailVerified = authStatus?.email_verified || false;
  const canAccessApp = authStatus?.can_access_app || false;
  const nextStep = authStatus?.next_step;

  console.log("🔍 AuthProvider Debug:");
  console.log("  → user:", user?.email);
  console.log("  → authStatus:", authStatus);
  console.log("  → userRole:", userRole);
  console.log("  → isEmailVerified:", isEmailVerified);
  console.log("  → canAccessApp:", canAccessApp);
  console.log("  → profileData: ", profile);

  // Role checks
  const isPatient = useMemo(
    () => authStatus?.user_role === "patient",
    [authStatus?.user_role]
  );
  const isStaff = useMemo(
    () => authStatus?.user_role === "staff",
    [authStatus?.user_role]
  );
  const isAdmin = useMemo(
    () => authStatus?.user_role === "admin",
    [authStatus?.user_role]
  );

  // Wrap auth actions with loading/error handling
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

  // Auth actions (simplified - no phone verification)
  const signUpUser = wrapAuthAction("sign up", authService.signUpUser);
  const inviteStaff = wrapAuthAction(
    "invite staff",
    authService.staffInvitation
  );
  const inviteAdmin = wrapAuthAction(
    "invite admin",
    authService.adminInvitation
  );

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
      console.log("✅ Sign out successful");
      return { success: true };
    } catch (error) {
      console.error("❌ Sign out error:", error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  const updatePatientProfile = async (profileData, patientData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authService.updatePatientProfile(
        profileData,
        patientData
      );
      if (result.success) {
        await handleRefreshProfile();
        return { success: true, data: result.data };
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

  const updateStaffProfile = async (
    profileData,
    staffData,
    clinicData,
    servicesData,
    doctorsData
  ) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authService.updateStaffProfile(
        profileData,
        staffData,
        clinicData,
        servicesData,
        doctorsData
      );
      if (result.success) {
        await handleRefreshProfile();
        return { success: true, data: result.data };
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

  const updateAdminProfile = async (profileData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authService.updateAdminProfile(profileData);
      if (result.success) {
        await handleRefreshProfile();
        return { success: true, data: result.data };
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

      // Derived state (simplified - no phone verification)
      userRole,
      isEmailVerified,
      canAccessApp,
      nextStep,

      // Role checks
      isPatient,
      isStaff,
      isAdmin,

      // Profile and dashboard
      profile,
      dashboardData,

      // Actions (simplified - no phone verification)
      signUpUser,
      inviteStaff,
      inviteAdmin,
      signOut,
      refreshAuthStatus,
      updatePassword,
      resetPassword,
      updatePatientProfile,
      updateStaffProfile,
      updateAdminProfile,
      handleRefreshProfile,
      loadDashboardData,
      fetchUserProfile,

      // Navigation
      useRedirectPath,
    }),
    [
      session,
      user,
      authStatus,
      loading,
      error,
      isInitialized,
      userRole,
      isEmailVerified,
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
