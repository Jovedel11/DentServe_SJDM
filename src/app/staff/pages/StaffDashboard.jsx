import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Star,
  Award,
  Activity,
  Phone,
  MoreVertical,
  Eye,
  Bell,
  MessageSquare,
  ArrowRight,
  RefreshCw,
  Settings,
  Clipboard,
  BarChart3,
  UserPlus,
  FileText,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/core/components/ui/card";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/core/components/ui/chart";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import Skeleton from "@/core/components/Skeleton";
import EmptyState from "@/core/components/ui/empty-state";
import { useStaffDashboard } from "@/hooks/useStaffDashboard";
import { useAuth } from "@/auth/context/AuthProvider";
import { useIsMobile } from "@/core/hooks/use-mobile";
import { formatDistanceToNow } from "date-fns";

const StaffDashboard = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { profile } = useAuth();

  const {
    todayAppointments,
    weeklyStats,
    recentFeedback,
    notifications,
    clinicInfo,
    stats,
    nextAppointment,
    urgentAlerts,
    loading,
    error,
    hasData,
    refresh,
    markNotificationRead,
    lastUpdated,
  } = useStaffDashboard();

  const [refreshing, setRefreshing] = useState(false);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setTimeout(() => setRefreshing(false), 500);
  };

  // Current time
  const currentTime = useMemo(() => new Date(), []);

  // Chart configuration
  const appointmentChartConfig = {
    total: {
      label: "Total",
      color: "#457B9D",
    },
    completed: {
      label: "Completed",
      color: "#10B981",
    },
    pending: {
      label: "Pending",
      color: "#F59E0B",
    },
    cancelled: {
      label: "Cancelled",
      color: "#EF4444",
    },
  };

  // Loading state
  if (loading && !hasData) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="animate-pulse space-y-6 max-w-[1600px] mx-auto">
          <div className="flex justify-between items-center">
            <Skeleton width="300px" height="40px" />
            <Skeleton width="150px" height="40px" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton
                key={i}
                width="100%"
                height="140px"
                borderRadius="12px"
              />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <Skeleton
                key={i}
                width="100%"
                height="400px"
                borderRadius="12px"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !hasData) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-[1600px] mx-auto">
          <EmptyState
            icon={AlertTriangle}
            title="Unable to Load Dashboard"
            description={error}
            variant="card"
            action={
              <Button onClick={handleRefresh} className="mt-4">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6 md:space-y-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Welcome Back, {profile?.first_name || "Staff"}! 👋
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            {currentTime.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            •{" "}
            {currentTime.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          {clinicInfo && (
            <p className="text-sm text-muted-foreground mt-1">
              {clinicInfo.name}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Updated{" "}
              {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
            </span>
          )}
          <Button
            variant="outline"
            size={isMobile ? "sm" : "default"}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Next Appointment Alert */}
      {nextAppointment && (
        <Card className="border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    Next Appointment
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {nextAppointment.appointment_time.slice(0, 5)} •{" "}
                    {nextAppointment.patient_name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {nextAppointment.services.map((s) => s.name).join(", ") ||
                      "Consultation"}
                  </p>
                </div>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate("/staff/appointments/manage")}
              >
                View Details
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Today's Appointments */}
        <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                  Today's Appointments
                </p>
                <p className="text-2xl md:text-3xl font-bold text-foreground mt-2">
                  {stats.today.total}
                </p>
                <div className="flex items-center gap-3 mt-3 text-xs flex-wrap">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    {stats.today.completed} Done
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    {stats.today.pending} Pending
                  </span>
                </div>
              </div>
              <div className="p-2 md:p-3 bg-primary/10 rounded-lg">
                <Calendar className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/50" />
        </Card>

        {/* New Patients (30d) */}
        <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                  Patients (30d)
                </p>
                <p className="text-2xl md:text-3xl font-bold text-foreground mt-2">
                  {stats.month.patients}
                </p>
                {stats.month.growth > 0 && (
                  <div className="flex items-center gap-1 mt-3">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-600 font-medium">
                      +{stats.month.growth}% growth
                    </span>
                  </div>
                )}
              </div>
              <div className="p-2 md:p-3 bg-green-500/10 rounded-lg">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-green-300" />
        </Card>

        {/* Clinic Rating */}
        <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                  Clinic Rating
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Star className="w-6 h-6 text-yellow-500 fill-current" />
                  <p className="text-2xl md:text-3xl font-bold text-foreground">
                    {clinicInfo?.rating?.toFixed(1) || "0.0"}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  {clinicInfo?.total_reviews || 0} reviews
                </p>
              </div>
              <div className="p-2 md:p-3 bg-amber-500/10 rounded-lg">
                <Award className="w-5 h-5 md:w-6 md:h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 to-yellow-300" />
        </Card>

        {/* Alerts */}
        <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                  Alerts & Actions
                </p>
                <p className="text-2xl md:text-3xl font-bold text-foreground mt-2">
                  {urgentAlerts.length}
                </p>
                {urgentAlerts.length > 0 && (
                  <p className="text-xs text-red-600 font-medium mt-3">
                    Requires attention
                  </p>
                )}
              </div>
              <div className="p-2 md:p-3 bg-red-500/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-red-300" />
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={() => navigate("/staff/appointments/manage")}
            >
              <Calendar className="w-5 h-5 text-primary" />
              <span className="text-xs font-medium">Manage Appointments</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={() => navigate("/staff/treatment-plans")}
            >
              <Clipboard className="w-5 h-5 text-blue-500" />
              <span className="text-xs font-medium">Treatment Plans</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={() => navigate("/staff/feedback")}
            >
              <MessageSquare className="w-5 h-5 text-green-500" />
              <span className="text-xs font-medium">Feedback</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={() => navigate("/staff/analytics")}
            >
              <BarChart3 className="w-5 h-5 text-purple-500" />
              <span className="text-xs font-medium">Analytics</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={() => navigate("/staff/appointments/history")}
            >
              <FileText className="w-5 h-5 text-orange-500" />
              <span className="text-xs font-medium">History</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={() => navigate("/staff/settings")}
            >
              <Settings className="w-5 h-5 text-gray-500" />
              <span className="text-xs font-medium">Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Weekly Appointments Trend */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              <span>Weekly Overview</span>
              <Activity className="w-5 h-5 text-muted-foreground" />
            </CardTitle>
            <CardDescription>
              Appointments trend for the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {weeklyStats.length > 0 ? (
              <ChartContainer
                config={appointmentChartConfig}
                className="h-48 md:h-64 w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stackId="1"
                      stroke="#457B9D"
                      fill="#457B9D"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      stackId="2"
                      stroke="#10B981"
                      fill="#10B981"
                      fillOpacity={0.4}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <BarChart3 className="w-12 h-12 opacity-30" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Week Summary Stats */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              <span>This Week Summary</span>
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
            </CardTitle>
            <CardDescription>
              Performance metrics for the current week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Total Appointments */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    Total Appointments
                  </span>
                  <span className="text-2xl font-bold text-foreground">
                    {stats.week.total}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.min(
                        100,
                        (stats.week.total / 100) * 100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Completion Rate */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    Completion Rate
                  </span>
                  <span className="text-2xl font-bold text-green-600">
                    {stats.week.total > 0
                      ? Math.round(
                          (stats.week.completed / stats.week.total) * 100
                        )
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-1000"
                    style={{
                      width: `${
                        stats.week.total > 0
                          ? (stats.week.completed / stats.week.total) * 100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Daily Average */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">
                    {stats.week.total > 0
                      ? Math.round(stats.week.total / 7)
                      : 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Daily Average</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {stats.week.completed}
                  </p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule & Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Today's Schedule */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5 text-primary" />
                Today's Schedule
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/staff/appointments/manage")}
              >
                <Eye className="w-4 h-4 mr-1" />
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {todayAppointments.length > 0 ? (
                todayAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() =>
                      navigate(`/staff/appointments/${appointment.id}`)
                    }
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-sm">
                          {appointment.appointment_time.slice(0, 5)}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            appointment.status === "completed"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : appointment.status === "confirmed"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : appointment.status === "pending"
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {appointment.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground font-medium truncate">
                        {appointment.patient_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {appointment.doctor_name} •{" "}
                        {appointment.services[0]?.name || "Consultation"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`tel:${appointment.patient?.phone}`);
                        }}
                      >
                        <Phone className="w-4 h-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={Calendar}
                  title="No Appointments Today"
                  description="You have a free day!"
                  variant="minimal"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Priority Alerts & Recent Feedback */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="w-5 h-5 text-primary" />
              Priority Alerts & Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {/* Urgent Alerts */}
              {urgentAlerts.map((alert, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    alert.severity === "warning"
                      ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                      : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {alert.severity === "warning" ? (
                      <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Bell className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p
                        className={`font-medium text-sm ${
                          alert.severity === "warning"
                            ? "text-red-800 dark:text-red-400"
                            : "text-blue-800 dark:text-blue-400"
                        }`}
                      >
                        {alert.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Recent Reviews */}
              {recentFeedback.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    Recent Reviews
                  </h4>
                  <div className="space-y-3">
                    {recentFeedback.slice(0, 3).map((feedback) => (
                      <div
                        key={feedback.id}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => navigate("/staff/feedback")}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < feedback.rating
                                      ? "text-yellow-400 fill-current"
                                      : "text-muted-foreground"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {feedback.patient_name}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {feedback.comment || "No comment provided"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(
                              new Date(feedback.created_at),
                              {
                                addSuffix: true,
                              }
                            )}
                          </p>
                        </div>
                        {!feedback.response && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-yellow-100 dark:bg-yellow-900/30"
                          >
                            Pending
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {urgentAlerts.length === 0 && recentFeedback.length === 0 && (
                <EmptyState
                  icon={CheckCircle2}
                  title="All Clear!"
                  description="No urgent items require your attention"
                  variant="minimal"
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StaffDashboard;
