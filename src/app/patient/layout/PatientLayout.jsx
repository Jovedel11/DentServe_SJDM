import { ThemeProvider } from "@/core/contexts/ThemeProvider";
import { PDashboardLayout } from "../components/layout/patient-dashboard-layout";
import { Outlet } from "react-router-dom";

const PatientLayout = () => {
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
