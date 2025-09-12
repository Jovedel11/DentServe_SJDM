import { lazy } from "react";
import { createBrowserRouter, Outlet } from "react-router-dom";
import withSuspense from "./core/components/withSuspense";
import RouteGuard from "./core/routes/RouteGuard";
import { useVerificationMonitor } from "@/auth/hooks/useVerificationMonitor";
import {
  useNavigationManager,
  UnauthorizedWarning,
} from "@/core/contexts/NavigationManager";
import { RouterErrorBoundary } from "./core/components/ErrorFolder/ErrorBoundary";
import { NetworkMonitor } from "./core/components/NetworkMonitor";
import { StyleTransitionManager } from "./core/components/StyleTransitionManager";

const AppLayout = () => {
  useVerificationMonitor();
  const { showUnauthorizedWarning, warningMessage, dismissWarning } =
    useNavigationManager();

  return (
    <NetworkMonitor>
      <StyleTransitionManager>
        <UnauthorizedWarning
          showWarning={showUnauthorizedWarning}
          message={warningMessage}
          onDismiss={dismissWarning}
        />
        <Outlet />
      </StyleTransitionManager>
    </NetworkMonitor>
  );
};

// Simple lazy loading without complex error handling
const PublicLayout = lazy(() => import("./public/layout/PublicLayout"));

// Error pages
import ErrorPage from "./core/components/ErrorFolder/ErrorPage";
import UnauthorizedPage from "./core/components/ErrorFolder/UnauthorizedPage";

// Public pages
const Home = lazy(() => import("./public/pages/Home"));
const About = lazy(() => import("./public/pages/About"));
const Service = lazy(() => import("./public/pages/Service"));
const Contact = lazy(() => import("./public/pages/Contact"));

// Auth pages
const Login = lazy(() => import("./auth/Login.jsx"));
const Signup = lazy(() => import("./auth/Signup"));
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

// Layouts
const PatientLayout = lazy(() => import("./app/patient/layout/PatientLayout"));
const StaffLayout = lazy(() => import("./app/staff/layout/StaffLayout"));
const AdminLayout = lazy(() => import("./app/admin/layout/AdminLayout"));

// Patient pages
const PatientDashboard = lazy(() =>
  import("./app/patient/pages/PatientDashboard")
);
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
const ClinicList = lazy(() => import("@/app/patient/pages/AllClinics"));
const Dentist = lazy(() => import("@/app/patient/pages/Dentist"));

// Staff pages
const StaffDashboard = lazy(() => import("@/app/staff/pages/StaffDashboard"));
const ManageAppointments = lazy(() =>
  import("@/app/staff/pages/ManageAppointments")
);
const StaffHistory = lazy(() =>
  import("@/app/staff/pages/StaffAppointmentHistory")
);
const ClinicAnalytics = lazy(() => import("@/app/staff/pages/ClinicAnalytics"));
const ClinicTeam = lazy(() => import("@/app/staff/pages/ClinicTeam"));
const FeedbackManagement = lazy(() =>
  import("@/app/staff/pages/FeedbackManagement")
);
const ClinicSettings = lazy(() => import("@/app/staff/pages/ClinicSettings"));
const Help = lazy(() => import("@/app/staff/pages/Help"));

// Admin pages
const AdminDashboard = lazy(() => import("@/app/admin/pages/AdminDashboard"));
const UIManagement = lazy(() => import("@/app/admin/pages/UIManagement"));
const UserManagement = lazy(() => import("@/app/admin/pages/UserManagement"));
const UserRecords = lazy(() => import("@/app/admin/pages/UserRecords"));

// Simple route creation
const createProtectedRoute = (allowedRoles, LayoutComponent, children) => ({
  element: (
    <RouteGuard allowedRoles={allowedRoles}>
      {withSuspense(LayoutComponent)}
    </RouteGuard>
  ),
  errorElement: <RouterErrorBoundary />,
  children,
});

export const router = createBrowserRouter([
  {
    element: (
      <NetworkMonitor>
        <AppLayout />
      </NetworkMonitor>
    ),
    errorElement: <RouterErrorBoundary />,
    children: [
      // Public routes
      {
        element: withSuspense(PublicLayout),
        errorElement: <RouterErrorBoundary />,
        children: [
          { index: true, element: withSuspense(Home) },
          { path: "about", element: withSuspense(About) },
          { path: "services", element: withSuspense(Service) },
          { path: "contact", element: withSuspense(Contact) },
          { path: "login", element: withSuspense(Login) },
          { path: "signup", element: withSuspense(Signup) },
          { path: "forgot-password", element: withSuspense(ForgotPassword) },
        ],
      },

      // Auth routes
      { path: "auth-callback", element: withSuspense(AuthCallback) },
      { path: "reset-password", element: withSuspense(ResetPassword) },
      { path: "verify-email", element: withSuspense(EmailVerification) },
      { path: "verify-phone", element: withSuspense(PhoneVerification) },
      { path: "complete-profile", element: withSuspense(CompleteProfile) },
      { path: "change-password", element: withSuspense(ResetPassword) },

      // Protected routes
      {
        path: "patient",
        ...createProtectedRoute(["patient"], PatientLayout, [
          { path: "dashboard", element: withSuspense(PatientDashboard) },
          {
            path: "appointments",
            children: [
              { index: true, element: withSuspense(BookAppointment) },
              { path: "book", element: withSuspense(BookAppointment) },
              { path: "upcoming", element: withSuspense(UpcomingAppointments) },
              { path: "history", element: withSuspense(AppointmentHistory) },
            ],
          },
          {
            path: "clinics",
            children: [
              { index: true, element: withSuspense(MapView) },
              { path: "map", element: withSuspense(MapView) },
              { path: "list", element: withSuspense(ClinicList) },
            ],
          },
          { path: "dentists", element: withSuspense(Dentist) },
          { path: "feedbacks", element: withSuspense(PatientFeedback) },
          { path: "profile", element: withSuspense(PatientProfile) },
          { path: "settings", element: withSuspense(PatientSettings) },
          { path: "help", element: withSuspense(PatientHelp) },
        ]),
      },

      {
        path: "staff",
        ...createProtectedRoute(["staff"], StaffLayout, [
          { path: "dashboard", element: withSuspense(StaffDashboard) },
          {
            path: "manage-appointments",
            element: withSuspense(ManageAppointments),
          },
          {
            path: "appointment-history",
            element: withSuspense(StaffHistory),
          },
          { path: "clinic-analytics", element: withSuspense(ClinicAnalytics) },
          { path: "team", element: withSuspense(ClinicTeam) },
          { path: "feedbacks", element: withSuspense(FeedbackManagement) },
          { path: "settings", element: withSuspense(ClinicSettings) },
          { path: "help", element: withSuspense(Help) },
        ]),
      },

      {
        path: "admin",
        ...createProtectedRoute(["admin"], AdminLayout, [
          { path: "dashboard", element: withSuspense(AdminDashboard) },
          { path: "ui-management", element: withSuspense(UIManagement) },
          {
            path: "users-management",
            children: [
              { index: true, element: withSuspense(UserManagement) },
              { path: "records", element: withSuspense(UserRecords) },
            ],
          },
        ]),
      },

      { path: "unauthorized", element: <UnauthorizedPage /> },
    ],
  },
  {
    path: "*",
    element: <ErrorPage />,
  },
]);
