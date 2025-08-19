import React from "react";
import { ThemeProvider } from "@/core/contexts/ThemeProvider";
import { Outlet } from "react-router-dom";
import Dashboard from "@/app/staff/pages/Dashboard";

const StaffLayout = () => {
  return (
    <ThemeProvider defaultTheme="light" storageKey="dentserve-theme">
      <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
        <Dashboard>
          <Outlet />
        </Dashboard>
      </div>
    </ThemeProvider>
  );
};

export default StaffLayout;
