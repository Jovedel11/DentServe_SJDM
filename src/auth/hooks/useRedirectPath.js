// src/auth/hooks/useRedirectPath.js (updated)
import { useAuth } from "@/auth/context/AuthProvider";  

export const useRedirectPath = () => {
  const { user, authStatus, nextStep, userRole } = useAuth();

  if (!user || !authStatus) return "/login";

  switch (nextStep) {
    case "verify_email":
      return "/verify-email";
    case "complete_staff_profile":
      return "/staff/complete-profile";
    case "dashboard":
      // Role-based dashboard routing
      switch (userRole) {
        case "patient":
          return "/patient/dashboard";
        case "staff":
          return "/staff/dashboard";
        case "admin":
          return "/admin/dashboard";
        default:
          return "/login";
      }
    default:
      // If user is verified but no specific next step, go to dashboard
      if (authStatus.can_access_app) {
        switch (userRole) {
          case "patient":
            return "/patient/dashboard";
          case "staff":
            return "/staff/dashboard";
          case "admin":
            return "/admin/dashboard";
          default:
            return "/login";
        }
      }
      return "/verify-email";
  }
};