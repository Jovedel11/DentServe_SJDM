import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  MapPin,
  Heart,
  Star,
  CheckCircle2,
  Stethoscope,
  Activity,
  BarChart3,
  ArrowRight,
  Search,
  Navigation,
  Phone,
  Calendar as CalendarIcon,
  TrendingUp,
  Award,
  Shield,
  Users,
  AlertCircle,
  Sparkles,
  RefreshCw,
  X,
  Ban,
  Eye,
  Filter,
} from "lucide-react";
import {
  format,
  isToday,
  isTomorrow,
  differenceInDays,
  parseISO,
  formatDistanceToNow,
} from "date-fns";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/core/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useAuth } from "@/auth/context/AuthProvider";
import { useDashboardAnalytics } from "@/core/hooks/useDashboardAnalytics";
import { usePatientAppointmentHistory } from "@/core/hooks/usePatientAppointmentHistory";
import { usePatientAppointments } from "@/core/hooks/usePatientAppointment";

/**
 * Production Patient Dashboard - Targeted Integration
 */
const PatientDashboard = () => {
  const { profile, user, isPatient, loading: authLoading } = useAuth();

  // ✅ KEEP: useDashboardAnalytics for dashboard overview
  const {
    dashboardData,
    loading: dashboardLoading,
    error: dashboardError,
    refreshDashboard,
    hasData,
  } = useDashboardAnalytics();

  // ✅ KEEP: usePatientAppointmentHistory for health analytics, trends, etc.
  const {
    appointments: historyAppointments,
    archivedAppointments,
    healthAnalytics,
    filteredAppointments,
    loading: historyLoading,
    error: historyError,
    fetchAppointmentData,
    totalAppointments,
    completedAppointments,
    pendingCount,
    confirmedCount,
    cancelledCount,
    healthScore,
    improvementTrend,
    consistencyRating,
    totalSpent,
    avgAppointmentCost,
    archiveAppointment,
    unarchiveAppointment,
    deleteArchivedAppointment,
  } = usePatientAppointmentHistory();

  // ✅ NEW: usePatientAppointments ONLY for upcoming appointments section
  const {
    appointments: liveAppointments,
    loading: appointmentsLoading,
    error: appointmentsError,
    upcomingAppointments,
    cancelAppointment,
    canCancelAppointment,
    refresh: refreshAppointments,
    getAppointmentDetails,
  } = usePatientAppointments();

  // Local state for UI management
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  // ✅ UTILITY FUNCTIONS (moved to top to avoid hoisting issues)
  const getNotificationIcon = useCallback((type) => {
    switch (type) {
      case "appointment_confirmed":
        return CheckCircle2;
      case "appointment_reminder":
        return Calendar;
      case "feedback_request":
        return Star;
      case "health_improvement":
        return TrendingUp;
      default:
        return Activity;
    }
  }, []);

  const getNotificationColor = useCallback((type) => {
    switch (type) {
      case "appointment_confirmed":
        return "text-success";
      case "appointment_reminder":
        return "text-info";
      case "feedback_request":
        return "text-warning";
      case "health_improvement":
        return "text-success";
      default:
        return "text-muted-foreground";
    }
  }, []);

  const getAppointmentTimeLabel = useCallback((date) => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    const days = differenceInDays(date, new Date());
    if (days <= 7) return `In ${days} days`;
    return format(date, "MMM dd");
  }, []);

  const getHealthScoreColor = useCallback((score) => {
    if (score >= 90) return "text-success";
    if (score >= 70) return "text-warning";
    return "text-destructive";
  }, []);

  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  // ✅ STATUS BADGE HELPER for upcoming appointments
  const getStatusBadge = useCallback((status) => {
    const statusConfig = {
      pending: {
        bg: "bg-warning/10",
        text: "text-warning",
        border: "border-warning/20",
        label: "Pending",
      },
      confirmed: {
        bg: "bg-success/10",
        text: "text-success",
        border: "border-success/20",
        label: "Confirmed",
      },
      completed: {
        bg: "bg-info/10",
        text: "text-info",
        border: "border-info/20",
        label: "Completed",
      },
      cancelled: {
        bg: "bg-destructive/10",
        text: "text-destructive",
        border: "border-destructive/20",
        label: "Cancelled",
      },
    };

    return statusConfig[status] || statusConfig.pending;
  }, []);

  // ✅ COMPUTED DASHBOARD DATA (using original logic)
  const computedDashboardData = useMemo(() => {
    if (!dashboardData || !profile) return null;

    const dashboardInfo = dashboardData;
    const profileCompletion = dashboardInfo?.profile_completion || null;
    const upcomingDashboardAppointments =
      dashboardInfo?.upcoming_appointments || [];
    const recentAppointments = dashboardInfo?.recent_appointments || [];
    const quickStats = dashboardInfo?.quick_stats || {};
    const notifications = dashboardInfo?.notifications || [];

    return {
      userProfile: {
        first_name: profile?.profile?.first_name,
        last_name: profile?.profile?.last_name,
        profile_image_url: profile?.profile?.profile_image_url,
        profile_completion: profileCompletion,
      },
      analytics: {
        total_appointments:
          quickStats?.total_appointments || totalAppointments || 0,
        completed_appointments:
          quickStats?.completed_appointments || completedAppointments || 0,
        cancelled_appointments:
          quickStats?.cancelled_appointments || cancelledCount || 0,
        upcoming_appointments:
          upcomingDashboardAppointments?.length ||
          confirmedCount + pendingCount ||
          0,
        favorite_clinic: quickStats?.favorite_clinic || null,
        last_appointment: quickStats?.last_appointment || null,
        health_score: healthScore || 0,
      },
      recentNotifications: notifications.slice(0, 5).map((notif) => ({
        id: notif.id,
        type: notif.type || "general",
        title: notif.title,
        description: notif.message,
        timestamp: new Date(notif.created_at),
        icon: getNotificationIcon(notif.type),
        color: getNotificationColor(notif.type),
        priority: notif.priority || "medium",
      })),
    };
  }, [
    dashboardData,
    profile,
    healthScore,
    totalAppointments,
    completedAppointments,
    confirmedCount,
    pendingCount,
    cancelledCount,
    getNotificationIcon,
    getNotificationColor,
  ]);

  // ✅ HEALTH ANALYTICS from usePatientAppointmentHistory (KEEP ORIGINAL)
  const healthAnalyticsData = useMemo(() => {
    if (!healthAnalytics && !healthScore) return null;

    return {
      health_score: healthScore || healthAnalytics?.health_score || 0,
      improvement_trend:
        improvementTrend || healthAnalytics?.improvement_trend || 1,
      total_appointments:
        totalAppointments || healthAnalytics?.total_appointments || 0,
      completed_treatments:
        completedAppointments || healthAnalytics?.completed_treatments || 0,
      consistency_rating:
        consistencyRating || healthAnalytics?.consistency_rating || 0,
      last_visit: healthAnalytics?.last_visit || null,
      next_recommended_visit: healthAnalytics?.next_recommended_visit || null,
    };
  }, [
    healthAnalytics,
    healthScore,
    improvementTrend,
    totalAppointments,
    completedAppointments,
    consistencyRating,
  ]);

  // ✅ APPOINTMENT TRENDS from historyAppointments (KEEP ORIGINAL)
  const appointmentTrends = useMemo(() => {
    if (!historyAppointments || historyAppointments.length === 0) return [];

    const monthlyData = {};
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      return {
        month: format(date, "MMM"),
        year: date.getFullYear(),
        key: format(date, "yyyy-MM"),
      };
    });

    last6Months.forEach(({ month, key }) => {
      monthlyData[key] = {
        month,
        appointments: 0,
        completed: 0,
        cancelled: 0,
        health_score: healthScore || 0,
      };
    });

    historyAppointments.forEach((apt) => {
      const monthKey = format(new Date(apt.date), "yyyy-MM");
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].appointments++;
        if (apt.status === "completed") monthlyData[monthKey].completed++;
        if (apt.status === "cancelled") monthlyData[monthKey].cancelled++;
      }
    });

    return Object.values(monthlyData);
  }, [historyAppointments, healthScore]);

  // ✅ PENDING REVIEWS from historyAppointments (KEEP ORIGINAL)
  const pendingReviews = useMemo(() => {
    if (!historyAppointments) return [];

    return historyAppointments
      .filter(
        (apt) =>
          apt.status === "completed" &&
          !apt.hasReview &&
          differenceInDays(new Date(), new Date(apt.date)) <= 7
      )
      .slice(0, 3)
      .map((apt) => ({
        id: apt.id,
        appointment_id: apt.id,
        doctor_name: apt.doctor,
        doctor_image: `https://images.unsplash.com/photo-1594824797384-5ee1ec5d9e3b?w=400&h=400&fit=crop&crop=face`,
        clinic_name: apt.clinic,
        service: apt.type,
        appointment_date: new Date(apt.date),
      }));
  }, [historyAppointments]);

  // ✅ CANCEL APPOINTMENT HANDLER (for upcoming appointments only)
  const handleCancelAppointment = useCallback(async () => {
    if (!selectedAppointment || !cancellationReason.trim()) return;

    setCancelLoading(true);
    try {
      const result = await cancelAppointment(
        selectedAppointment.id,
        cancellationReason.trim()
      );

      if (result.success) {
        setShowCancelModal(false);
        setSelectedAppointment(null);
        setCancellationReason("");
        // Also refresh the history data to sync
        fetchAppointmentData(true);
      } else {
        console.error("Cancellation failed:", result.error);
      }
    } catch (error) {
      console.error("Cancel appointment error:", error);
    } finally {
      setCancelLoading(false);
    }
  }, [
    selectedAppointment,
    cancellationReason,
    cancelAppointment,
    fetchAppointmentData,
  ]);

  // ✅ REFRESH HANDLERS (updated to include both hooks)
  const handleRefreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshDashboard(),
        fetchAppointmentData(true),
        refreshAppointments(), // ✅ Also refresh upcoming appointments
      ]);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshDashboard, fetchAppointmentData, refreshAppointments]);

  // Auto-refresh on mount
  useEffect(() => {
    if (user && isPatient()) {
      // Data will be auto-fetched by hooks
    }
  }, [user, isPatient]);

  // ✅ ACTION HANDLERS (KEEP ORIGINAL)
  const handleBookAppointment = useCallback(() => {
    window.location.href = "/patient/appointments/book";
  }, []);

  const handleViewAppointments = useCallback(() => {
    window.location.href = "/patient/appointments/upcoming";
  }, []);

  const handleFindDentist = useCallback(() => {
    window.location.href = "/patient/dentists";
  }, []);

  const handleFindClinics = useCallback(() => {
    window.location.href = "/patient/clinics";
  }, []);

  const handleSubmitReview = useCallback((appointmentId) => {
    window.location.href = `/patient/appointments/${appointmentId}/review`;
  }, []);

  const openCancelModal = useCallback((appointment) => {
    setSelectedAppointment(appointment);
    setShowCancelModal(true);
    setCancellationReason("");
  }, []);

  // ✅ LOADING STATE (include both sets of hooks)
  const isLoading = authLoading || dashboardLoading || historyLoading;
  const hasError = dashboardError || historyError || appointmentsError;

  if (isLoading && !computedDashboardData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Activity className="h-8 w-8 text-primary animate-pulse" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                Loading your dashboard...
              </h2>
              <p className="text-muted-foreground">
                Gathering your latest health insights
              </p>
            </div>
          </div>

          {/* Loading Skeleton */}
          <div className="space-y-8 animate-pulse">
            <div className="h-8 bg-muted rounded-lg w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded-2xl"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 h-96 bg-muted rounded-2xl"></div>
              <div className="h-96 bg-muted rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (hasError && !computedDashboardData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card border border-destructive/20 rounded-2xl p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Something went wrong
          </h2>
          <p className="text-muted-foreground mb-6">
            {dashboardError ||
              historyError ||
              appointmentsError ||
              "Failed to load dashboard data"}
          </p>
          <button
            onClick={handleRefreshAll}
            disabled={refreshing}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ✅ Use computed data or fallbacks
  const userProfile = computedDashboardData?.userProfile;
  const analytics = computedDashboardData?.analytics;
  const recentActivity = computedDashboardData?.recentNotifications || [];

  // Chart configuration
  const chartConfig = {
    appointments: {
      label: "Total Appointments",
      color: "hsl(var(--primary))",
    },
    completed: {
      label: "Completed",
      color: "hsl(var(--success))",
    },
    cancelled: {
      label: "Cancelled",
      color: "hsl(var(--destructive))",
    },
    health_score: {
      label: "Health Score",
      color: "hsl(var(--accent))",
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* ✅ WELCOME HEADER (KEEP ORIGINAL) */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 rounded-3xl"></div>
          <div className="relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-3xl p-8">
            <div className="flex items-center justify-between md:flex-row flex-col md:text-left text-center gap-6">
              <div className="flex items-center gap-6 md:flex-row flex-col">
                {userProfile?.profile_image_url && (
                  <div className="relative">
                    <img
                      src={userProfile.profile_image_url}
                      alt="Profile"
                      className="w-16 h-16 rounded-full object-cover border-4 border-primary/20"
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-success rounded-full border-2 border-background flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    </div>
                  </div>
                )}
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                    {getGreeting()}, {userProfile?.first_name || "Welcome back"}
                    ! 👋
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    Here's your personalized dental health overview
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Last updated: {format(lastRefresh, "MMM dd, h:mm a")}
                  </p>
                </div>
              </div>

              {/* ✅ HEALTH SCORE (from usePatientAppointmentHistory) */}
              <div className="flex items-center gap-4">
                {healthAnalyticsData?.health_score && (
                  <div className="text-center">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium text-muted-foreground">
                        Health Score
                      </span>
                    </div>
                    <div
                      className={`text-2xl font-bold ${getHealthScoreColor(
                        healthAnalyticsData.health_score
                      )}`}
                    >
                      {healthAnalyticsData.health_score}%
                    </div>
                  </div>
                )}
                {healthAnalyticsData?.improvement_trend > 1 && (
                  <div className="flex items-center gap-1 text-success">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">Improving</span>
                  </div>
                )}
                <button
                  onClick={handleRefreshAll}
                  disabled={refreshing}
                  className="p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors disabled:opacity-50"
                  title="Refresh dashboard"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ✅ STATS CARDS (KEEP ORIGINAL - using usePatientAppointmentHistory) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {/* Total Appointments */}
          <div className="group bg-card border border-border rounded-2xl p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Total
                </div>
                <div className="text-sm text-muted-foreground">All Time</div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-foreground">
                {analytics?.total_appointments || 0}
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                Appointments
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <span className="text-muted-foreground">
                  {analytics?.completed_appointments || 0} completed
                </span>
              </div>
            </div>
          </div>

          {/* Health Score */}
          <div className="group bg-card border border-border rounded-2xl p-6 hover:shadow-lg hover:border-success/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-success/10 rounded-xl group-hover:bg-success/20 transition-colors">
                <Activity className="h-6 w-6 text-success" />
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Health
                </div>
                <div className="text-sm text-muted-foreground">Score</div>
              </div>
            </div>
            <div className="space-y-1">
              <div
                className={`text-3xl font-bold ${getHealthScoreColor(
                  healthAnalyticsData?.health_score || 0
                )}`}
              >
                {healthAnalyticsData?.health_score || 0}%
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                Health Score
              </div>
              {healthAnalyticsData?.improvement_trend > 1 && (
                <div className="flex items-center gap-1 text-xs text-success">
                  <TrendingUp className="h-3 w-3" />
                  <span>
                    +
                    {(
                      (healthAnalyticsData.improvement_trend - 1) *
                      100
                    ).toFixed(0)}
                    % trend
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Appointments */}
          <div className="group bg-card border border-border rounded-2xl p-6 hover:shadow-lg hover:border-info/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-info/10 rounded-xl group-hover:bg-info/20 transition-colors">
                <Clock className="h-6 w-6 text-info" />
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Next
                </div>
                <div className="text-sm text-muted-foreground">Visit</div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-foreground">
                {analytics?.upcoming_appointments || 0}
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                Scheduled
              </div>
              {healthAnalyticsData?.next_recommended_visit && (
                <div className="text-xs text-muted-foreground">
                  Next recommended:{" "}
                  {format(
                    parseISO(healthAnalyticsData.next_recommended_visit),
                    "MMM dd"
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Consistency Rating */}
          <div className="group bg-card border border-border rounded-2xl p-6 hover:shadow-lg hover:border-warning/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-warning/10 rounded-xl group-hover:bg-warning/20 transition-colors">
                <Award className="h-6 w-6 text-warning" />
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Care
                </div>
                <div className="text-sm text-muted-foreground">Rating</div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-foreground">
                {healthAnalyticsData?.consistency_rating || 0}%
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                Consistency
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                <span>Great routine!</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ✅ QUICK ACTIONS (KEEP ORIGINAL) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Quick Actions
              </h2>
              <p className="text-sm text-muted-foreground">
                Everything you need at your fingertips
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={handleBookAppointment}
              className="group relative p-6 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl hover:from-primary/10 hover:to-primary/20 hover:border-primary/30 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-4 bg-primary/10 rounded-xl group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    Book Appointment
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Schedule your next visit
                  </div>
                </div>
              </div>
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="h-4 w-4 text-primary" />
              </div>
            </button>

            <button
              onClick={handleFindDentist}
              className="group relative p-6 bg-gradient-to-br from-success/5 to-success/10 border border-success/20 rounded-2xl hover:from-success/10 hover:to-success/20 hover:border-success/30 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-4 bg-success/10 rounded-xl group-hover:bg-success/20 group-hover:scale-110 transition-all duration-300">
                  <Stethoscope className="h-6 w-6 text-success" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    Find Specialists
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Browse expert dentists
                  </div>
                </div>
              </div>
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="h-4 w-4 text-success" />
              </div>
            </button>

            <button
              onClick={handleFindClinics}
              className="group relative p-6 bg-gradient-to-br from-info/5 to-info/10 border border-info/20 rounded-2xl hover:from-info/10 hover:to-info/20 hover:border-info/30 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-4 bg-info/10 rounded-xl group-hover:bg-info/20 group-hover:scale-110 transition-all duration-300">
                  <Search className="h-6 w-6 text-info" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    Find Clinics
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Discover nearby centers
                  </div>
                </div>
              </div>
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="h-4 w-4 text-info" />
              </div>
            </button>

            <button
              onClick={() =>
                (window.location.href = "/patient/appointments/history")
              }
              className="group relative p-6 bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20 rounded-2xl hover:from-accent/10 hover:to-accent/20 hover:border-accent/30 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-4 bg-accent/10 rounded-xl group-hover:bg-accent/20 group-hover:scale-110 transition-all duration-300">
                  <BarChart3 className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    Health Insights
                  </div>
                  <div className="text-sm text-muted-foreground">
                    View detailed analytics
                  </div>
                </div>
              </div>
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="h-4 w-4 text-accent" />
              </div>
            </button>
          </div>
        </motion.div>

        {/* ✅ MAIN CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* ✅ TARGETED CHANGE: UPCOMING APPOINTMENTS using usePatientAppointments */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Upcoming Appointments
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Your scheduled dental visits (
                    {upcomingAppointments?.length || 0} upcoming)
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={refreshAppointments}
                    disabled={appointmentsLoading}
                    className="p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors disabled:opacity-50"
                    title="Refresh appointments"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        appointmentsLoading ? "animate-spin" : ""
                      }`}
                    />
                  </button>
                  <button
                    onClick={handleViewAppointments}
                    className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-primary/10 transition-colors"
                  >
                    View all
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {appointmentsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="bg-card border border-border rounded-2xl p-6 animate-pulse"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-muted rounded-full"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-muted rounded w-1/3"></div>
                            <div className="h-3 bg-muted rounded w-2/3"></div>
                            <div className="h-3 bg-muted rounded w-1/2"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !upcomingAppointments ||
                  upcomingAppointments.length === 0 ? (
                  <div className="bg-card border border-border rounded-2xl p-8 text-center">
                    <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Calendar className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">
                      No upcoming appointments
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Schedule your next dental visit to maintain optimal oral
                      health.
                    </p>
                    <button
                      onClick={handleBookAppointment}
                      className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium"
                    >
                      Schedule Appointment
                    </button>
                  </div>
                ) : (
                  upcomingAppointments.slice(0, 3).map((appointment, index) => {
                    const appointmentDetails = getAppointmentDetails(
                      appointment.id
                    );
                    const statusBadge = getStatusBadge(appointment.status);

                    return (
                      <motion.div
                        key={appointment.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className="group bg-card border border-border rounded-2xl p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300"
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <img
                              src={
                                appointment.doctor?.profile_image_url ||
                                `https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face`
                              }
                              alt={appointment.doctor?.name || "Doctor"}
                              className="w-16 h-16 rounded-full object-cover border-2 border-border group-hover:border-primary/30 transition-colors"
                            />
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full border-2 border-background flex items-center justify-center">
                              <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                            </div>
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="font-semibold text-foreground">
                                {appointment.doctor?.name || "Unknown Doctor"}
                              </h3>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text} border ${statusBadge.border}`}
                                >
                                  {statusBadge.label}
                                </span>
                                <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-medium">
                                  {getAppointmentTimeLabel(
                                    new Date(appointment.appointment_date)
                                  )}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-2 mb-4">
                              <div className="flex items-center gap-2 text-sm">
                                <div className="w-2 h-2 bg-primary rounded-full"></div>
                                <span className="font-medium text-foreground">
                                  {appointment.services
                                    ?.map((s) => s.name)
                                    .join(", ") || "General Appointment"}
                                </span>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-muted-foreground">
                                  {appointment.clinic?.name}
                                </span>
                              </div>

                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  <span>
                                    {appointmentDetails?.formattedDate ||
                                      format(
                                        new Date(appointment.appointment_date),
                                        "MMM dd, yyyy"
                                      )}{" "}
                                    at{" "}
                                    {appointmentDetails?.formattedTime ||
                                      format(
                                        new Date(
                                          `2000-01-01T${appointment.appointment_time}`
                                        ),
                                        "h:mm a"
                                      )}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  <span>{appointment.clinic?.address}</span>
                                </div>
                              </div>

                              {appointmentDetails?.timeUntilAppointment && (
                                <div className="flex items-center gap-2 text-sm">
                                  <div className="w-2 h-2 bg-info rounded-full animate-pulse"></div>
                                  <span className="text-info font-medium">
                                    {appointmentDetails.timeUntilAppointment}{" "}
                                    until appointment
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <button
                                onClick={() =>
                                  window.open(
                                    `tel:${appointment.clinic?.phone}`,
                                    "_self"
                                  )
                                }
                                className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors text-sm font-medium"
                              >
                                <Phone className="h-4 w-4" />
                                Call Clinic
                              </button>

                              <button
                                onClick={() =>
                                  window.open(
                                    `https://maps.google.com/?q=${encodeURIComponent(
                                      appointment.clinic?.address || ""
                                    )}`,
                                    "_blank"
                                  )
                                }
                                className="flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-xl hover:bg-muted/50 transition-colors text-sm font-medium"
                              >
                                <Navigation className="h-4 w-4" />
                                Directions
                              </button>

                              {appointment.canCancel && (
                                <button
                                  onClick={() => openCancelModal(appointment)}
                                  className="flex items-center gap-2 px-4 py-2 border border-destructive/20 text-destructive rounded-xl hover:bg-destructive/10 transition-colors text-sm font-medium"
                                >
                                  <Ban className="h-4 w-4" />
                                  Cancel
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>

            {/* ✅ APPOINTMENT TRENDS CHART (KEEP ORIGINAL - using usePatientAppointmentHistory) */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                      Health & Appointment Trends
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Your dental health journey over the past 6 months
                    </p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                </div>

                {appointmentTrends.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[350px]">
                    <BarChart data={appointmentTrends}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                        opacity={0.3}
                      />
                      <XAxis
                        dataKey="month"
                        tick={{
                          fontSize: 12,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{
                          fontSize: 12,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        cursor={{ fill: "hsl(var(--muted))", opacity: 0.1 }}
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar
                        dataKey="completed"
                        stackId="appointments"
                        fill="var(--color-completed)"
                        radius={[0, 0, 0, 0]}
                        name="Completed"
                      />
                      <Bar
                        dataKey="cancelled"
                        stackId="appointments"
                        fill="var(--color-cancelled)"
                        radius={[4, 4, 0, 0]}
                        name="Cancelled"
                      />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[350px] flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        No appointment data available yet
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Charts will appear after your first appointments
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* ✅ RIGHT COLUMN (KEEP ORIGINAL - using usePatientAppointmentHistory data) */}
          <div className="space-y-6">
            {/* ✅ Health Score Progress (KEEP ORIGINAL) */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="bg-gradient-to-br from-success/5 via-primary/5 to-accent/5 border border-success/20 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-success/20 rounded-xl">
                      <Activity className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        Health Progress
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Your wellness journey
                      </p>
                    </div>
                  </div>
                  {healthAnalyticsData?.improvement_trend > 1 && (
                    <div className="flex items-center gap-1 text-success">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm font-medium">Trending up</span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="text-center">
                    <div
                      className={`text-3xl font-bold mb-1 ${getHealthScoreColor(
                        healthAnalyticsData?.health_score || 0
                      )}`}
                    >
                      {healthAnalyticsData?.health_score || 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Overall Health Score
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-muted/50 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-success to-primary h-3 rounded-full transition-all duration-1000"
                      style={{
                        width: `${healthAnalyticsData?.health_score || 0}%`,
                      }}
                    ></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground">
                        {healthAnalyticsData?.completed_treatments || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Treatments
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground">
                        {healthAnalyticsData?.consistency_rating || 0}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Consistency
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ✅ PENDING REVIEWS (KEEP ORIGINAL) */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Pending Reviews
                </h2>
                {pendingReviews.length > 0 && (
                  <span className="text-xs bg-warning/10 text-warning px-2 py-1 rounded-full border border-warning/20">
                    {pendingReviews.length} pending
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {pendingReviews.length === 0 ? (
                  <div className="bg-card border border-border rounded-2xl p-6 text-center">
                    <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="h-6 w-6 text-success" />
                    </div>
                    <h3 className="font-medium text-foreground mb-1">
                      All caught up!
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      No pending reviews at the moment.
                    </p>
                  </div>
                ) : (
                  pendingReviews.map((review, index) => (
                    <motion.div
                      key={review.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="bg-card border border-border rounded-2xl p-4 hover:shadow-md hover:border-warning/30 transition-all duration-300"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <img
                          src={review.doctor_image}
                          alt={review.doctor_name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-border"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground text-sm">
                            {review.doctor_name}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {review.clinic_name}
                          </p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          <span className="text-sm font-medium text-foreground">
                            {review.service}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(review.appointment_date, "MMM dd, yyyy")}
                        </p>
                      </div>

                      <button
                        onClick={() =>
                          handleSubmitReview(review.appointment_id)
                        }
                        className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                      >
                        <Star className="h-4 w-4" />
                        Write Review
                      </button>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>

            {/* ✅ RECENT ACTIVITY (KEEP ORIGINAL) */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Recent Activity
                </h2>
                <button className="text-xs text-primary hover:text-primary/80 font-medium">
                  View all
                </button>
              </div>

              <div className="space-y-3">
                {recentActivity.length === 0 ? (
                  <div className="bg-card border border-border rounded-2xl p-6 text-center">
                    <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No recent activity
                    </p>
                  </div>
                ) : (
                  recentActivity.map((activity, index) => {
                    const Icon = activity.icon;
                    return (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className={`group relative flex items-start gap-3 p-3 bg-card border rounded-xl transition-all duration-300 ${
                          activity.priority === "high"
                            ? "border-primary/30 bg-primary/5"
                            : "border-border hover:border-primary/20 hover:bg-muted/30"
                        }`}
                      >
                        <div
                          className={`p-2 rounded-lg flex-shrink-0 ${
                            activity.priority === "high"
                              ? "bg-primary/20"
                              : "bg-muted/50"
                          }`}
                        >
                          <Icon className={`h-4 w-4 ${activity.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {activity.title}
                          </p>
                          <p className="text-xs text-muted-foreground mb-1 line-clamp-2">
                            {activity.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(activity.timestamp, "MMM dd, h:mm a")}
                          </p>
                        </div>
                        {activity.priority === "high" && (
                          <div className="absolute top-2 right-2">
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>

            {/* ✅ REAL Favorite Clinic */}
            {analytics?.favorite_clinic && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <div className="bg-gradient-to-br from-accent/5 via-primary/5 to-accent/10 border border-accent/20 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-accent/20 rounded-xl">
                      <Heart className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        Favorite Clinic
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Your most visited location
                      </p>
                    </div>
                  </div>

                  <div className="text-center space-y-3">
                    <h4 className="font-semibold text-foreground text-lg">
                      {analytics.favorite_clinic.clinic_name}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      You've built a great relationship here
                    </p>
                    <button
                      onClick={() =>
                        (window.location.href = `/patient/clinics/${analytics.favorite_clinic.clinic_id}`)
                      }
                      className="w-full px-4 py-3 bg-accent text-accent-foreground rounded-xl hover:bg-accent/90 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <MapPin className="h-4 w-4" />
                      View Clinic Details
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
