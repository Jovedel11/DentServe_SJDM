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
const Dashboard = lazy(() => import("./app/patient/pages/Dashboard"));
const BookAppointment = lazy(() =>
  import("./app/patient/pages/BookAppointment")
);
const UpcomingAppointments = lazy(() =>
  import("./app/patient/pages/UpcomingAppointments")
);
const PatientProfile = lazy(() => import("@/app/patient/pages/PatientProfile"));
const PatientSettings = lazy(() =>
  import("@/app/patient/pages/PatientSettings")
);
const PatientHelp = lazy(() => import("@/app/patient/pages/PatientHelp"));
const AppointmentHistory = lazy(() =>
  import("@/app/patient/pages/AppointmentHistory")
);
const PatientFeedback = lazy(() =>
  import("@/app/patient/pages/PatientFeedback")
);
const MapView = lazy(() => import("@/app/patient/pages/MapView"));

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
          <AuthGuard requiredRole="patient">
            {withSuspense(PatientLayout)}
          </AuthGuard>
        ),
        children: [{ index: true, element: withSuspense(Dashboard) }],
      },
      {
        path: "/patient/appointments",
        element: (
          <AuthGuard requiredRole="patient">
            {withSuspense(PatientLayout)}
          </AuthGuard>
        ),
        children: [
          { index: true, element: withSuspense(BookAppointment) },
          { path: "book", element: withSuspense(BookAppointment) },
          { path: "upcoming", element: withSuspense(UpcomingAppointments) },
          { path: "history", element: withSuspense(AppointmentHistory) },
        ],
      },
      {
        path: "/patient/dentists",
        element: (
          <AuthGuard requiredRole="patient">
            {withSuspense(PatientLayout)}
          </AuthGuard>
        ),
        children: [],
      },
      {
        path: "/patient/clinics",
        element: (
          <AuthGuard requiredRole="patient">
            {withSuspense(PatientLayout)}
          </AuthGuard>
        ),
        children: [
          { index: true, element: withSuspense(MapView) },
          { path: "map", element: withSuspense(MapView) },
        ],
      },
      {
        path: "/patient/feedbacks",
        element: (
          <AuthGuard requiredRole="patient">
            {withSuspense(PatientLayout)}
          </AuthGuard>
        ),
        children: [{ index: true, element: withSuspense(PatientFeedback) }],
      },
      {
        path: "/patient/profile",
        element: (
          <AuthGuard requiredRole="patient">
            {withSuspense(PatientLayout)}
          </AuthGuard>
        ),
        children: [{ index: true, element: withSuspense(PatientProfile) }],
      },
      {
        path: "/patient/settings",
        element: (
          <AuthGuard requiredRole="patient">
            {withSuspense(PatientLayout)}
          </AuthGuard>
        ),
        children: [{ index: true, element: withSuspense(PatientSettings) }],
      },
      {
        path: "/patient/help",
        element: (
          <AuthGuard requiredRole="patient">
            {withSuspense(PatientLayout)}
          </AuthGuard>
        ),
        children: [{ index: true, element: withSuspense(PatientHelp) }],
      },
      {
        path: "/staff/dashboard",
        element: (
          <AuthGuard requiredRole="staff">
            {withSuspense(StaffLayout)}
          </AuthGuard>
        ),
      },
      {
        path: "/admin/dashboard",
        element: (
          <AuthGuard requiredRole="admin">
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
