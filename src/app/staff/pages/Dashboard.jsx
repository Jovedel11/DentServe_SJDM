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
import { ModeToggle } from "@/core/components/ui/mode-toggle";
import { Outlet } from "react-router-dom";

const Dashboard = () => {
  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "350px",
      }}
    >
      <AppSidebar />
      <SidebarInset className="flex flex-1 flex-col min-h-screen">
        {/* Header - Sticks with sidebar */}
        <header className="bg-background/95 backdrop-blur-sm sticky top-0 z-50 flex shrink-0 items-center gap-2 border-b border-border p-4 shadow-sm">
          <SidebarTrigger className="-ml-1 h-8 w-8 hover:bg-muted rounded-md transition-colors" />
          <Separator
            orientation="vertical"
            className="mr-2 h-4 bg-border"
          />
          <Breadcrumb className="flex items-center w-full">
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink 
                  href="#" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Staff Portal
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block text-muted-foreground" />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-foreground font-medium">
                  Dashboard
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <ModeToggle className="ml-auto" />
        </header>
        

        {/* Main Content Area - Properly aligned */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="h-full">
            {/* Child pages will render here via Outlet */}
            <Outlet />
            
            {/* Default dashboard content when no child route */}
            <div className="p-6 space-y-6 max-w-7xl mx-auto">
              {/* Welcome Section */}
              <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-semibold text-foreground mb-2">
                      Welcome back, Dr. Smith! 👋
                    </h1>
                    <p className="text-muted-foreground">
                      Here's what's happening at your practice today
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                    System Online
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { 
                    title: "Today's Appointments", 
                    value: "12", 
                    change: "+3 from yesterday",
                    color: "text-dental-teal",
                    bg: "bg-dental-teal/10"
                  },
                  { 
                    title: "Active Patients", 
                    value: "2,543", 
                    change: "+12 this month",
                    color: "text-success",
                    bg: "bg-success/10"
                  },
                  { 
                    title: "Monthly Revenue", 
                    value: "$45,231", 
                    change: "+23% vs last month",
                    color: "text-primary",
                    bg: "bg-primary/10"
                  },
                  { 
                    title: "Satisfaction Rate", 
                    value: "98.5%", 
                    change: "+2% improvement",
                    color: "text-dental-coral",
                    bg: "bg-accent/20"
                  },
                ].map((stat, index) => (
                  <div
                    key={index}
                    className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-all duration-200 group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-2 font-medium">
                          {stat.title}
                        </p>
                        <p className={`text-3xl font-bold ${stat.color} mb-1`}>
                          {stat.value}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {stat.change}
                        </p>
                      </div>
                      <div className={`w-12 h-12 rounded-lg ${stat.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <div className={`w-6 h-6 rounded ${stat.color.replace('text-', 'bg-')}`}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activity */}
                <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-foreground">
                      Recent Activity
                    </h3>
                    <button className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
                      View All
                    </button>
                  </div>
                  <div className="space-y-4">
                    {[
                      { type: "appointment", message: "New appointment booked with Sarah Johnson", time: "2 minutes ago" },
                      { type: "payment", message: "Payment received from Michael Brown", time: "15 minutes ago" },
                      { type: "review", message: "5-star review received from Emma Davis", time: "1 hour ago" },
                      { type: "appointment", message: "Appointment completed for John Wilson", time: "2 hours ago" },
                      { type: "system", message: "Daily backup completed successfully", time: "3 hours ago" },
                    ].map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors group"
                      >
                        <div className={`w-3 h-3 rounded-full ${
                          activity.type === 'appointment' ? 'bg-primary' :
                          activity.type === 'payment' ? 'bg-success' :
                          activity.type === 'review' ? 'bg-warning' :
                          'bg-muted-foreground'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground font-medium truncate">
                            {activity.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {activity.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-foreground mb-6">
                    Quick Actions
                  </h3>
                  <div className="space-y-3">
                    {[
                      { title: "New Appointment", icon: "📅", desc: "Schedule patient visit" },
                      { title: "Add Patient", icon: "👤", desc: "Register new patient" },
                      { title: "View Schedule", icon: "📋", desc: "Today's appointments" },
                      { title: "Generate Report", icon: "📊", desc: "Monthly analytics" },
                    ].map((action, index) => (
                      <button
                        key={index}
                        className="w-full p-4 text-left bg-muted/20 hover:bg-muted/40 border border-border/50 hover:border-primary/30 rounded-lg transition-all duration-200 group"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{action.icon}</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                              {action.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {action.desc}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chart Section */}
              <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-foreground mb-6">
                  Practice Overview
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <div
                      key={index}
                      className="bg-muted/30 rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      style={{ height: `${60 + Math.random() * 80}px` }}
                    >
                      <div className="w-full h-full bg-primary/20 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Dashboard;