import { ThemeProvider } from "@/core/contexts/ThemeProvider";
import ADashboardLayout from "../components/layout/admin-dashboard-layout";
import { Outlet } from "react-router-dom";

const AdminLayout = () => {
  return (
    <ThemeProvider defaultTheme="system" storageKey="admin-ui-theme">
      <div className="min-h-screen bg-[#F1FAEE]">
        <ADashboardLayout>
          <Outlet />
        </ADashboardLayout>
      </div>
    </ThemeProvider>
  );
};

export default AdminLayout;
