import { SidebarProvider } from "@/core/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { SiteHeader } from "./site-header";
import { ContentWrapper } from "../../../shared/components/content-wrapper";

export function PDashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-background">
      <SidebarProvider className="flex h-screen flex-col">
        {/* Fixed Header */}
        <SiteHeader />

        {/* Main Dashboard Container */}
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <ContentWrapper>{children}</ContentWrapper>
        </div>
      </SidebarProvider>
    </div>
  );
}
