import React from "react";
import { AppSidebar } from "../components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/core/components/ui/breadcrumb";
import { Separator } from "@/core/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/core/components/ui/sidebar";
import { Bell, Search, User } from "lucide-react";
import { Button } from "@/core/components/ui/button";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SidebarProvider
        style={{
          "--sidebar-width": "19rem",
        }}
      >
        <AppSidebar />
        <SidebarInset className="flex flex-col min-h-screen">
          {/* Header */}
          <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <SidebarTrigger className="-ml-1 text-foreground hover:bg-accent" />
            <Separator orientation="vertical" className="mr-2 h-4 bg-border" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink
                    href="/admin"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Admin Portal
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-foreground font-medium">
                    Dashboard
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            {/* Header Actions */}
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
              >
                <Search className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
              >
                <Bell className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
              >
                <User className="h-4 w-4" />
              </Button>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col gap-4 p-4 md:p-6">
            {/* Dashboard Stats Cards */}
            <div className="grid auto-rows-min gap-4 md:grid-cols-3">
              <div className="bg-card border border-border aspect-video rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col h-full justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Total Patients
                    </h3>
                    <p className="text-2xl font-bold text-card-foreground mt-2">
                      1,234
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="text-success">+12%</span> from last month
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border aspect-video rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col h-full justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Today's Appointments
                    </h3>
                    <p className="text-2xl font-bold text-card-foreground mt-2">
                      28
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="text-info">3</span> pending confirmations
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border aspect-video rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col h-full justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Monthly Revenue
                    </h3>
                    <p className="text-2xl font-bold text-card-foreground mt-2">
                      $45,231
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="text-success">+8%</span> from last month
                  </div>
                </div>
              </div>
            </div>

            {/* Main Dashboard Content */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              {/* Recent Activity */}
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm md:col-span-4">
                <h3 className="text-lg font-semibold text-card-foreground mb-4">
                  Recent Activity
                </h3>
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="h-2 w-2 bg-primary rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-card-foreground">
                          New appointment scheduled
                        </p>
                        <p className="text-xs text-muted-foreground">
                          John Doe - Dental Cleaning at 2:00 PM
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        5 min ago
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm md:col-span-3">
                <h3 className="text-lg font-semibold text-card-foreground mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <Button className="w-full justify-start bg-primary hover:bg-primary/90 text-primary-foreground">
                    Add New Patient
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-border hover:bg-accent hover:text-accent-foreground"
                  >
                    Schedule Appointment
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-border hover:bg-accent hover:text-accent-foreground"
                  >
                    View Calendar
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-border hover:bg-accent hover:text-accent-foreground"
                  >
                    Generate Report
                  </Button>
                </div>
              </div>
            </div>

            {/* Additional Content Area */}
            <div className="bg-card border border-border min-h-[400px] flex-1 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-card-foreground mb-4">
                Dashboard Overview
              </h3>
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <p>Main dashboard content goes here...</p>
              </div>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
