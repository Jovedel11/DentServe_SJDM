import { useAuth } from "@/auth/context/AuthProvider";  

export const useRedirectPath = () => {
  const { user, authStatus, nextStep, userRole } = useAuth();

  if (!user || !authStatus) return "/login";

  switch (nextStep) {
    case "verify_email":
      return "/verify-email";
    case "verify_phone":
      return "/verify-phone";
    case "complete_staff_info":
      return "/staff/complete-profile";
    case "complete_profile":
      return "/complete-profile";
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
          return "/dashboard";
      }
    default:
      return "/complete-verification";
  }
};