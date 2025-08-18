import Dashboard from "@/app/staff/pages/Dashboard";
import React from "react";
import { ThemeProvider } from "@/core/contexts/ThemeProvider";

const StaffLayout = () => {
  return (
    <ThemeProvider>
      <Dashboard />
    </ThemeProvider>
  );
};

export default StaffLayout;
