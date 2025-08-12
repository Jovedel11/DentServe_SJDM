import { ThemeProvider } from "@/core/contexts/ThemeProvider";
import "../../../core/styles/privateUi.css";
import Dashboard from "../pages/Dashboard";

const PatientLayout = () => {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Dashboard />
    </ThemeProvider>
  );
};

export default PatientLayout;
