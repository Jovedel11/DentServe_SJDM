import { AppSidebar } from "../components/app-sidebar";
import { SiteHeader } from "../components/site-header";
import { SidebarInset, SidebarProvider } from "@/core/components/ui/sidebar";

const Dashboard = () => {
  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <SidebarProvider className="flex flex-col">
        <SiteHeader />
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset className="flex-1 overflow-y-auto p-6 bg-muted/20"></SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default Dashboard;
