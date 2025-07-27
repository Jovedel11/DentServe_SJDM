import { createBrowserRouter } from "react-router-dom";
import PublicLayout from "./app/public/layout/PublicLayout";
import ErrorPage from "./core/components/ErrorPage";
import Home from "./app/public/pages/Home";
import About from "./app/public/pages/About";
import Services from "./app/public/pages/Service";
import Contact from "./app/public/pages/Contact";

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/about",
        element: <About />,
      },
      {
        path: "/services",
        element: <Services />,
      },
      {
        path: "/contact",
        element: <Contact />,
      },
    ],
  },
]);
