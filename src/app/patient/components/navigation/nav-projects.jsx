import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/core/components/ui/sidebar";
import { Badge } from "@/core/components/ui/badge";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

export function NavProjects({ projects, title = "Quick Actions" }) {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="text-sidebar-foreground/70 font-medium text-xs uppercase tracking-wide mb-2">
        {title}
      </SidebarGroupLabel>
      <SidebarMenu className="space-y-1">
        {projects.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild>
              <NavLink
                to={item.url}
                className={({ isActive }) =>
                  cn(
                    "flex items-center justify-between rounded-lg transition-all duration-200",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive &&
                      "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm"
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-4 w-4 text-sidebar-foreground/70" />
                  <span className="font-medium text-sidebar-foreground">
                    {item.name}
                  </span>
                </div>
                {item.badge && (
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary text-xs h-5 px-2 font-medium"
                  >
                    {item.badge}
                  </Badge>
                )}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
