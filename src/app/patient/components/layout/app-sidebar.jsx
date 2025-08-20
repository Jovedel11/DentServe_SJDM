import {
  CalendarRange,
  UserSearch,
  MapPinned,
  MessageSquareHeart,
  Settings2,
  Home,
  UserPen,
  MessageCircleQuestionMark,
} from "lucide-react";

import { NavMain } from "../navigation/nav-main";
import { NavProjects } from "../navigation/nav-projects";
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
import { useAuth } from "@/auth/context/AuthProvider";
import Logo from "@/core/components/ui/Logo";

const navigationData = {
  navMain: [
    {
      title: "Dashboard",
      url: "/patient/dashboard",
      icon: Home,
      isActive: true,
    },
    {
      title: "Appointments",
      icon: CalendarRange,
      items: [
        {
          title: "Book Appointment",
          url: "/patient/appointments/book",
        },
        { title: "Upcoming", url: "/patient/appointments/upcoming" },
        { title: "History", url: "/patient/appointments/history" },
      ],
    },
    {
      title: "Find Dentists",
      url: "/patient/dentists",
      icon: UserSearch,
      items: [
        { title: "Search Dentists", url: "/patient/dentists/search" },
        { title: "Reviews", url: "/patient/dentists/reviews" },
      ],
    },
    {
      title: "Clinics Near Me",
      url: "/patient/clinics",
      icon: MapPinned,
      items: [
        { title: "Map View", url: "/patient/clinics/map" },
        { title: "List View", url: "/patient/clinics/list" },
      ],
    },
  ],
  projects: [
    {
      name: "Feedbacks",
      url: "/patient/feedbacks",
      icon: MessageSquareHeart,
      badge: "3",
    },
    {
      name: "Profile",
      url: "/patient/profile",
      icon: UserPen,
    },
    {
      name: "Settings",
      url: "/patient/settings",
      icon: Settings2,
    },
    {
      name: "Help & Support",
      url: "/patient/help",
      icon: MessageCircleQuestionMark,
    },
  ],
};

export function AppSidebar({ ...props }) {
  const { profile } = useAuth();

  return (
    <Sidebar
      className="top-14 h-[calc(100vh-3.5rem)] border-r bg-sidebar"
      {...props}
    >
      {/* Sidebar Header */}
      <SidebarHeader className="border-b border-sidebar-border/50 p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Logo to="/patient/dashboard" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-sidebar-foreground">
                    DentServe SJDM
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Patient Portal
                  </span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Sidebar Content */}
      <SidebarContent className="px-2 py-4 space-y-4">
        <NavMain items={navigationData.navMain} />
        <NavProjects projects={navigationData.projects} />
      </SidebarContent>

      {/* Sidebar Footer */}
      <SidebarFooter className="border-t border-sidebar-border/50 p-4">
        <NavUser user={profile} className="cursor-pointer" />
      </SidebarFooter>
    </Sidebar>
  );
}
