import * as React from "react";
import { NavLink } from "react-router-dom";

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
import {
  Settings,
  Users,
  BarChart3,
  FileText,
  SquareKanban,
  Building2,
  User,
} from "lucide-react";
import { useAuth } from "@/auth/context/AuthProvider";

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
    },
    {
      title: "Partnership Request Manager",
      url: "/admin/partnership-request-manager",
      icon: Building2,
    },
    {
      title: "User Management",
      url: "/admin/users-management",
      icon: Users,
      items: [
        { title: "All Users", url: "/admin/users-management" },
        { title: "User Records", url: "/admin/users-management/records" },
      ],
    },
    {
      title: "Profile",
      url: "/admin/profile",
      icon: User,
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
      variant="floating"
      className="border-sidebar-border bg-sidebar"
      {...props}
    >
      <SidebarHeader className="border-b border-sidebar-border bg-sidebar">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <NavLink
                to="/admin/dashboard"
                className="flex items-center gap-3"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Logo to="/admin/dashboard" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-sidebar-foreground">
                    DentServe SJDM
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Admin Portal
                  </span>
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar">
        <SearchForm className="mb-0.5 mx-4 mt-3" />
        <SidebarGroup>
          <SidebarMenu className="gap-1">
            {data.navMain.map((item) => {
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        `flex items-center gap-3 font-medium px-2 py-1 rounded-md transition-colors 
                        ${
                          isActive
                            ? "bg-[#457B9D] text-white"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        }`
                      }
                    >
                      <Icon className="h-4 w-4" />
                      {item.title}
                    </NavLink>
                  </SidebarMenuButton>
                  {item.items?.length ? (
                    <SidebarMenuSub className="ml-6 border-l border-sidebar-border px-3">
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <NavLink
                              to={subItem.url}
                              className={({ isActive }) =>
                                `text-sm px-2 py-1 rounded-md transition-colors 
                                ${
                                  isActive
                                    ? "bg-[#457B9D] text-white"
                                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                }`
                              }
                            >
                              {subItem.title}
                            </NavLink>
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
        <NavUser user={profile.profile} />
      </SidebarFooter>
    </Sidebar>
  );
}
