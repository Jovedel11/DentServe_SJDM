import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import withSuspense from "./core/components/withSuspense";
import { RoleBasedRoute } from "./core/routes/RoleBasedRoute";

const PublicLayout = lazy(() => import("./app/public/layout/PublicLayout"));
const ErrorPage = lazy(() => import("./core/components/ErrorPage"));
const Home = lazy(() => import("./app/public/pages/Home"));
const About = lazy(() => import("./app/public/pages/About"));
const Service = lazy(() => import("./app/public/pages/Service"));
const Contact = lazy(() => import("./app/public/pages/Contact"));
const Login = lazy(() => import("./auth/login/Login"));
const Signup = lazy(() => import("./auth/signup/Signup"));
const PatientLayout = lazy(() => import("./app/patient/layout/PatientLayout"));
const AuthCallback = lazy(() => import("./auth/components/AuthCallback"));
const ForgotPassword = lazy(() => import("./auth/components/ForgotPassword"));
const ResetPassword = lazy(() => import("./auth/components/ResetPassword"));
const PhoneVerification = lazy(() =>
  import("./auth/components/PhoneVerification")
);
const EmailVerification = lazy(() =>
  import("./auth/components/EmailVerification")
);
const CompleteProfile = lazy(() => import("./auth/components/CompleteProfile"));

export const router = createBrowserRouter([
  {
    element: withSuspense(PublicLayout),
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/",
        element: withSuspense(Home),
      },
      {
        path: "about",
        element: withSuspense(About),
      },
      {
        path: "services",
        element: withSuspense(Service),
      },
      {
        path: "contact",
        element: withSuspense(Contact),
      },
      {
        path: "login",
        element: withSuspense(Login),
      },
      {
        path: "signup",
        element: withSuspense(Signup),
      },
    ],
  },
  {
    path: "auth/callback",
    errorElement: <ErrorPage />,
    element: withSuspense(AuthCallback),
  },
  {
    path: "forgot-password",
    errorElement: <ErrorPage />,
    element: withSuspense(ForgotPassword),
  },
  {
    path: "reset-password",
    errorElement: <ErrorPage />,
    element: withSuspense(ResetPassword),
  },
  {
    path: "verify-phone",
    errorElement: <ErrorPage />,
    element: withSuspense(PhoneVerification),
  },
  {
    path: "verify-email",
    errorElement: <ErrorPage />,
    element: withSuspense(EmailVerification),
  },
  {
    path: "complete-profile",
    errorElement: <ErrorPage />,
    element: withSuspense(CompleteProfile),
  },
  {
    path: "/patient/dashboard",
    element: (
      <RoleBasedRoute allowedRoles={["patient"]}>
        {withSuspense(PatientLayout)}
      </RoleBasedRoute>
    ),
  },
  // {
  //   path: "/staff/dashboard",
  //   element: (
  //     <RoleBasedRoute allowedRoles={["staff"]}>
  //       <StaffLayout />
  //     </RoleBasedRoute>
  //   ),
  // },
  // {
  //   path: "/admin/dashboard",
  //   element: (
  //     <RoleBasedRoute allowedRoles={["admin"]}>
  //       <AdminLayout />
  //     </RoleBasedRoute>
  //   ),
  // },
  {
    path: "/unauthorized",
    element: withSuspense(ErrorPage),
  },
]);
