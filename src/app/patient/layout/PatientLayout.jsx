import { ThemeProvider } from "@/core/contexts/ThemeProvider";
import { PDashboardLayout } from "../components/layout/patient-dashboard-layout";
import { useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/auth/context/AuthProvider";
import WelcomeToast from "../components/welcome-toast";
import { useState } from "react";

const PatientLayout = () => {
  const { profile } = useAuth();
  const [showToast, setShowToast] = useState(true);
  const navigate = useNavigate();

  const date_of_birth = profile?.profile?.date_of_birth ?? null;
  const gender = profile?.profile?.gender ?? null;
  const profile_image_url = profile?.profile?.profile_image_url ?? null;

  const hasProfileData = !!(date_of_birth || gender || profile_image_url);

  return (
    <ThemeProvider defaultTheme="system" storageKey="dental-ui-theme">
      <div className="min-h-screen bg-[#F1FAEE]">
        <PDashboardLayout>
          {hasProfileData && showToast && (
            <WelcomeToast
              isVisible={true}
              onClose={() => setShowToast(false)}
              onNavigate={() =>
                setTimeout(() => navigate("/patient/profile"), 1000)
              }
            />
          )}
          <Outlet />
        </PDashboardLayout>
      </div>
    </ThemeProvider>
  );
};

export default PatientLayout;
