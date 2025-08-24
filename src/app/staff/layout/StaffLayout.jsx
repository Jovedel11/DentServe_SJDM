import React from "react";
import { ThemeProvider } from "@/core/contexts/ThemeProvider";
import { Outlet } from "react-router-dom";
import { SDashboardLayout } from "../components/layout/staff-dashboard-layout";

const StaffLayout = () => {
  return (
    <ThemeProvider defaultTheme="light" storageKey="dentserve-theme">
      <div className="min-h-screen bg-[#F1FAEE]">
        <SDashboardLayout>
          <Outlet />
        </SDashboardLayout>
      </div>
    </ThemeProvider>
  );
};

export default StaffLayout;
