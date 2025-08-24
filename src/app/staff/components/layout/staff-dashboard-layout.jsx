import { SidebarProvider } from "@/core/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { ContentWrapper } from "../../../shared/components/content-wrapper";

export function SDashboardLayout({ children }) {
  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      }}
    >
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        <ContentWrapper>{children}</ContentWrapper>
      </div>
    </SidebarProvider>
  );
}
