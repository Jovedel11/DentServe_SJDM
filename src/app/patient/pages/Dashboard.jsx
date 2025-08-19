import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/core/components/ui/card";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Activity,
  Heart,
  Bell,
  MessageSquare,
} from "lucide-react";

const Dashboard = () => {
  // Mock data for demonstration
  const stats = [
    {
      title: "Next Appointment",
      value: "Tomorrow",
      subtitle: "2:00 PM - Dr. Smith",
      icon: Calendar,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Treatments",
      value: "3",
      subtitle: "Completed this year",
      icon: Activity,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Messages",
      value: "2",
      subtitle: "Unread messages",
      icon: MessageSquare,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Health Score",
      value: "94%",
      subtitle: "Excellent",
      icon: Heart,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  const recentAppointments = [
    {
      date: "2024-08-20",
      time: "2:00 PM",
      doctor: "Dr. Sarah Smith",
      type: "Regular Checkup",
      status: "upcoming",
    },
    {
      date: "2024-07-15",
      time: "10:00 AM",
      doctor: "Dr. Mike Johnson",
      type: "Cleaning",
      status: "completed",
    },
    {
      date: "2024-06-10",
      time: "3:30 PM",
      doctor: "Dr. Sarah Smith",
      type: "Consultation",
      status: "completed",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your dental care journey.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Appointments */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Recent Appointments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentAppointments.map((appointment, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-sm font-medium text-foreground">
                        {new Date(appointment.date).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {appointment.time}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        {appointment.type}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {appointment.doctor}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={
                      appointment.status === "upcoming"
                        ? "default"
                        : "secondary"
                    }
                    className={
                      appointment.status === "upcoming"
                        ? "bg-primary text-primary-foreground"
                        : ""
                    }
                  >
                    {appointment.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Notifications */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Book Appointment
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <MapPin className="h-4 w-4 mr-2" />
                Find Nearby Clinics
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <MessageSquare className="h-4 w-4 mr-2" />
                Contact Doctor
              </Button>
            </CardContent>
          </Card>

          {/* Health Reminders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-warning" />
                Health Reminders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10">
                <Clock className="h-4 w-4 text-warning mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-foreground">
                    Daily Flossing
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Remember to floss before bed
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-info/10">
                <Bell className="h-4 w-4 text-info mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-foreground">
                    Checkup Due
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Schedule 6-month checkup
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
