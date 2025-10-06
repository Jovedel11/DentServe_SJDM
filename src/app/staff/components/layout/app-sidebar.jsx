import {
  IconChartBar,
  IconHelp,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";
import { ClipboardPen, MessageSquareHeart, NotebookTabs } from "lucide-react";

import { NavMain } from "../navigation/nav-main";
import { NavSecondary } from "../navigation/nav-secondary";
import { NavUser } from "@/app/shared/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/core/components/ui/sidebar";
import Logo from "@/core/components/ui/Logo";

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Manage Appointments",
      url: "/staff/manage-appointments",
      icon: ClipboardPen,
      isActive: true,
    },
    {
      title: "Treatment Plans",
      url: "/staff/treatment-plans",
      icon: NotebookTabs,
    },
    {
      title: "Appointment History",
      url: "/staff/appointment-history",
      icon: IconChartBar,
    },
    {
      title: "Clinic Analytics",
      url: "/staff/clinic-analytics",
      icon: IconChartBar,
    },
    {
      title: "Clinic Profile",
      url: "/staff/clinic-profile",
      icon: IconUsers,
    },
    {
      title: "Feedbacks",
      url: "/staff/feedbacks",
      icon: MessageSquareHeart,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/staff/settings",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "/staff/help",
      icon: IconHelp,
    },
  ],
};

export function AppSidebar({ ...props }) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Logo to="/staff/dashboard" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-sidebar-foreground">
                    DentServe SJDM
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Staff Portal
                  </span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
