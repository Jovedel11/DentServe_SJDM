import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  FiCalendar,
  FiClock,
  FiUser,
  FiMapPin,
  FiFileText,
  FiDownload,
  FiSearch,
  FiCheck,
  FiX,
  FiAlertCircle,
  FiTrendingUp,
  FiActivity,
  FiHeart,
  FiChevronDown,
  FiChevronRight,
} from "react-icons/fi";
import { LuPill } from "react-icons/lu";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/core/components/ui/chart";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useAuth } from "@/auth/context/AuthProvider";
import { useDashboardAnalytics } from "@/core/hooks/useDashboardAnalytics";
import { supabase } from "@/lib/supabaseClient";

/**
 * ✅ REAL INTEGRATED AppointmentHistory Component
 * Uses: useAuth, useDashboardAnalytics, direct Supabase calls
 * Features: Real patient analytics, appointment history, health scoring
 */
const AppointmentHistory = () => {
  const { user, profile, isPatient, userRole } = useAuth();

  // ✅ REAL DASHBOARD ANALYTICS HOOK
  const {
    dashboardData,
    loading: analyticsLoading,
    error: analyticsError,
    fetchDashboardData,
    refreshDashboard,
  } = useDashboardAnalytics();

  // ✅ LOCAL STATE FOR COMPONENT
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [expandedAppointment, setExpandedAppointment] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ REAL APPOINTMENT HISTORY DATA
  const [appointmentHistory, setAppointmentHistory] = useState([]);
  const [healthAnalytics, setHealthAnalytics] = useState(null);
  const [error, setError] = useState(null);

  // ✅ REAL DATA FETCHING
  useEffect(() => {
    const fetchAppointmentHistory = async () => {
      if (!isPatient()) return;

      setLoading(true);
      setError(null);

      try {
        // ✅ FETCH PATIENT ANALYTICS using get_patient_analytics
        const { data: analyticsData, error: analyticsError } =
          await supabase.rpc("get_patient_analytics", {
            p_user_id: null, // Uses current user
          });

        if (analyticsError) throw analyticsError;
        setHealthAnalytics(analyticsData);

        // ✅ FETCH APPOINTMENT HISTORY using get_appointments_by_role
        const { data: appointmentsData, error: appointmentsError } =
          await supabase.rpc("get_appointments_by_role", {
            p_status: null, // All statuses for history
            p_date_from: null, // All time
            p_date_to: null,
            p_limit: 200, // Large limit for history
            p_offset: 0,
          });

        if (appointmentsError) throw appointmentsError;

        if (appointmentsData.success) {
          const appointments = appointmentsData.data.appointments || [];

          // ✅ TRANSFORM TO MATCH COMPONENT EXPECTATIONS
          const transformedHistory = appointments.map((apt) => ({
            id: apt.id,
            type:
              apt.services?.map((s) => s.name).join(", ") ||
              "General Appointment",
            date: apt.appointment_date,
            time: apt.appointment_time,
            status: apt.status,
            doctor: apt.doctor?.name || "Unknown Doctor",
            clinic: apt.clinic?.name || "Unknown Clinic",
            cost:
              apt.services?.reduce(
                (sum, s) => sum + (parseFloat(s.price) || 0),
                0
              ) || 0,
            duration: `${apt.duration_minutes || 60} minutes`,
            notes: apt.notes || "",
            treatments:
              apt.services?.map((s) => ({
                name: s.name,
                completed: apt.status === "completed",
              })) || [],
            prescriptions: [], // Would need separate table/logic for prescriptions
            cancelledBy: apt.cancelled_by ? "clinic" : null,
            cancellationReason: apt.cancellation_reason || "",
            symptoms: apt.symptoms || "",
          }));

          setAppointmentHistory(transformedHistory);
        }

        // ✅ FETCH DASHBOARD DATA for additional analytics
        await fetchDashboardData();
      } catch (err) {
        setError(err.message);
        console.error("Error fetching appointment history:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user && isPatient()) {
      fetchAppointmentHistory();
    }
  }, [user, isPatient, fetchDashboardData]);

  // ✅ REAL ANALYTICS DATA derived from actual appointments
  const analyticsData = useMemo(() => {
    if (!appointmentHistory.length || !healthAnalytics) return null;

    const totalAppointments = appointmentHistory.length;
    const completedAppointments = appointmentHistory.filter(
      (apt) => apt.status === "completed"
    ).length;
    const totalCost = appointmentHistory.reduce(
      (sum, apt) => sum + apt.cost,
      0
    );

    // Find favorite clinic
    const clinicCounts = appointmentHistory.reduce((acc, apt) => {
      acc[apt.clinic] = (acc[apt.clinic] || 0) + 1;
      return acc;
    }, {});

    const favoriteClinicEntry = Object.entries(clinicCounts).reduce(
      (max, current) => (current[1] > max[1] ? current : max),
      ["Unknown", 0]
    );

    return {
      healthScore: Math.min(95, 60 + completedAppointments * 2), // Calculated health score
      improvementTrend: Math.min(25, Math.floor(completedAppointments / 2)), // Improvement percentage
      totalAppointments,
      completedAppointments,
      completedTreatments: appointmentHistory.filter(
        (apt) => apt.status === "completed" && apt.treatments.length > 0
      ).length,
      consistencyRating: Math.min(100, completedAppointments * 10),
      favoriteClinic: {
        name: favoriteClinicEntry[0],
        visits: favoriteClinicEntry[1],
      },
    };
  }, [appointmentHistory, healthAnalytics]);

  // ✅ REAL CHART DATA from actual appointments
  const healthTrendData = useMemo(() => {
    if (!appointmentHistory.length) return [];

    // Generate health trend based on appointment completion over time
    const monthlyData = {};
    appointmentHistory.forEach((apt) => {
      const month = new Date(apt.date).toISOString().substr(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { completed: 0, total: 0 };
      }
      monthlyData[month].total++;
      if (apt.status === "completed") {
        monthlyData[month].completed++;
      }
    });

    return Object.entries(monthlyData)
      .slice(-6) // Last 6 months
      .map(([month, data]) => ({
        month: new Date(month + "-01").toLocaleDateString("en", {
          month: "short",
          year: "2-digit",
        }),
        healthScore: Math.min(100, 50 + (data.completed / data.total) * 50),
      }));
  }, [appointmentHistory]);

  const appointmentTypeData = useMemo(() => {
    if (!appointmentHistory.length) return [];

    const statusCounts = appointmentHistory.reduce((acc, apt) => {
      acc[apt.status] = (acc[apt.status] || 0) + 1;
      return acc;
    }, {});

    return [
      {
        name: "Completed",
        value: statusCounts.completed || 0,
        color: "#10b981",
      },
      {
        name: "Cancelled",
        value: statusCounts.cancelled || 0,
        color: "#f59e0b",
      },
      {
        name: "No Show",
        value: statusCounts["no-show"] || 0,
        color: "#ef4444",
      },
    ].filter((item) => item.value > 0);
  }, [appointmentHistory]);

  const monthlyTrendsData = useMemo(() => {
    if (!appointmentHistory.length) return [];

    const monthlyStats = {};
    appointmentHistory.forEach((apt) => {
      const month = new Date(apt.date).toLocaleDateString("en", {
        month: "short",
      });
      if (!monthlyStats[month]) {
        monthlyStats[month] = { completed: 0, cancelled: 0, noShow: 0 };
      }
      if (apt.status === "completed") monthlyStats[month].completed++;
      if (apt.status === "cancelled") monthlyStats[month].cancelled++;
      if (apt.status === "no-show") monthlyStats[month].noShow++;
    });

    return Object.entries(monthlyStats).map(([month, stats]) => ({
      month,
      ...stats,
    }));
  }, [appointmentHistory]);

  // Chart configuration for shadcn/ui charts
  const chartConfig = {
    completed: { label: "Completed", color: "hsl(var(--chart-1))" },
    cancelled: { label: "Cancelled", color: "hsl(var(--chart-2))" },
    noShow: { label: "No Show", color: "hsl(var(--chart-3))" },
    healthScore: { label: "Health Score", color: "hsl(var(--chart-4))" },
    visits: { label: "Visits", color: "hsl(var(--chart-5))" },
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800";
      case "cancelled":
        return "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950 dark:border-amber-800";
      case "no-show":
        return "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950 dark:border-red-800";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-950 dark:border-gray-800";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <FiCheck className="w-4 h-4" />;
      case "cancelled":
        return <FiX className="w-4 h-4" />;
      case "no-show":
        return <FiAlertCircle className="w-4 h-4" />;
      default:
        return <FiClock className="w-4 h-4" />;
    }
  };

  // ✅ REAL FILTERING based on actual data
  const filteredAppointments = appointmentHistory.filter((appointment) => {
    const matchesSearch =
      searchQuery === "" ||
      appointment.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.doctor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.clinic.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || appointment.status === statusFilter;

    // Date range filtering
    if (dateRange !== "all") {
      const appointmentDate = new Date(appointment.date);
      const now = new Date();

      switch (dateRange) {
        case "30days":
          const thirtyDaysAgo = new Date(
            now.getTime() - 30 * 24 * 60 * 60 * 1000
          );
          if (appointmentDate < thirtyDaysAgo) return false;
          break;
        case "90days":
          const ninetyDaysAgo = new Date(
            now.getTime() - 90 * 24 * 60 * 60 * 1000
          );
          if (appointmentDate < ninetyDaysAgo) return false;
          break;
        case "thisYear":
          if (appointmentDate.getFullYear() !== now.getFullYear()) return false;
          break;
      }
    }

    return matchesSearch && matchesStatus;
  });

  const handleDownloadReport = () => {
    const reportData = `
APPOINTMENT HISTORY REPORT
=========================
Generated: ${new Date().toLocaleDateString()}
Patient: ${profile?.first_name} ${profile?.last_name}
Total Appointments: ${analyticsData?.totalAppointments || 0}
Completed: ${analyticsData?.completedAppointments || 0}
Health Score: ${analyticsData?.healthScore || 0}

APPOINTMENT DETAILS
==================
${filteredAppointments
  .map(
    (apt) => `
Date: ${new Date(apt.date).toLocaleDateString()}
Type: ${apt.type}
Doctor: ${apt.doctor}
Clinic: ${apt.clinic}
Status: ${apt.status.toUpperCase()}
Cost: $${apt.cost.toFixed(2)}
${apt.notes ? `Notes: ${apt.notes}` : ""}
---`
  )
  .join("\n")}

SUMMARY STATISTICS
=================
Favorite Clinic: ${analyticsData?.favoriteClinic.name} (${
      analyticsData?.favoriteClinic.visits
    } visits)
Total Cost: $${appointmentHistory
      .reduce((sum, apt) => sum + apt.cost, 0)
      .toFixed(2)}
Consistency Rating: ${analyticsData?.consistencyRating}%
    `;

    const blob = new Blob([reportData], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `appointment-history-${
      new Date().toISOString().split("T")[0]
    }.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleAppointmentDetails = (appointmentId) => {
    setExpandedAppointment(
      expandedAppointment === appointmentId ? null : appointmentId
    );
  };

  // ✅ ACCESS CONTROL
  if (!user || !isPatient()) {
    return (
      <div className="min-h-screen p-6 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-4">
              Access Denied
            </h1>
            <p className="text-muted-foreground">
              Only patients can view appointment history.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ ERROR STATE
  if (error) {
    return (
      <div className="min-h-screen p-6 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-4">
              Error Loading History
            </h1>
            <p className="text-red-600 mb-4">Error: {error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ LOADING STATE
  if (loading || analyticsLoading) {
    return (
      <div className="min-h-screen p-6 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-80 bg-muted rounded"></div>
              <div className="h-80 bg-muted rounded"></div>
            </div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ EMPTY STATE
  if (!appointmentHistory.length) {
    return (
      <div className="min-h-screen p-6 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <FiCalendar className="w-24 h-24 text-muted-foreground mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-foreground mb-4">
              No Appointment History
            </h1>
            <p className="text-muted-foreground mb-8">
              You haven't had any appointments yet.
            </p>
            <button className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90">
              Book Your First Appointment
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex justify-between items-start gap-6 mb-6 md:flex-row flex-col">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Appointment History
              </h1>
              <p className="text-muted-foreground">
                Complete overview of your dental appointments and health
                progress
              </p>
            </div>
            <button
              onClick={handleDownloadReport}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <FiDownload className="w-4 h-4" />
              Download Report
            </button>
          </div>
        </motion.div>

        {/* Analytics Cards */}
        {analyticsData && (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Health Score Card */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-100 rounded-lg dark:bg-green-900/20">
                  <FiHeart className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <FiTrendingUp className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    +{analyticsData.improvementTrend}%
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-foreground">
                  {analyticsData.healthScore}
                </h3>
                <p className="text-sm text-muted-foreground">Health Score</p>
                <p className="text-xs text-muted-foreground">
                  {analyticsData.consistencyRating}% consistency
                </p>
              </div>
            </div>

            {/* Total Appointments */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/20">
                  <FiCalendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-foreground">
                  {analyticsData.totalAppointments}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Total Appointments
                </p>
                <p className="text-xs text-muted-foreground">
                  {analyticsData.completedAppointments} completed
                </p>
              </div>
            </div>

            {/* Completed Treatments */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-100 rounded-lg dark:bg-purple-900/20">
                  <FiActivity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-foreground">
                  {analyticsData.completedTreatments}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Treatments Completed
                </p>
                <p className="text-xs text-muted-foreground">
                  Across all visits
                </p>
              </div>
            </div>

            {/* Favorite Clinic */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-orange-100 rounded-lg dark:bg-orange-900/20">
                  <FiMapPin className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-foreground truncate">
                  {analyticsData.favoriteClinic.name}
                </h3>
                <p className="text-sm text-muted-foreground">Favorite Clinic</p>
                <p className="text-xs text-muted-foreground">
                  {analyticsData.favoriteClinic.visits} visits
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Charts Section */}
        {healthTrendData.length > 0 && (
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {/* Health Score Trend */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Health Score Progress
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your dental health improvement over time
                </p>
              </div>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <LineChart data={healthTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="healthScore"
                    stroke="var(--color-healthScore)"
                    strokeWidth={3}
                    dot={{
                      fill: "var(--color-healthScore)",
                      strokeWidth: 2,
                      r: 4,
                    }}
                  />
                </LineChart>
              </ChartContainer>
            </div>

            {/* Appointment Status Breakdown */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Appointment Status
                </h3>
                <p className="text-sm text-muted-foreground">
                  Breakdown of your appointment history
                </p>
              </div>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <PieChart>
                  <Pie
                    data={appointmentTypeData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {appointmentTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            </div>
          </motion.div>
        )}

        {/* Monthly Trends Chart */}
        {monthlyTrendsData.length > 0 && (
          <motion.div
            className="bg-card border border-border rounded-lg p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Monthly Appointment Trends
              </h3>
              <p className="text-sm text-muted-foreground">
                Your appointment patterns over time
              </p>
            </div>
            <ChartContainer config={chartConfig} className="h-[400px]">
              <BarChart data={monthlyTrendsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="completed"
                  fill="var(--color-completed)"
                  name="Completed"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="cancelled"
                  fill="var(--color-cancelled)"
                  name="Cancelled"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="noShow"
                  fill="var(--color-noShow)"
                  name="No Show"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </motion.div>
        )}

        {/* Filters and Search */}
        <motion.div
          className="bg-card border border-border rounded-lg p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search appointments, doctors, or clinics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-input bg-background rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no-show">No Show</option>
              </select>

              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="all">All Time</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="thisYear">This Year</option>
              </select>
            </div>
          </div>

          {/* Appointment List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Appointment History ({filteredAppointments.length} records)
            </h3>

            {filteredAppointments.length === 0 ? (
              <div className="text-center py-12">
                <FiCalendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-medium text-foreground mb-2">
                  No appointments found
                </h4>
                <p className="text-muted-foreground">
                  Try adjusting your search or filters
                </p>
              </div>
            ) : (
              filteredAppointments.map((appointment, index) => (
                <motion.div
                  key={appointment.id}
                  className="border border-border rounded-lg overflow-hidden"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {/* Appointment Header */}
                  <div
                    className="p-4 cursor-pointer hover:bg-muted/20 transition-colors"
                    onClick={() => toggleAppointmentDetails(appointment.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div
                          className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            appointment.status
                          )}`}
                        >
                          {getStatusIcon(appointment.status)}
                          {appointment.status.charAt(0).toUpperCase() +
                            appointment.status.slice(1)}
                        </div>

                        <div className="flex-1">
                          <h4 className="font-medium text-foreground">
                            {appointment.type}
                          </h4>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <FiCalendar className="w-3 h-3" />
                              {new Date(appointment.date).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <FiClock className="w-3 h-3" />
                              {appointment.time}
                            </span>
                            <span className="flex items-center gap-1">
                              <FiUser className="w-3 h-3" />
                              {appointment.doctor}
                            </span>
                            <span className="flex items-center gap-1">
                              <FiMapPin className="w-3 h-3" />
                              {appointment.clinic}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {appointment.cost > 0 && (
                          <span className="text-sm font-medium text-foreground">
                            ₱{appointment.cost.toFixed(2)}
                          </span>
                        )}
                        {expandedAppointment === appointment.id ? (
                          <FiChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <FiChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedAppointment === appointment.id && (
                    <motion.div
                      className="border-t border-border bg-muted/20 p-6"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Treatments */}
                        <div>
                          <h5 className="font-medium text-foreground mb-3 flex items-center gap-2">
                            <FiActivity className="w-4 h-4" />
                            Treatments
                          </h5>
                          <div className="space-y-2">
                            {appointment.treatments.map((treatment, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 text-sm"
                              >
                                {treatment.completed ? (
                                  <FiCheck className="w-3 h-3 text-green-600" />
                                ) : (
                                  <FiX className="w-3 h-3 text-red-600" />
                                )}
                                <span
                                  className={
                                    treatment.completed
                                      ? "text-foreground"
                                      : "text-muted-foreground line-through"
                                  }
                                >
                                  {treatment.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Prescriptions */}
                        <div>
                          <h5 className="font-medium text-foreground mb-3 flex items-center gap-2">
                            <LuPill className="w-4 h-4" />
                            Prescriptions
                          </h5>
                          {appointment.prescriptions.length > 0 ? (
                            <div className="space-y-2">
                              {appointment.prescriptions.map(
                                (prescription, idx) => (
                                  <div key={idx} className="text-sm">
                                    <div className="font-medium text-foreground">
                                      {prescription.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {prescription.dosage} •{" "}
                                      {prescription.duration}
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No prescriptions
                            </p>
                          )}
                        </div>

                        {/* Notes & Details */}
                        <div>
                          <h5 className="font-medium text-foreground mb-3 flex items-center gap-2">
                            <FiFileText className="w-4 h-4" />
                            Details
                          </h5>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">
                                Duration:{" "}
                              </span>
                              <span className="text-foreground">
                                {appointment.duration}
                              </span>
                            </div>
                            {appointment.cancelledBy && (
                              <>
                                <div>
                                  <span className="text-muted-foreground">
                                    Cancelled by:{" "}
                                  </span>
                                  <span className="text-foreground capitalize">
                                    {appointment.cancelledBy}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">
                                    Reason:{" "}
                                  </span>
                                  <span className="text-foreground">
                                    {appointment.cancellationReason}
                                  </span>
                                </div>
                              </>
                            )}
                            {appointment.notes && (
                              <div>
                                <span className="text-muted-foreground">
                                  Notes:{" "}
                                </span>
                                <p className="text-foreground mt-1">
                                  {appointment.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Debug Info */}
        <details className="mt-8 p-4 bg-muted rounded-lg">
          <summary className="cursor-pointer font-medium">Debug Info</summary>
          <div className="mt-2 space-y-1 text-sm">
            <div>Total appointments: {appointmentHistory.length}</div>
            <div>Filtered appointments: {filteredAppointments.length}</div>
            <div>
              Health Analytics: {healthAnalytics ? "Loaded" : "Not loaded"}
            </div>
            <div>Dashboard Data: {dashboardData ? "Loaded" : "Not loaded"}</div>
            <div>Loading: {loading ? "Yes" : "No"}</div>
            <div>Error: {error || "None"}</div>
          </div>
        </details>
      </div>
    </div>
  );
};

export default AppointmentHistory;
