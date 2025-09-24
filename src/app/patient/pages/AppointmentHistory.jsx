import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  FiArchive,
  FiTrash2,
  FiAlertTriangle,
  FiRotateCcw,
  FiEye,
  FiFolder,
  FiRefreshCw,
  FiLoader,
} from "react-icons/fi";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/core/components/ui/chart";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useAuth } from "@/auth/context/AuthProvider";
import { usePatientAppointmentHistory } from "@/core/hooks/usePatientAppointmentHistory";
import Toast from "@/core/components/ui/toast";
import Loader from "@/core/components/Loader";
import { DeleteConfirmationModal } from "../components/history/delete-modal";

const AppointmentHistory = () => {
  const { user, isPatient } = useAuth();

  const {
    // State from hook
    loading,
    error,
    appointments,
    archivedAppointments,
    healthAnalytics,
    searchQuery,
    statusFilter,
    dateRange,
    showArchived,
    pagination,

    // Computed data from hook
    filteredAppointments,
    totalAppointments,
    activeAppointments,
    completedAppointments,
    archivedCount,
    canArchiveCount,
    pendingCount,
    confirmedCount,
    healthScore,
    improvementTrend,
    consistencyRating,
    totalSpent,
    avgAppointmentCost,

    // Actions from hook
    fetchAppointmentData,
    loadMoreAppointments,
    archiveAppointment,
    unarchiveAppointment,
    deleteArchivedAppointment,
    downloadAppointmentDetails,
    downloadAllReport,
    toggleArchiveView,
    setSearchQuery,
    setStatusFilter,
    setDateRange,

    // Utilities from hook
    isEmpty: isEmptyList,
    hasMore: paginationHasMore,
  } = usePatientAppointmentHistory();

  // LOCAL STATE for UI interactions
  const [expandedAppointment, setExpandedAppointment] = useState(null);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    appointment: null,
  });
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [actionLoading, setActionLoading] = useState({
    archiving: null,
    unarchiving: null,
    deleting: null,
    refreshing: false,
  });

  // Show toast helper
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
  };

  // Prevent default event behavior
  const preventDefaults = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Archive handler with proper state management
  const handleArchive = async (appointmentId, e = null) => {
    preventDefaults(e);

    if (actionLoading.archiving === appointmentId) return false;

    setActionLoading((prev) => ({ ...prev, archiving: appointmentId }));

    try {
      console.log("🔄 UI: Starting archive for appointment:", appointmentId);

      const result = await archiveAppointment(appointmentId);

      if (result.success) {
        console.log("✅ UI: Archive successful");
        showToast("Appointment archived successfully");
        setExpandedAppointment(null); // Collapse expanded view
      } else {
        console.error("❌ UI: Archive failed:", result.error);
        showToast(result.error || "Failed to archive appointment", "error");
      }
    } catch (err) {
      console.error("❌ UI: Archive error:", err);
      showToast("Failed to archive appointment", "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, archiving: null }));
    }

    return false;
  };

  // Unarchive handler
  const handleUnarchive = async (appointmentId, e = null) => {
    preventDefaults(e);

    if (actionLoading.unarchiving === appointmentId) return false;

    setActionLoading((prev) => ({ ...prev, unarchiving: appointmentId }));

    try {
      console.log("🔄 UI: Starting unarchive for appointment:", appointmentId);

      const result = await unarchiveAppointment(appointmentId);

      if (result.success) {
        console.log("✅ UI: Unarchive successful");
        showToast("Appointment restored successfully");
        setExpandedAppointment(null);
      } else {
        console.error("❌ UI: Unarchive failed:", result.error);
        showToast(result.error || "Failed to restore appointment", "error");
      }
    } catch (err) {
      console.error("❌ UI: Unarchive error:", err);
      showToast("Failed to restore appointment", "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, unarchiving: null }));
    }

    return false;
  };

  // Delete modal handler
  const handleDeleteClick = (appointment, e = null) => {
    preventDefaults(e);
    setDeleteModal({ isOpen: true, appointment });
    return false;
  };

  // Delete confirmation handler
  const handleDeleteConfirm = async () => {
    if (!deleteModal.appointment) return;

    const appointmentId = deleteModal.appointment.id;
    setActionLoading((prev) => ({ ...prev, deleting: appointmentId }));

    try {
      console.log("🔄 UI: Starting delete for appointment:", appointmentId);

      const result = await deleteArchivedAppointment(appointmentId);

      if (result.success) {
        console.log("✅ UI: Delete successful");
        showToast("Appointment permanently deleted");
        setExpandedAppointment(null);
      } else {
        console.error("❌ UI: Delete failed:", result.error);
        showToast(result.error || "Failed to delete appointment", "error");
      }
    } catch (err) {
      console.error("❌ UI: Delete error:", err);
      showToast("Failed to delete appointment", "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, deleting: null }));
      setDeleteModal({ isOpen: false, appointment: null });
    }
  };

  // Archive view toggle
  const handleToggleArchiveView = async (e = null) => {
    preventDefaults(e);

    console.log("🔄 UI: Toggling archive view");
    setExpandedAppointment(null); // Collapse any expanded items
    await toggleArchiveView();
    console.log("✅ UI: Archive view toggled");

    return false;
  };

  // Download handler
  const handleDownload = (appointment, e = null) => {
    preventDefaults(e);

    try {
      const result = downloadAppointmentDetails(appointment);
      if (result.success) {
        showToast("Appointment details downloaded");
      }
    } catch (err) {
      console.error("Download error:", err);
      showToast("Failed to download appointment details", "error");
    }

    return false;
  };

  // Manual refresh handler
  const handleManualRefresh = async (e = null) => {
    preventDefaults(e);

    if (actionLoading.refreshing) return false;

    setActionLoading((prev) => ({ ...prev, refreshing: true }));

    try {
      console.log("🔄 UI: Manual refresh triggered");
      await fetchAppointmentData(true);
      showToast("Data refreshed");
    } catch (err) {
      console.error("Refresh error:", err);
      showToast("Failed to refresh data", "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, refreshing: false }));
    }

    return false;
  };

  // Load more appointments
  const handleLoadMore = async () => {
    if (loading || !paginationHasMore) return;

    try {
      console.log("📥 Loading more appointments...");
      await loadMoreAppointments();
      showToast(`Loaded more appointments`);
    } catch (err) {
      console.error("Load more error:", err);
      showToast("Failed to load more appointments", "error");
    }
  };

  // Chart data with proper error handling
  const chartData = useMemo(() => {
    if (!totalAppointments) {
      return {
        healthTrendData: [],
        appointmentTypeData: [],
        monthlyTrendsData: [],
      };
    }

    try {
      const allAppointments = [...appointments, ...archivedAppointments];

      // Status distribution for pie chart
      const statusCounts = allAppointments.reduce((acc, apt) => {
        acc[apt.status] = (acc[apt.status] || 0) + 1;
        return acc;
      }, {});

      const appointmentTypeData = [
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
          value: statusCounts["no_show"] || 0,
          color: "#ef4444",
        },
      ].filter((item) => item.value > 0);

      // Monthly trends for line chart
      const monthlyData = {};
      allAppointments.forEach((apt) => {
        const month = new Date(apt.date).toISOString().substr(0, 7);
        if (!monthlyData[month]) {
          monthlyData[month] = { completed: 0, cancelled: 0, noShow: 0 };
        }
        if (apt.status === "completed") monthlyData[month].completed++;
        if (apt.status === "cancelled") monthlyData[month].cancelled++;
        if (apt.status === "no_show") monthlyData[month].noShow++;
      });

      const monthlyTrendsData = Object.entries(monthlyData)
        .slice(-6)
        .map(([month, stats]) => ({
          month: new Date(month + "-01").toLocaleDateString("en", {
            month: "short",
            year: "2-digit",
          }),
          ...stats,
        }));

      // Health trend calculation
      const healthTrendData = monthlyTrendsData.map((item) => ({
        month: item.month,
        healthScore: Math.min(
          100,
          Math.max(
            0,
            50 +
              (item.completed /
                (item.completed + item.cancelled + item.noShow || 1)) *
                50
          )
        ),
      }));

      return { healthTrendData, appointmentTypeData, monthlyTrendsData };
    } catch (err) {
      console.error("Chart data error:", err);
      return {
        healthTrendData: [],
        appointmentTypeData: [],
        monthlyTrendsData: [],
      };
    }
  }, [appointments, archivedAppointments, totalAppointments]);

  // ✅ UTILITY: Status styling helpers
  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800";
      case "cancelled":
        return "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950 dark:border-amber-800";
      case "no_show":
        return "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950 dark:border-red-800";
      case "pending":
        return "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950 dark:border-blue-800";
      case "confirmed":
        return "text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-950 dark:border-purple-800";
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
      case "no_show":
        return <FiAlertCircle className="w-4 h-4" />;
      case "pending":
        return <FiClock className="w-4 h-4" />;
      case "confirmed":
        return <FiCalendar className="w-4 h-4" />;
      default:
        return <FiClock className="w-4 h-4" />;
    }
  };

  // ✅ ACCESS CONTROL: Check user permissions
  if (!user || !isPatient) {
    return (
      <div className="min-h-screen p-6 bg-background flex items-center justify-center">
        <motion.div
          className="text-center max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="p-4 bg-red-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center dark:bg-red-900/20">
            <FiAlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Access Denied
          </h1>
          <p className="text-muted-foreground">
            Only patients can view appointment history.
          </p>
        </motion.div>
      </div>
    );
  }

  // ✅ ERROR STATE: Show error with retry
  if (error) {
    return (
      <div className="min-h-screen p-6 bg-background flex items-center justify-center">
        <motion.div
          className="text-center max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="p-4 bg-red-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center dark:bg-red-900/20">
            <FiAlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Error Loading History
          </h1>
          <p className="text-red-600 mb-4 text-sm">{error}</p>
          <button
            onClick={handleManualRefresh}
            disabled={actionLoading.refreshing}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 flex items-center gap-2 mx-auto disabled:opacity-50"
          >
            <FiRefreshCw
              className={`w-4 h-4 ${
                actionLoading.refreshing ? "animate-spin" : ""
              }`}
            />
            {actionLoading.refreshing ? "Retrying..." : "Try Again"}
          </button>
        </motion.div>
      </div>
    );
  }

  // ✅ LOADING STATE: Show skeleton
  if (loading && !appointments.length && !archivedAppointments.length) {
    return <Loader />;
  }

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ✅ ENHANCED: Header Section with Better Controls */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row justify-between items-start gap-6"
        >
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              {showArchived ? "Archived Appointments" : "Appointment History"}
            </h1>
            <p className="text-muted-foreground">
              {showArchived
                ? `${archivedCount} archived appointment${
                    archivedCount !== 1 ? "s" : ""
                  }`
                : `Complete overview of your ${totalAppointments} dental appointment${
                    totalAppointments !== 1 ? "s" : ""
                  } and health progress`}
            </p>
            {/* ✅ NEW: Show pagination info if relevant */}
            {paginationHasMore && (
              <p className="text-xs text-muted-foreground">
                Showing {filteredAppointments.length} of{" "}
                {pagination?.totalCount || totalAppointments} total
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={actionLoading.refreshing}
              className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <FiRefreshCw
                className={`w-4 h-4 ${
                  actionLoading.refreshing ? "animate-spin" : ""
                }`}
              />
              {actionLoading.refreshing && (
                <span className="text-xs">Refreshing...</span>
              )}
            </button>

            {/* Archive Toggle */}
            <button
              type="button"
              onClick={handleToggleArchiveView}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                showArchived
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {showArchived ? (
                <>
                  <FiEye className="w-4 h-4" />
                  <span>View Active</span>
                </>
              ) : (
                <>
                  <FiArchive className="w-4 h-4" />
                  <span>Archives ({archivedCount})</span>
                </>
              )}
            </button>

            {/* Download Button */}
            <button
              type="button"
              onClick={(e) => {
                preventDefaults(e);
                downloadAllReport();
                showToast("Complete report downloaded");
                return false;
              }}
              className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
            >
              <FiDownload className="w-4 h-4" />
              <span>Download Report</span>
            </button>
          </div>
        </motion.div>

        {/* ✅ ENHANCED: Analytics Cards - Only for Active View */}
        {!showArchived && (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {/* Health Score Card */}
            <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-100 rounded-lg dark:bg-green-900/20">
                  <FiHeart className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <FiTrendingUp className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    +{improvementTrend.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-foreground">
                  {healthScore}
                </h3>
                <p className="text-sm text-muted-foreground">Health Score</p>
                <p className="text-xs text-muted-foreground">
                  {consistencyRating}% consistency
                </p>
              </div>
            </div>

            {/* Total Appointments Card */}
            <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/20">
                  <FiCalendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-foreground">
                  {totalAppointments}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Total Appointments
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{completedAppointments} completed</span>
                  <span>•</span>
                  <span>{pendingCount + confirmedCount} active</span>
                </div>
              </div>
            </div>

            {/* Archive Status Card */}
            <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-100 rounded-lg dark:bg-purple-900/20">
                  <FiFolder className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-foreground">
                  {archivedCount}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Archived Records
                </p>
                <p className="text-xs text-muted-foreground">
                  {canArchiveCount} can be archived
                </p>
              </div>
            </div>

            {/* Financial Summary Card */}
            <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-orange-100 rounded-lg dark:bg-orange-900/20">
                  <FiActivity className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-foreground">
                  ₱{totalSpent.toLocaleString()}
                </h3>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-xs text-muted-foreground">
                  ₱{avgAppointmentCost.toFixed(0)} avg per visit
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ✅ ENHANCED: Charts Section - Only for Active View with Data */}
        {!showArchived && chartData.healthTrendData.length > 0 && (
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Health Score Trend Chart */}
            <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Health Score Progress
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your dental health improvement over the last 6 months
                </p>
              </div>
              <ChartContainer
                config={{
                  healthScore: {
                    label: "Health Score",
                    color: "hsl(var(--chart-1))",
                  },
                }}
                className="h-[300px]"
              >
                <LineChart data={chartData.healthTrendData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
                  />
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
                    activeDot={{
                      r: 6,
                      stroke: "var(--color-healthScore)",
                      strokeWidth: 2,
                    }}
                  />
                </LineChart>
              </ChartContainer>
            </div>

            {/* Appointment Status Breakdown */}
            <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Appointment Status Distribution
                </h3>
                <p className="text-sm text-muted-foreground">
                  Breakdown of your {totalAppointments} total appointments
                </p>
              </div>
              <ChartContainer config={{}} className="h-[300px]">
                <PieChart>
                  <Pie
                    data={chartData.appointmentTypeData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent, value }) =>
                      `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={false}
                  >
                    {chartData.appointmentTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0];
                        return (
                          <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                            <p className="font-medium">{data.payload.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {data.value} appointment
                              {data.value !== 1 ? "s" : ""}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ChartContainer>
            </div>
          </motion.div>
        )}

        {/* ✅ ENHANCED: Filters and Search Section */}
        <motion.div
          className="bg-card border border-border rounded-lg p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Search Input */}
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search appointments, doctors, clinics, or symptoms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-input bg-background rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Controls */}
            <div className="flex gap-2 flex-wrap">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </select>

              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              >
                <option value="all">All Time</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="thisYear">This Year</option>
              </select>

              {/* Clear Filters Button */}
              {(searchQuery ||
                statusFilter !== "all" ||
                dateRange !== "all") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setDateRange("all");
                    showToast("Filters cleared");
                  }}
                  className="px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors text-sm"
                  title="Clear all filters"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* ✅ ENHANCED: Appointments List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-foreground">
                {showArchived ? "Archived" : "Active"} Appointments
              </h3>
              <span className="text-sm text-muted-foreground">
                {filteredAppointments.length} of{" "}
                {showArchived ? archivedCount : activeAppointments} records
                {searchQuery && ` matching "${searchQuery}"`}
              </span>
            </div>

            {/* Empty State */}
            {filteredAppointments.length === 0 ? (
              <motion.div
                className="text-center py-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="p-4 bg-muted/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <FiCalendar className="w-8 h-8 text-muted-foreground" />
                </div>
                <h4 className="text-lg font-medium text-foreground mb-2">
                  {showArchived
                    ? "No archived appointments"
                    : searchQuery ||
                      statusFilter !== "all" ||
                      dateRange !== "all"
                    ? "No appointments match your filters"
                    : "No appointments found"}
                </h4>
                <p className="text-muted-foreground mb-4">
                  {showArchived
                    ? "Completed appointments you archive will appear here"
                    : searchQuery ||
                      statusFilter !== "all" ||
                      dateRange !== "all"
                    ? "Try adjusting your search criteria or filters"
                    : "Your appointment history will appear here once you have appointments"}
                </p>
                {(searchQuery ||
                  statusFilter !== "all" ||
                  dateRange !== "all") && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                      setDateRange("all");
                    }}
                    className="text-primary hover:text-primary/80 text-sm font-medium"
                  >
                    Clear all filters
                  </button>
                )}
              </motion.div>
            ) : (
              <div className="space-y-4">
                {/* Appointment Cards */}
                {filteredAppointments.map((appointment, index) => (
                  <motion.div
                    key={`${appointment.id}-${
                      showArchived ? "archived" : "active"
                    }`}
                    className="border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.05, 0.5) }}
                  >
                    {/* ✅ ENHANCED: Appointment Header */}
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          {/* Status Badge */}
                          <div
                            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                              appointment.status
                            )} flex-shrink-0`}
                          >
                            {getStatusIcon(appointment.status)}
                            {appointment.status.charAt(0).toUpperCase() +
                              appointment.status.slice(1)}
                            {showArchived && (
                              <span className="ml-1 opacity-75">
                                [ARCHIVED]
                              </span>
                            )}
                          </div>

                          {/* Appointment Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground truncate">
                              {appointment.type}
                            </h4>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1 flex-shrink-0">
                                <FiCalendar className="w-3 h-3" />
                                {new Date(appointment.date).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  }
                                )}
                              </span>
                              <span className="flex items-center gap-1 flex-shrink-0">
                                <FiClock className="w-3 h-3" />
                                {appointment.time}
                              </span>
                              <span className="flex items-center gap-1 truncate">
                                <FiUser className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">
                                  {appointment.doctor}
                                </span>
                              </span>
                              {appointment.cost > 0 && (
                                <span className="flex items-center gap-1 flex-shrink-0 text-green-600 dark:text-green-400">
                                  ₱{appointment.cost.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* ✅ ENHANCED: Action Buttons */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Download Button */}
                          <button
                            onClick={(e) => handleDownload(appointment, e)}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                            title="Download appointment details"
                          >
                            <FiDownload className="w-4 h-4" />
                          </button>

                          {/* Archive Button - Active view only for completed appointments */}
                          {!showArchived &&
                            appointment.status === "completed" && (
                              <button
                                onClick={(e) =>
                                  handleArchive(appointment.id, e)
                                }
                                disabled={
                                  actionLoading.archiving === appointment.id
                                }
                                className="p-2 text-muted-foreground hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50 dark:hover:bg-orange-900/20"
                                title="Archive appointment"
                              >
                                {actionLoading.archiving === appointment.id ? (
                                  <FiLoader className="w-4 h-4 animate-spin" />
                                ) : (
                                  <FiArchive className="w-4 h-4" />
                                )}
                              </button>
                            )}

                          {/* Unarchive & Delete Buttons - Archived view only */}
                          {showArchived && (
                            <>
                              <button
                                onClick={(e) =>
                                  handleUnarchive(appointment.id, e)
                                }
                                disabled={
                                  actionLoading.unarchiving === appointment.id
                                }
                                className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                title="Restore from archive"
                              >
                                {actionLoading.unarchiving ===
                                appointment.id ? (
                                  <FiLoader className="w-4 h-4 animate-spin" />
                                ) : (
                                  <FiRotateCcw className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={(e) =>
                                  handleDeleteClick(appointment, e)
                                }
                                disabled={
                                  actionLoading.deleting === appointment.id
                                }
                                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                title="Delete permanently"
                              >
                                {actionLoading.deleting === appointment.id ? (
                                  <FiLoader className="w-4 h-4 animate-spin" />
                                ) : (
                                  <FiTrash2 className="w-4 h-4" />
                                )}
                              </button>
                            </>
                          )}

                          {/* Expand Button */}
                          <button
                            onClick={() =>
                              setExpandedAppointment(
                                expandedAppointment === appointment.id
                                  ? null
                                  : appointment.id
                              )
                            }
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                            title={
                              expandedAppointment === appointment.id
                                ? "Collapse details"
                                : "Expand details"
                            }
                          >
                            {expandedAppointment === appointment.id ? (
                              <FiChevronDown className="w-5 h-5" />
                            ) : (
                              <FiChevronRight className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* ✅ ENHANCED: Expanded Details */}
                    <AnimatePresence>
                      {expandedAppointment === appointment.id && (
                        <motion.div
                          className="border-t border-border bg-muted/20 p-6"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* ✅ Treatments Section */}
                            <div>
                              <h5 className="font-medium text-foreground mb-3 flex items-center gap-2">
                                <FiActivity className="w-4 h-4" />
                                Treatments & Services
                              </h5>
                              <div className="space-y-2">
                                {appointment.treatments &&
                                appointment.treatments.length > 0 ? (
                                  appointment.treatments.map(
                                    (treatment, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center gap-2 text-sm"
                                      >
                                        {treatment.completed ? (
                                          <FiCheck className="w-3 h-3 text-green-600 flex-shrink-0" />
                                        ) : (
                                          <FiX className="w-3 h-3 text-red-600 flex-shrink-0" />
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
                                        {treatment.price > 0 && (
                                          <span className="ml-auto text-xs text-muted-foreground">
                                            ₱{treatment.price}
                                          </span>
                                        )}
                                      </div>
                                    )
                                  )
                                ) : (
                                  <p className="text-sm text-muted-foreground italic">
                                    No specific treatments recorded
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* ✅ Clinic Details Section */}
                            <div>
                              <h5 className="font-medium text-foreground mb-3 flex items-center gap-2">
                                <FiMapPin className="w-4 h-4" />
                                Clinic Details
                              </h5>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">
                                    Name:{" "}
                                  </span>
                                  <span className="text-foreground font-medium">
                                    {appointment.clinic}
                                  </span>
                                </div>
                                {appointment.doctorSpecialization && (
                                  <div>
                                    <span className="text-muted-foreground">
                                      Specialization:{" "}
                                    </span>
                                    <span className="text-foreground">
                                      {appointment.doctorSpecialization}
                                    </span>
                                  </div>
                                )}
                                {appointment.clinicAddress && (
                                  <div>
                                    <span className="text-muted-foreground">
                                      Address:{" "}
                                    </span>
                                    <span className="text-foreground">
                                      {appointment.clinicAddress}
                                    </span>
                                  </div>
                                )}
                                {appointment.clinicPhone && (
                                  <div>
                                    <span className="text-muted-foreground">
                                      Phone:{" "}
                                    </span>
                                    <a
                                      href={`tel:${appointment.clinicPhone}`}
                                      className="text-primary hover:text-primary/80 transition-colors"
                                    >
                                      {appointment.clinicPhone}
                                    </a>
                                  </div>
                                )}
                                <div>
                                  <span className="text-muted-foreground">
                                    Duration:{" "}
                                  </span>
                                  <span className="text-foreground">
                                    {appointment.duration}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* ✅ Notes & Details Section */}
                            <div>
                              <h5 className="font-medium text-foreground mb-3 flex items-center gap-2">
                                <FiFileText className="w-4 h-4" />
                                Notes & Details
                              </h5>
                              <div className="space-y-3 text-sm">
                                {appointment.cost > 0 && (
                                  <div className="flex justify-between items-center p-2 bg-green-50 rounded-lg dark:bg-green-900/10">
                                    <span className="text-muted-foreground">
                                      Total Cost:
                                    </span>
                                    <span className="text-foreground font-semibold">
                                      ₱{appointment.cost.toFixed(2)}
                                    </span>
                                  </div>
                                )}

                                {appointment.symptoms && (
                                  <div>
                                    <span className="text-muted-foreground font-medium">
                                      Symptoms:
                                    </span>
                                    <p className="text-foreground mt-1 p-2 bg-background rounded border">
                                      {appointment.symptoms}
                                    </p>
                                  </div>
                                )}

                                {appointment.notes && (
                                  <div>
                                    <span className="text-muted-foreground font-medium">
                                      Notes:
                                    </span>
                                    <p className="text-foreground mt-1 p-2 bg-background rounded border">
                                      {appointment.notes}
                                    </p>
                                  </div>
                                )}

                                {appointment.cancellationReason && (
                                  <div>
                                    <span className="text-muted-foreground font-medium">
                                      Cancellation Reason:
                                    </span>
                                    <p className="text-red-600 dark:text-red-400 mt-1 p-2 bg-red-50 dark:bg-red-900/10 rounded border border-red-200 dark:border-red-800">
                                      {appointment.cancellationReason}
                                    </p>
                                  </div>
                                )}

                                {/* Appointment Metadata */}
                                <div className="pt-2 border-t border-border">
                                  <div className="text-xs text-muted-foreground space-y-1">
                                    <div>
                                      Created:{" "}
                                      {new Date(
                                        appointment.createdAt
                                      ).toLocaleString()}
                                    </div>
                                    {appointment.updatedAt &&
                                      appointment.updatedAt !==
                                        appointment.createdAt && (
                                        <div>
                                          Updated:{" "}
                                          {new Date(
                                            appointment.updatedAt
                                          ).toLocaleString()}
                                        </div>
                                      )}
                                    {appointment.cancelledAt && (
                                      <div>
                                        Cancelled:{" "}
                                        {new Date(
                                          appointment.cancelledAt
                                        ).toLocaleString()}
                                      </div>
                                    )}
                                    {appointment.isArchived && (
                                      <div className="text-orange-600 dark:text-orange-400 font-medium">
                                        Status: ARCHIVED
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* ✅ Quick Actions in Expanded View */}
                          <div className="mt-6 pt-4 border-t border-border">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={(e) => handleDownload(appointment, e)}
                                className="flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm"
                              >
                                <FiDownload className="w-3 h-3" />
                                Download Details
                              </button>

                              {!showArchived &&
                                appointment.status === "completed" && (
                                  <button
                                    onClick={(e) =>
                                      handleArchive(appointment.id, e)
                                    }
                                    disabled={
                                      actionLoading.archiving === appointment.id
                                    }
                                    className="flex items-center gap-2 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm disabled:opacity-50 dark:bg-orange-900/20 dark:text-orange-300"
                                  >
                                    {actionLoading.archiving ===
                                    appointment.id ? (
                                      <FiLoader className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <FiArchive className="w-3 h-3" />
                                    )}
                                    Archive Appointment
                                  </button>
                                )}

                              {showArchived && (
                                <>
                                  <button
                                    onClick={(e) =>
                                      handleUnarchive(appointment.id, e)
                                    }
                                    disabled={
                                      actionLoading.unarchiving ===
                                      appointment.id
                                    }
                                    className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm disabled:opacity-50 dark:bg-blue-900/20 dark:text-blue-300"
                                  >
                                    {actionLoading.unarchiving ===
                                    appointment.id ? (
                                      <FiLoader className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <FiRotateCcw className="w-3 h-3" />
                                    )}
                                    Restore from Archive
                                  </button>
                                  <button
                                    onClick={(e) =>
                                      handleDeleteClick(appointment, e)
                                    }
                                    disabled={
                                      actionLoading.deleting === appointment.id
                                    }
                                    className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm disabled:opacity-50 dark:bg-red-900/20 dark:text-red-300"
                                  >
                                    {actionLoading.deleting ===
                                    appointment.id ? (
                                      <FiLoader className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <FiTrash2 className="w-3 h-3" />
                                    )}
                                    Delete Permanently
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}

                {/* ✅ ENHANCED: Load More Button */}
                {paginationHasMore && !showArchived && (
                  <motion.div
                    className="flex justify-center pt-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <button
                      onClick={handleLoadMore}
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <FiLoader className="w-4 h-4 animate-spin" />
                          Loading more...
                        </>
                      ) : (
                        <>
                          <FiChevronDown className="w-4 h-4" />
                          Load More Appointments
                        </>
                      )}
                    </button>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ✅ ENHANCED: Delete Confirmation Modal */}
      <AnimatePresence>
        <DeleteConfirmationModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, appointment: null })}
          onConfirm={handleDeleteConfirm}
          appointmentDetails={deleteModal.appointment}
          loading={actionLoading.deleting === deleteModal.appointment?.id}
        />
      </AnimatePresence>

      {/* ✅ ENHANCED: Toast Notifications */}
      <AnimatePresence>
        {toast.show && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() =>
              setToast({ show: false, message: "", type: "success" })
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AppointmentHistory;
