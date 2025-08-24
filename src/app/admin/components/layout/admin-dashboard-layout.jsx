import React from "react";
import { AppSidebar } from "./app-sidebar";
import { SidebarInset, SidebarProvider } from "@/core/components/ui/sidebar";
import { ContentWrapper } from "@/app/shared/components/content-wrapper";

export default function ADashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SidebarProvider
        style={{
          "--sidebar-width": "19rem",
        }}
      >
        <AppSidebar />
        <ContentWrapper>{children}</ContentWrapper>
      </SidebarProvider>
    </div>
  );
}
