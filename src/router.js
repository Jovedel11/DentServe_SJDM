import { createBrowserRouter } from "react-router-dom";
import Navbar from "./app/public/components/Navbar";

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navbar />
  }
])
