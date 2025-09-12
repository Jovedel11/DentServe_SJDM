import React, { useState, useEffect } from "react";
import {
  Calendar,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Star,
  Award,
  Activity,
  Phone,
  MoreVertical,
  Eye,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/core/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import Delete from "@/test/add-delete-users/Delete";

const StaffDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    todayAppointments: [],
    weeklyStats: [],
    clinicGrowth: {},
    recentFeedback: [],
    cancelledAppointments: [],
    loading: true,
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Mock data based on your table structures
  useEffect(() => {
    // Simulate loading and set mock data
    setTimeout(() => {
      setDashboardData({
        // Mock today's appointments based on appointments table
        todayAppointments: [
          {
            id: "apt-001",
            appointment_date: "2025-08-21",
            appointment_time: "09:00:00",
            status: "pending",
            service_type: "Regular Checkup",
            patient: {
              first_name: "John",
              last_name: "Doe",
              phone: "+63-912-345-6789",
              email: "john.doe@email.com",
            },
            doctor: {
              user: { first_name: "Dr. Sarah", last_name: "Smith" },
              specialization: "General Dentistry",
            },
          },
          {
            id: "apt-002",
            appointment_date: "2025-08-21",
            appointment_time: "10:30:00",
            status: "completed",
            service_type: "Teeth Cleaning",
            patient: {
              first_name: "Maria",
              last_name: "Garcia",
              phone: "+63-917-234-5678",
              email: "maria.g@email.com",
            },
            doctor: {
              user: { first_name: "Dr. Michael", last_name: "Johnson" },
              specialization: "Oral Hygiene",
            },
          },
          {
            id: "apt-003",
            appointment_date: "2025-08-21",
            appointment_time: "14:00:00",
            status: "pending",
            service_type: "Root Canal",
            patient: {
              first_name: "James",
              last_name: "Wilson",
              phone: "+63-918-345-6789",
              email: "james.w@email.com",
            },
            doctor: {
              user: { first_name: "Dr. Lisa", last_name: "Brown" },
              specialization: "Endodontics",
            },
          },
          {
            id: "apt-004",
            appointment_date: "2025-08-21",
            appointment_time: "15:30:00",
            status: "cancelled",
            service_type: "Consultation",
            patient: {
              first_name: "Anna",
              last_name: "Davis",
              phone: "+63-919-456-7890",
              email: "anna.d@email.com",
            },
            doctor: {
              user: { first_name: "Dr. Sarah", last_name: "Smith" },
              specialization: "General Dentistry",
            },
            cancellation_reason: "Patient emergency",
          },
        ],

        // Mock weekly stats for chart
        weeklyStats: [
          {
            day: "Mon",
            date: "2025-08-15",
            total: 8,
            completed: 6,
            pending: 2,
            cancelled: 0,
          },
          {
            day: "Tue",
            date: "2025-08-16",
            total: 12,
            completed: 10,
            pending: 1,
            cancelled: 1,
          },
          {
            day: "Wed",
            date: "2025-08-17",
            total: 15,
            completed: 13,
            pending: 2,
            cancelled: 0,
          },
          {
            day: "Thu",
            date: "2025-08-18",
            total: 10,
            completed: 8,
            pending: 2,
            cancelled: 0,
          },
          {
            day: "Fri",
            date: "2025-08-19",
            total: 14,
            completed: 12,
            pending: 1,
            cancelled: 1,
          },
          {
            day: "Sat",
            date: "2025-08-20",
            total: 6,
            completed: 5,
            pending: 1,
            cancelled: 0,
          },
          {
            day: "Sun",
            date: "2025-08-21",
            total: 4,
            completed: 1,
            pending: 2,
            cancelled: 1,
          },
        ],

        // Mock clinic growth based on your get_clinic_growth_stats function
        clinicGrowth: {
          patient_growth_30d: 24,
          patient_growth_rate: 15.5,
          total_patients: 156,
          appointment_growth_30d: 89,
          appointment_growth_rate: 22.3,
          completion_rate: 88.5,
          clinic_performance_score: 92,
        },

        // Mock recent feedback based on feedback table
        recentFeedback: [
          {
            id: "feedback-001",
            rating: 5,
            comment:
              "Excellent service! Dr. Smith was very professional and the staff was friendly.",
            patient: { first_name: "John", last_name: "Doe" },
            doctor: { user: { first_name: "Dr. Sarah", last_name: "Smith" } },
            created_at: "2025-08-20T10:30:00Z",
          },
          {
            id: "feedback-002",
            rating: 4,
            comment:
              "Great experience overall. Clean facility and good treatment.",
            patient: { first_name: "Maria", last_name: "Garcia" },
            doctor: {
              user: { first_name: "Dr. Michael", last_name: "Johnson" },
            },
            created_at: "2025-08-19T15:45:00Z",
          },
          {
            id: "feedback-003",
            rating: 5,
            comment:
              "Very satisfied with the root canal treatment. No pain at all!",
            patient: { first_name: "James", last_name: "Wilson" },
            doctor: { user: { first_name: "Dr. Lisa", last_name: "Brown" } },
            created_at: "2025-08-18T14:20:00Z",
          },
        ],

        // Mock cancelled appointments needing follow-up
        cancelledAppointments: [
          {
            id: "apt-004",
            appointment_date: "2025-08-21",
            appointment_time: "15:30:00",
            patient: {
              first_name: "Anna",
              last_name: "Davis",
              phone: "+63-919-456-7890",
            },
            doctor: { user: { first_name: "Dr. Sarah", last_name: "Smith" } },
            cancellation_reason: "Patient emergency",
            cancelled_at: "2025-08-21T08:30:00Z",
          },
          {
            id: "apt-005",
            appointment_date: "2025-08-22",
            appointment_time: "11:00:00",
            patient: {
              first_name: "Robert",
              last_name: "Taylor",
              phone: "+63-920-567-8901",
            },
            doctor: {
              user: { first_name: "Dr. Michael", last_name: "Johnson" },
            },
            cancellation_reason: "Schedule conflict",
            cancelled_at: "2025-08-20T16:45:00Z",
          },
        ],

        loading: false,
      });
    }, 1500); // Simulate loading time
  }, []);

  // Chart configurations using your dental care theme
  const appointmentChartConfig = {
    total: {
      label: "Total",
      color: "#457B9D", // var(--dental-teal)
    },
    completed: {
      label: "Completed",
      color: "#10B981", // success green
    },
    pending: {
      label: "Pending",
      color: "#F59E0B", // warning yellow
    },
    cancelled: {
      label: "Cancelled",
      color: "#EF4444", // error red
    },
  };

  if (dashboardData.loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded-lg w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-muted rounded-xl"></div>
            <div className="h-80 bg-muted rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  const {
    todayAppointments,
    weeklyStats,
    clinicGrowth,
    recentFeedback,
    cancelledAppointments,
  } = dashboardData;

  // Calculate today's stats
  const todayStats = {
    total: todayAppointments.length,
    completed: todayAppointments.filter((apt) => apt.status === "completed")
      .length,
    pending: todayAppointments.filter((apt) => apt.status === "pending").length,
    cancelled: todayAppointments.filter((apt) => apt.status === "cancelled")
      .length,
  };

  const nextAppointment = todayAppointments.find((apt) => {
    const aptTime = new Date(`${apt.appointment_date}T${apt.appointment_time}`);
    return aptTime > currentTime && apt.status === "pending";
  });

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6 md:space-y-8">
      <Delete />
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Welcome Back, Staff! 👋
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
        </div>

        {nextAppointment && (
          <div className="glass-effect px-4 py-3 rounded-lg border-l-4 border-l-primary w-full sm:w-auto">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-primary" />
              <span className="font-medium">
                Next: {nextAppointment.appointment_time.slice(0, 5)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {nextAppointment.patient?.first_name}{" "}
              {nextAppointment.patient?.last_name}
            </p>
          </div>
        )}
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Today's Appointments */}
        <div className="bg-card border border-border rounded-xl p-4 md:p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs md:text-sm font-medium text-muted-foreground">
                Today's Appointments
              </p>
              <p className="text-2xl md:text-3xl font-bold text-foreground mt-2">
                {todayStats.total}
              </p>
              <div className="flex items-center gap-3 mt-3 text-xs">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  {todayStats.completed} Done
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  {todayStats.pending} Pending
                </span>
              </div>
            </div>
            <div className="p-2 md:p-3 bg-primary/10 rounded-lg">
              <Calendar className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
          </div>
        </div>

        {/* New Patients Growth */}
        <div className="bg-card border border-border rounded-xl p-4 md:p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs md:text-sm font-medium text-muted-foreground">
                New Patients (30d)
              </p>
              <p className="text-2xl md:text-3xl font-bold text-foreground mt-2">
                {clinicGrowth.patient_growth_30d}
              </p>
              <div className="flex items-center gap-1 mt-3">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span className="text-xs text-green-600 font-medium">
                  +{clinicGrowth.patient_growth_rate}%
                </span>
              </div>
            </div>
            <div className="p-2 md:p-3 bg-green-500/10 rounded-lg">
              <Users className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Clinic Performance */}
        <div className="bg-card border border-border rounded-xl p-4 md:p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs md:text-sm font-medium text-muted-foreground">
                Performance Score
              </p>
              <p className="text-2xl md:text-3xl font-bold text-foreground mt-2">
                {clinicGrowth.clinic_performance_score}
              </p>
              <div className="flex items-center gap-1 mt-3">
                <Star className="w-3 h-3 text-amber-500" />
                <span className="text-xs text-amber-600 font-medium">
                  {clinicGrowth.completion_rate}% completion
                </span>
              </div>
            </div>
            <div className="p-2 md:p-3 bg-amber-500/10 rounded-lg">
              <Award className="w-5 h-5 md:w-6 md:h-6 text-amber-600" />
            </div>
          </div>
        </div>

        {/* Cancelled Appointments Alert */}
        <div className="bg-card border border-border rounded-xl p-4 md:p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs md:text-sm font-medium text-muted-foreground">
                Cancelled Today
              </p>
              <p className="text-2xl md:text-3xl font-bold text-foreground mt-2">
                {todayStats.cancelled}
              </p>
              {cancelledAppointments.length > 0 && (
                <p className="text-xs text-red-600 font-medium mt-3">
                  Requires follow-up
                </p>
              )}
            </div>
            <div className="p-2 md:p-3 bg-red-500/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Weekly Appointments Trend */}
        <div className="bg-card border border-border rounded-xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">
              Weekly Overview
            </h3>
            <Activity className="w-5 h-5 text-muted-foreground" />
          </div>

          <ChartContainer
            config={appointmentChartConfig}
            className="h-48 md:h-64"
          >
            <AreaChart data={weeklyStats}>
              <CartesianGrid strokeDasharray="3 3" />
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
          </ChartContainer>
        </div>

        {/* Clinic Growth Metrics */}
        <div className="bg-card border border-border rounded-xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">
              Growth Metrics
            </h3>
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Patient Growth
              </span>
              <span className="text-lg font-bold text-green-600">
                +{clinicGrowth.patient_growth_rate}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.min(
                    100,
                    Math.abs(clinicGrowth.patient_growth_rate)
                  )}%`,
                }}
              ></div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Appointment Growth
              </span>
              <span className="text-lg font-bold text-blue-600">
                +{clinicGrowth.appointment_growth_rate}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.min(
                    100,
                    Math.abs(clinicGrowth.appointment_growth_rate)
                  )}%`,
                }}
              ></div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div className="text-center">
                <p className="text-xl md:text-2xl font-bold text-primary">
                  {clinicGrowth.total_patients}
                </p>
                <p className="text-xs text-muted-foreground">Total Patients</p>
              </div>
              <div className="text-center">
                <p className="text-xl md:text-2xl font-bold text-secondary">
                  {clinicGrowth.appointment_growth_30d}
                </p>
                <p className="text-xs text-muted-foreground">
                  Appointments (30d)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Items Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Today's Schedule */}
        <div className="bg-card border border-border rounded-xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              Today's Schedule
            </h3>
            <Eye className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {todayAppointments.length > 0 ? (
              todayAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {appointment.appointment_time.slice(0, 5)}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          appointment.status === "completed"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : appointment.status === "pending"
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {appointment.status}
                      </span>
                    </div>
                    <p className="text-sm text-foreground font-medium truncate">
                      {appointment.patient?.first_name}{" "}
                      {appointment.patient?.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {appointment.doctor?.user?.first_name}{" "}
                      {appointment.doctor?.user?.last_name} •{" "}
                      {appointment.service_type}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {appointment.patient?.phone && (
                      <button
                        onClick={() =>
                          window.open(`tel:${appointment.patient.phone}`)
                        }
                        className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                        title="Call Patient"
                      >
                        <Phone className="w-4 h-4 text-primary" />
                      </button>
                    )}
                    <button className="p-2 hover:bg-muted/50 rounded-lg transition-colors">
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No appointments scheduled for today</p>
              </div>
            )}
          </div>
        </div>

        {/* Priority Alerts & Recent Feedback */}
        <div className="bg-card border border-border rounded-xl p-4 md:p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Priority Alerts
          </h3>
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {/* Cancelled Appointments Alert */}
            {cancelledAppointments.length > 0 && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-red-800 dark:text-red-400">
                      {cancelledAppointments.length} Recent Cancellation
                      {cancelledAppointments.length > 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                      Follow up with patients for rescheduling
                    </p>
                  </div>
                </div>
              </div>
            )}

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
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
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
                            {feedback.patient?.first_name}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {feedback.comment}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Growth Achievement */}
            {clinicGrowth.patient_growth_rate > 10 && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-green-800 dark:text-green-400">
                      Great Growth! 🎉
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-500">
                      {clinicGrowth.patient_growth_rate}% patient growth this
                      month
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
