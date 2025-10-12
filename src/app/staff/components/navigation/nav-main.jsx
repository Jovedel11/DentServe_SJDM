import { useState } from "react";
import { NavLink } from "react-router-dom";
import { IconMail } from "@tabler/icons-react";
import { LayoutDashboard } from "lucide-react";

import { Button } from "@/core/components/ui/button";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/core/components/ui/sidebar";

export function NavMain({ items }) {
  const [showInboxModal, setShowInboxModal] = useState(false);

  const handleInboxClick = () => {
    setShowInboxModal(true);
  };

  const handleCloseInbox = () => {
    setShowInboxModal(false);
  };

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent className="flex flex-col gap-2">
          {/* Dashboard Item */}
          <SidebarMenu>
            <SidebarMenuItem className="flex items-center gap-2">
              <NavLink to="/staff/dashboard" className="w-full">
                {({ isActive }) => (
                  <SidebarMenuButton
                    tooltip="Dashboard"
                    className={`
                      min-w-8 duration-200 ease-linear transition-all
                      ${
                        isActive
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                      }
                    `}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                )}
              </NavLink>
            </SidebarMenuItem>
          </SidebarMenu>

          {/* Dynamic Navigation Items */}
          <SidebarMenu>
            {items?.map((item) => (
              <SidebarMenuItem key={item.title}>
                <NavLink to={item.url} className="w-full">
                  {({ isActive }) => (
                    <SidebarMenuButton
                      tooltip={item.title}
                      className={`
                        w-full duration-200 ease-linear transition-all
                        ${
                          isActive
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        {item.icon && <item.icon className="w-4 h-4" />}
                        <span>{item.title}</span>
                      </div>
                    </SidebarMenuButton>
                  )}
                </NavLink>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Gmail Inbox Modal - Only renders when showInboxModal is true */}
      {showInboxModal && (
        <GmailInboxModal
          onClose={handleCloseInbox}
          showInboxModal={showInboxModal}
        />
      )}
    </>
  );
}
