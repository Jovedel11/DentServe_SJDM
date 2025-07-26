import { createBrowserRouter } from "react-router-dom";
import PublicLayout from "./app/public/layout/PublicLayout";
import ErrorPage from "./core/components/ErrorPage";
import Home from "./app/public/pages/Home";

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
    ],
  },
]);
