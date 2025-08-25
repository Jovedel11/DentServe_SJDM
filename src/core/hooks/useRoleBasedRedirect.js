import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/context/AuthProvider";
import { useRedirectPath } from "@/auth/hooks/useRedirectPath";

export const useRoleBasedRedirect = () => {
  const { user, userRole, authStatus, loading, isInitialized } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = useRedirectPath();
  const lastRedirect = useRef({ path: '', time: 0 });

  // Simple navigation helper
  const navigateIfNeeded = (path, options = {}) => {
    const now = Date.now();
    
    // Prevent rapid redirects
    if (lastRedirect.current.path === path && 
        now - lastRedirect.current.time < 1500) {
      return;
    }

    lastRedirect.current = { path, time: now };
    navigate(path, options);
  };

  useEffect(() => {
    if (!isInitialized || loading) return;

    const currentPath = location.pathname;

    // Skip if on verification routes
    const verificationRoutes = ['/verify-email', '/verify-phone', '/complete-profile', '/change-password'];
    if (verificationRoutes.some(route => currentPath.startsWith(route)) && 
        user && !authStatus?.can_access_app) {
      return;
    }

    // Redirect authenticated users from public pages to their dashboard
    if (user && authStatus?.can_access_app && userRole) {
      const publicPages = ['/', '/about', '/services', '/contact', '/login', '/signup', '/forgot-password'];
      
      if (publicPages.includes(currentPath)) {
        const dashboardRoutes = {
          patient: '/patient/dashboard',
          staff: '/staff/dashboard',
          admin: '/admin/dashboard',
        };

        const targetDashboard = dashboardRoutes[userRole];
        if (targetDashboard) {
          console.log(`Redirecting ${userRole} to dashboard`);
          navigateIfNeeded(targetDashboard, { replace: true });
        }
      }

      // Block cross-role navigation
      const roleRoutes = {
        patient: '/patient/',
        staff: '/staff/',
        admin: '/admin/'
      };

      for (const [role, routePrefix] of Object.entries(roleRoutes)) {
        if (role !== userRole && currentPath.startsWith(routePrefix)) {
          console.log(`Blocking cross-role navigation`);
          navigateIfNeeded("/unauthorized", { replace: true });
          return;
        }
      }
    }

    // Handle verification redirects
    if (user && !authStatus?.can_access_app && redirectPath && currentPath !== redirectPath) {
      console.log("Redirecting to verification step");
      navigateIfNeeded(redirectPath, { replace: true });
    }

    // Handle unauthenticated users on protected routes
    if (!user) {
      const protectedPrefixes = ['/patient/', '/staff/', '/admin/'];
      if (protectedPrefixes.some(prefix => currentPath.startsWith(prefix))) {
        console.log("Redirecting unauthenticated user to login");
        navigateIfNeeded("/login", { replace: true });
      }
    }

  }, [user, userRole, authStatus, loading, isInitialized, redirectPath, location.pathname]);
};