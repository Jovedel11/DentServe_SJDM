import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/context/AuthProvider";

export const useNavigationManager = () => {
  const { user, userRole, authStatus, loading, isInitialized, canAccessApp } =
    useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showUnauthorizedWarning, setShowUnauthorizedWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");

  const lastNavigation = useRef({ path: "", time: 0 });
  const warningTimeoutRef = useRef(null);

  // Clear warning and timeouts on auth changes
  useEffect(() => {
    if (!user) {
      setShowUnauthorizedWarning(false);
      setWarningMessage("");
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
        warningTimeoutRef.current = null;
      }
    }
  }, [user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, []);

  const smartNavigate = useCallback(
    (targetPath, options = {}) => {
      const {
        reason = "navigation",
        showWarning = false,
        replace = false,
      } = options;
      const now = Date.now();
      const currentPath = location.pathname;

      // Prevent rapid duplicate navigations
      if (
        lastNavigation.current.path === targetPath &&
        now - lastNavigation.current.time < 1000
      ) {
        return false;
      }

      // Don't navigate if already on target path
      if (currentPath === targetPath) return false;

      lastNavigation.current = { path: targetPath, time: now };

      if (showWarning) {
        const messages = {
          cross_role_access: "You don't have permission to access this area.",
          authentication_required: "Please sign in to access this page.",
          default: "Redirecting...",
        };

        if (location.pathname !== "login") return;

        setWarningMessage(messages[reason] || messages.default);
        setShowUnauthorizedWarning(true);

        // Clear any existing timeout
        if (warningTimeoutRef.current) {
          clearTimeout(warningTimeoutRef.current);
        }

        warningTimeoutRef.current = setTimeout(() => {
          setShowUnauthorizedWarning(false);
          navigate(targetPath, { replace });
        }, 2500);
      } else {
        navigate(targetPath, { replace });
      }

      return true;
    },
    [location.pathname, navigate]
  );

  const dismissWarning = useCallback(() => {
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    setShowUnauthorizedWarning(false);
    setWarningMessage("");
  }, []);

  // Simplified navigation logic - only run when necessary
  useEffect(() => {
    if (!isInitialized || loading) return;

    const currentPath = location.pathname;

    // Skip verification routes
    const verificationRoutes = [
      "/verify-email",
      "/verify-phone",
      "/complete-profile",
      "/change-password",
    ];
    if (
      verificationRoutes.some((route) => currentPath.startsWith(route)) &&
      user &&
      !canAccessApp
    ) {
      return;
    }

    // Handle authenticated users
    if (user && authStatus) {
      const { user_role } = authStatus;

      // Redirect authenticated users from public pages
      if (canAccessApp && user_role) {
        const publicPages = [
          "/",
          "/about",
          "/services",
          "/contact",
          "/login",
          "/signup",
          "/forgot-password",
        ];

        if (publicPages.includes(currentPath)) {
          const dashboards = {
            patient: "/patient/dashboard",
            staff: "/staff/dashboard",
            admin: "/admin/dashboard",
          };

          const targetDashboard = dashboards[user_role];
          if (targetDashboard) {
            smartNavigate(targetDashboard, { replace: true });
            return;
          }
        }

        // Handle cross-role navigation
        const roleRoutes = {
          patient: "/patient/",
          staff: "/staff/",
          admin: "/admin/",
        };

        for (const [role, routePrefix] of Object.entries(roleRoutes)) {
          if (role !== user_role && currentPath.startsWith(routePrefix)) {
            smartNavigate("/unauthorized", {
              reason: "cross_role_access",
              showWarning: true,
              replace: true,
            });
            return;
          }
        }
      }

      // Handle verification flow
      if (
        !canAccessApp &&
        authStatus?.next_step &&
        !verificationRoutes.some((route) => currentPath.startsWith(route))
      ) {
        smartNavigate(authStatus.next_step, { replace: true });
      }
    }
    // Handle unauthenticated users
    else if (!user) {
      const protectedPrefixes = ["/patient/", "/staff/", "/admin/"];
      if (protectedPrefixes.some((prefix) => currentPath.startsWith(prefix))) {
        smartNavigate("/login", {
          reason: "authentication_required",
          showWarning: true,
          replace: true,
        });
      }
    }
  }, [
    user,
    userRole,
    authStatus,
    loading,
    isInitialized,
    canAccessApp,
    location.pathname,
    smartNavigate,
  ]);

  return {
    showUnauthorizedWarning,
    warningMessage,
    dismissWarning,
  };
};

// Simplified Warning Component
export const UnauthorizedWarning = ({ showWarning, message, onDismiss }) => {
  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mx-4 max-w-sm w-full shadow-xl">
        <div className="text-center">
          <div className="text-3xl mb-3">🔒</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Access Restricted
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
            {message}
          </p>
          <button
            onClick={onDismiss}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Stay Here
          </button>
        </div>
      </div>
    </div>
  );
};
