import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import AuthProvider from "./auth/context/AuthProvider";
import Dashboard from "./app/patient/pages/Dashboard";

function App() {
  return (
    // <AuthProvider>
    //   <RouterProvider router={router} />
    // </AuthProvider>
    <Dashboard />
  );
}

export default App;
