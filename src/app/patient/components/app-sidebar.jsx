import {
  CalendarRange,
  UserSearch,
  MapPinned,
  HeartPlus,
  MessageSquareHeart,
  BellRing,
  Ambulance,
  Settings2,
} from "lucide-react";

import { NavMain } from "../components/nav-main";
import { NavProjects } from "../components/nav-projects";
import { NavSecondary } from "../components/nav-secondary";
import { NavUser } from "@/app/shared/nav-user";
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
import { useAuth } from "@/auth/context/AuthProvider";

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Appointments",
      url: "#",
      icon: CalendarRange,
      isActive: true,
      items: [
        {
          title: "Book",
          url: "#",
        },
        {
          title: "Upcoming",
          url: "#",
        },
        {
          title: "History",
          url: "#",
        },
      ],
    },
    {
      title: "Clinics Near Me",
      url: "#",
      icon: MapPinned,
      items: [
        {
          title: "Map",
          url: "#",
        },
        {
          title: "List",
          url: "#",
        },
      ],
    },
    {
      title: "Find Doctors",
      url: "#",
      icon: UserSearch,
      items: [
        {
          title: "Search",
          url: "#",
        },
        {
          title: "Favorites",
          url: "#",
        },
      ],
    },
    {
      title: "Health Insights",
      url: "#",
      icon: HeartPlus,
      items: [
        {
          title: "Summary",
          url: "#",
        },
        {
          title: "Records",
          url: "#",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Feedback",
      url: "#",
      icon: MessageSquareHeart,
    },
    {
      name: "Reminders",
      url: "#",
      icon: BellRing,
    },
    {
      name: "Submit Symptoms",
      url: "#",
      icon: Ambulance,
    },
    {
      name: "Settings",
      url: "#",
      icon: Settings2,
    },
  ],
};

export function AppSidebar({ ...props }) {
  const { profile } = useAuth();
  return (
    <Sidebar
      className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <Logo to="/patient/dashboard" />
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={profile} />
      </SidebarFooter>
    </Sidebar>
  );
}
