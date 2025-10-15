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
import Loader from "@/core/components/Loader";

const navigationData = {
  navMain: [
    {
      title: "Dashboard",
      url: "/patient/dashboard",
      icon: Home,
    },
    {
      title: "Appointments",
      url: "/patient/appointments/book",
      icon: CalendarRange,
      items: [
        {
          title: "Book Appointment",
          url: "/patient/appointments/book",
        },
        {
          title: "Upcoming",
          url: "/patient/appointments/upcoming",
        },
        {
          title: "History",
          url: "/patient/appointments/history",
        },
      ],
    },
    {
      title: "Clinics Near Me",
      url: "/patient/clinics/map",
      icon: MapPinned,
    },
    {
      title: "Dentists",
      url: "/patient/dentists",
      icon: UserSearch,
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
  const { profile, loading } = useAuth();

  if (loading) {
    return <Loader message="Loading sidebar..." />;
  }

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
              <div className="flex items-center gap-3 cursor-pointer">
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
        <NavUser user={profile.profile} className="cursor-pointer" />
      </SidebarFooter>
    </Sidebar>
  );
}
