import { SidebarIcon, Bell, Settings, User } from "lucide-react";
import { SearchForm } from "@/app/shared/components/search-form";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/core/components/ui/breadcrumb";
import { Button } from "@/core/components/ui/button";
import { Separator } from "@/core/components/ui/separator";
import { Badge } from "@/core/components/ui/badge";
import { useSidebar } from "@/core/components/ui/sidebar";
import { ModeToggle } from "@/core/components/ui/mode-toggle";

export function SiteHeader() {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="flex h-14 w-full items-center gap-4 px-6">
        {/* Sidebar Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-sidebar-accent"
          onClick={toggleSidebar}
        >
          <SidebarIcon className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Breadcrumb Navigation */}
        <Breadcrumb className="hidden sm:flex">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                href="/patient/dashboard"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-foreground font-medium">
                Overview
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Right Side Actions */}
        <div className="ml-auto flex items-center gap-2">
          <SearchForm className="hidden sm:flex" />

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8 hover:bg-sidebar-accent"
          >
            <Bell className="h-4 w-4" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-destructive text-destructive-foreground">
              3
            </Badge>
          </Button>

          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
