import { lazy } from "react";
import { createBrowserRouter, Outlet } from "react-router-dom";
import withSuspense from "./core/components/withSuspense";
import AuthGuard from "./core/routes/AuthGuard";
import { useVerificationMonitor } from "@/auth/hooks/useVerificationMonitor";
import { useRoleBasedRedirect } from "./core/hooks/useRoleBasedRedirect";

const AuthLayout = () => {
  useVerificationMonitor();
  useRoleBasedRedirect();
  return <Outlet />;
};

const PublicLayout = lazy(() => import("./public/layout/PublicLayout"));
const ErrorPage = lazy(() => import("./core/components/ui/ErrorPage"));
const UnauthorizedPage = lazy(() =>
  import("./core/components/ui/UnauthorizedPage")
);
const Home = lazy(() => import("./public/pages/Home"));
const About = lazy(() => import("./public/pages/About"));
const Service = lazy(() => import("./public/pages/Service"));
const Contact = lazy(() => import("./public/pages/Contact"));
const Login = lazy(() => import("./auth/Login.jsx"));
const Signup = lazy(() => import("./auth/Signup"));
const PatientLayout = lazy(() => import("./app/patient/layout/PatientLayout"));
const AuthCallback = lazy(() => import("./auth/components/AuthCallback"));
const EmailVerification = lazy(() =>
  import("./auth/components/EmailVerification")
);
const ForgotPassword = lazy(() => import("./auth/components/ForgotPassword"));
const PhoneVerification = lazy(() =>
  import("./auth/components/PhoneVerification")
);
const ResetPassword = lazy(() => import("./auth/components/ResetPassword"));
const CompleteProfile = lazy(() => import("./auth/components/CompleteProfile"));
const StaffLayout = lazy(() => import("./app/staff/layout/StaffLayout"));
const AdminLayout = lazy(() => import("./app/admin/layout/AdminLayout"));

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    errorElement: withSuspense(ErrorPage),
    children: [
      // public routes
      {
        element: withSuspense(PublicLayout),
        children: [
          { index: true, element: withSuspense(Home) },
          { path: "about", element: withSuspense(About) },
          { path: "services", element: withSuspense(Service) },
          { path: "contact", element: withSuspense(Contact) },
          { path: "login", element: withSuspense(Login) },
          { path: "signup", element: withSuspense(Signup) },
          { path: "/forgot-password", element: withSuspense(ForgotPassword) },
        ],
      },

      // auth routes
      { path: "/auth-callback", element: withSuspense(AuthCallback) },
      { path: "/reset-password", element: withSuspense(ResetPassword) },

      // verification routes
      { path: "/verify-email", element: withSuspense(EmailVerification) },
      { path: "/verify-phone", element: withSuspense(PhoneVerification) },

      // profile completion
      { path: "/complete-profile", element: withSuspense(CompleteProfile) },
      { path: "/change-password", element: withSuspense(ResetPassword) },

      // protected routes
      {
        path: "/patient/dashboard",
        element: (
          <AuthGuard allowedRoles={["patient"]}>
            {withSuspense(PatientLayout)}
          </AuthGuard>
        ),
      },
      {
        path: "/staff/dashboard",
        element: (
          <AuthGuard allowedRoles={["staff"]}>
            {withSuspense(StaffLayout)}
          </AuthGuard>
        ),
      },
      {
        path: "/admin/dashboard",
        element: (
          <AuthGuard allowedRoles={["admin"]}>
            {withSuspense(AdminLayout)}
          </AuthGuard>
        ),
      },

      // Utility routes
      { path: "/unauthorized", element: withSuspense(UnauthorizedPage) },
      { path: "*", element: withSuspense(ErrorPage) },
    ],
  },
]);
