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

import { NavMain } from "@/app/patient/components/dashboard_components/nav-main";
import { NavProjects } from "@/app/patient/components/dashboard_components/nav-projects";
import { NavUser } from "@/app/patient/components/dashboard_components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import Logo from "@/core/components/Logo";

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

export function AppSidebar(props) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Logo />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
