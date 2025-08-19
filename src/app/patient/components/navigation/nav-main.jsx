import { ChevronRight } from "lucide-react";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/core/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/core/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { NavLink } from "react-router-dom";

export function NavMain({ items }) {
  const [activeItem, setActiveItem] = useState(items?.[0]?.title);

  return (
    <SidebarGroup>
      {/* Label should respect theme */}
      <SidebarGroupLabel className="text-sidebar-foreground/70 font-medium text-xs uppercase tracking-wide">
        Navigation
      </SidebarGroupLabel>

      {/* SidebarMenu should inherit text + background from theme */}
      <SidebarMenu className="space-y-1 text-sidebar-foreground">
        {items.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            defaultOpen={item.isActive}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                {items?.items ? (
                  <SidebarMenuButton
                    tooltip={item.title}
                    className={cn(
                      // Base styles from theme tokens
                      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-all duration-200",
                      "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                      "group-hover:shadow-sm",
                      // Active state from sidebar-primary
                      (item.isActive || activeItem === item.title) &&
                        "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                    )}
                    onClick={() => setActiveItem(item.title)}
                  >
                    {item.icon && (
                      <item.icon
                        className={cn(
                          "h-4 w-4 transition-colors",
                          item.isActive || activeItem === item.title
                            ? "text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/70"
                        )}
                      />
                    )}
                    <span className="font-medium">{item.title}</span>
                    {item.items && (
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    )}
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton asChild className="cursor-pointer">
                    <NavLink
                      to={item.url}
                      onClick={() => setActiveItem(item.title)}
                      className="flex items-center gap-2"
                    >
                      {item.icon && <item.icon className="h-4 w-4" />}
                      <span className="font-medium">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                )}
              </CollapsibleTrigger>

              {/* Submenu */}
              {item.items && (
                <CollapsibleContent className="animate-fadeIn">
                  <SidebarMenuSub className="ml-6 mt-1 space-y-1 border-l border-sidebar-border/30 pl-4">
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton
                          asChild
                          className={cn(
                            "rounded-md transition-colors text-sm",
                            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                            activeItem === subItem.title &&
                              "bg-sidebar-primary/90 text-sidebar-primary-foreground font-medium"
                          )}
                        >
                          <NavLink
                            to={subItem.url}
                            onClick={() => setActiveItem(subItem.title)}
                            className="block w-full"
                          >
                            {subItem.title}
                          </NavLink>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              )}
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
