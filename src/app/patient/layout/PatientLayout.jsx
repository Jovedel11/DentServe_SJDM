import { ThemeProvider } from "@/core/contexts/ThemeProvider";
import { PDashboardLayout } from "../components/layout/patient-dashboard-layout";
import { useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/auth/context/AuthProvider";
import { useState } from "react";

const PatientLayout = () => {
  const { profile } = useAuth();

  return (
    <ThemeProvider defaultTheme="system" storageKey="dental-ui-theme">
      <div className="min-h-screen bg-[#F1FAEE]">
        <PDashboardLayout>
          <Outlet />
        </PDashboardLayout>
      </div>
    </ThemeProvider>
  );
};

export default PatientLayout;
