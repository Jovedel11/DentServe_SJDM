import * as React from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarFooter,
} from "@/core/components/ui/sidebar";
import { NavUser } from "@/app/shared/components/nav-user";
import { SearchForm } from "@/app/shared/components/search-form";
import Logo from "@/core/components/ui/Logo";
import { ModeToggle } from "@/core/components/ui/mode-toggle";
import {
  Shield,
  Settings,
  Users,
  BarChart3,
  FileText,
  Calendar,
} from "lucide-react";

// Admin Dashboard Navigation Data
const data = {
  user: {
    name: "Admin",
    email: "admin@dentalcare.com",
    avatar: "/avatars/admin.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/admin/dashboard",
      icon: BarChart3,
      items: [
        {
          title: "Overview",
          url: "/admin/dashboard/overview",
        },
        {
          title: "Analytics",
          url: "/admin/dashboard/analytics",
        },
      ],
    },
    {
      title: "Patient Management",
      url: "/admin/patients",
      icon: Users,
      items: [
        {
          title: "All Patients",
          url: "/admin/patients",
        },
        {
          title: "Add Patient",
          url: "/admin/patients/add",
        },
        {
          title: "Patient Records",
          url: "/admin/patients/records",
        },
        {
          title: "Treatment Plans",
          url: "/admin/patients/treatments",
        },
      ],
    },
    {
      title: "Appointments",
      url: "/admin/appointments",
      icon: Calendar,
      items: [
        {
          title: "Schedule",
          url: "/admin/appointments/schedule",
        },
        {
          title: "Calendar View",
          url: "/admin/appointments/calendar",
        },
        {
          title: "Booking Management",
          url: "/admin/appointments/booking",
        },
      ],
    },
    {
      title: "Reports & Analytics",
      url: "/admin/reports",
      icon: FileText,
      items: [
        {
          title: "Financial Reports",
          url: "/admin/reports/financial",
        },
        {
          title: "Patient Analytics",
          url: "/admin/reports/patients",
        },
        {
          title: "Treatment Statistics",
          url: "/admin/reports/treatments",
        },
      ],
    },
    {
      title: "System Settings",
      url: "/admin/settings",
      icon: Settings,
      items: [
        {
          title: "General Settings",
          url: "/admin/settings/general",
        },
        {
          title: "User Management",
          url: "/admin/settings/users",
        },
        {
          title: "Clinic Configuration",
          url: "/admin/settings/clinic",
        },
        {
          title: "Security Settings",
          url: "/admin/settings/security",
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }) {
  return (
    <Sidebar
      variant="floating"
      className="border-sidebar-border bg-sidebar"
      {...props}
    >
      <SidebarHeader className="border-b border-sidebar-border bg-sidebar">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="hover:bg-sidebar-accent"
            >
              <div className="flex items-center gap-3 px-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Shield className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-sidebar-foreground">
                    Admin Portal
                  </span>
                  <span className="text-xs text-sidebar-foreground/60">
                    Dental Care Management
                  </span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center justify-between px-2 py-2">
          <Logo to="/admin/dashboard" className="text-sidebar-foreground" />
          <ModeToggle />
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar">
        <SearchForm className="mb-4 mx-2" />
        <SidebarGroup>
          <SidebarMenu className="gap-1 px-2">
            {data.navMain.map((item) => {
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className="hover:bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-accent-foreground"
                  >
                    <a
                      href={item.url}
                      className="flex items-center gap-3 font-medium"
                    >
                      <Icon className="h-4 w-4" />
                      {item.title}
                    </a>
                  </SidebarMenuButton>
                  {item.items?.length ? (
                    <SidebarMenuSub className="ml-6 border-l border-sidebar-border px-3">
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            className="hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-accent-foreground"
                          >
                            <a href={subItem.url} className="text-sm">
                              {subItem.title}
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  ) : null}
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border bg-sidebar">
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
