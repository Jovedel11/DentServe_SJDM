import React from "react";
import { ThemeProvider } from "@/core/contexts/ThemeProvider";
import Dashboard from "../pages/Dashboard";

const AdminLayout = () => {
  return (
    <ThemeProvider defaultTheme="system" storageKey="admin-ui-theme">
      <Dashboard />
    </ThemeProvider>
  );
};

export default AdminLayout;
