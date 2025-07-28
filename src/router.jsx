import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import withSuspense from "./core/components/withSuspense";

const PublicLayout = lazy(() => import("./app/public/layout/PublicLayout"));
const ErrorPage = lazy(() => import("./core/components/ErrorPage"));
const Home = lazy(() => import("./app/public/pages/Home"));
const About = lazy(() => import("./app/public/pages/About"));
const Service = lazy(() => import("./app/public/pages/Service"));
const Contact = lazy(() => import("./app/public/pages/Contact"));
const Login = lazy(() => import("./auth/login/Login"));
const Signup = lazy(() => import("./auth/signup/Signup"));

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
]);
