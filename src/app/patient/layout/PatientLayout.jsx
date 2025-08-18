import { ThemeProvider } from "@/core/contexts/ThemeProvider";
import Dashboard from "../pages/Dashboard";

const PatientLayout = () => {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Dashboard />
    </ThemeProvider>
  );
};

export default PatientLayout;
