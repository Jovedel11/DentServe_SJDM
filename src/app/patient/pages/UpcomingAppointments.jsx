import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  Download,
  Eye,
  Bell,
  AlertCircle,
  CalendarDays,
  Stethoscope,
  Building2,
  ChevronRight,
  Filter,
  Search,
  RefreshCw,
  CheckCircle2,
  Timer,
  Calendar as CalendarIcon,
  X,
  XCircle,
  Info,
  AlertTriangle,
} from "lucide-react";
import CancelAppointmentModal from "../components/cancel-modal";
import NotificationToast from "@/core/components/notification-toast";
import { usePatientAppointments } from "@/core/hooks/usePatientAppointment";
import { useAppointmentRealtime } from "@/core/hooks/useAppointmentRealtime";
import { useAuth } from "@/auth/context/AuthProvider";

const UpcomingAppointments = () => {
  // ✅ INTEGRATION: Use real hooks instead of mock data
  const { user, profile, isPatient, canAccessApp } = useAuth();

  const {
    appointments,
    loading,
    error,
    activeTab,
    pagination,
    fetchAppointments,
    cancelAppointment,
    canCancelAppointment,
    changeTab,
    refresh,
    loadMore,
    stats,
    upcomingAppointments,
    pastAppointments,
    isEmpty,
    hasMore,
    getAppointmentDetails,
    searchAppointments,
  } = usePatientAppointments();

  // ✅ REAL-TIME: Setup real-time updates
  const { enableRealtimeUpdates, disableRealtimeUpdates, isConnected } =
    useAppointmentRealtime({
      onAppointmentUpdate: (update) => {
        console.log("Real-time appointment update:", update);
        // Refresh appointments when updates occur
        refresh();
      },
      onAppointmentStatusChange: (statusUpdate) => {
        console.log("Appointment status changed:", statusUpdate);
        // Show notification for status changes
        showToast(
          "info",
          "Appointment Updated",
          `Your appointment status has been changed to ${statusUpdate.newStatus}`
        );
        refresh();
      },
      enableAppointments: true,
      enableNotifications: true,
    });

  // ✅ LOCAL STATE: Keep only UI-specific state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("upcoming"); // Default to upcoming
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [cancelModal, setCancelModal] = useState({
    isOpen: false,
    appointment: null,
    canCancel: true,
    reason: "",
  });
  const [toast, setToast] = useState({
    isVisible: false,
    type: "success",
    title: "",
    message: "",
  });

  // ✅ AUTHENTICATION: Check access
  useEffect(() => {
    if (!user || !canAccessApp || !isPatient()) {
      console.warn("Access denied: Not a patient or not authenticated");
      return;
    }

    // Enable real-time updates
    enableRealtimeUpdates();

    return () => {
      disableRealtimeUpdates();
    };
  }, [
    user,
    canAccessApp,
    isPatient,
    enableRealtimeUpdates,
    disableRealtimeUpdates,
  ]);

  // ✅ DATA PROCESSING: Filter appointments with search
  const filteredAppointments = useMemo(() => {
    let filtered = appointments;

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = searchAppointments(searchTerm);
    }

    // Apply date/status filter
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    switch (filterType) {
      case "upcoming":
        filtered = filtered.filter(
          (apt) =>
            ["pending", "confirmed"].includes(apt.status) &&
            apt.appointment_date >= today
        );
        break;
      case "today":
        filtered = filtered.filter((apt) => apt.appointment_date === today);
        break;
      case "tomorrow":
        filtered = filtered.filter(
          (apt) => apt.appointment_date === tomorrowStr
        );
        break;
      case "thisWeek":
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextWeekStr = nextWeek.toISOString().split("T")[0];
        filtered = filtered.filter(
          (apt) =>
            apt.appointment_date >= today && apt.appointment_date <= nextWeekStr
        );
        break;
      case "all":
      default:
        // Keep all appointments
        break;
    }

    return filtered;
  }, [appointments, searchTerm, filterType, searchAppointments]);

  // ✅ COMPUTED VALUES: Get today's and tomorrow's appointments for reminders
  const urgentAppointments = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    return appointments.filter(
      (apt) =>
        (apt.appointment_date === today ||
          apt.appointment_date === tomorrowStr) &&
        ["pending", "confirmed"].includes(apt.status)
    );
  }, [appointments]);

  // ✅ ONGOING TREATMENTS: Extract from appointments with services
  const ongoingTreatments = useMemo(() => {
    // Filter appointments that are part of ongoing treatments
    // This could be based on service types or recurring appointment patterns
    return appointments.filter((apt) => {
      // Check if appointment has multiple related services or is recurring
      const isOngoingTreatment = apt.services?.some(
        (service) =>
          service.name?.toLowerCase().includes("orthodontic") ||
          service.name?.toLowerCase().includes("implant") ||
          service.name?.toLowerCase().includes("braces") ||
          service.name?.toLowerCase().includes("treatment plan")
      );

      return isOngoingTreatment && apt.status !== "cancelled";
    });
  }, [appointments]);

  const showToast = (type, title, message) => {
    setToast({
      isVisible: true,
      type,
      title,
      message,
    });

    setTimeout(() => {
      setToast((prev) => ({ ...prev, isVisible: false }));
    }, 5000);
  };

  // ✅ REAL CANCELLATION: Use hook function
  const handleCancelAppointment = async (appointment) => {
    try {
      // Check if appointment can be cancelled using real function
      const { canCancel, error: checkError } = await canCancelAppointment(
        appointment.id
      );

      if (checkError) {
        showToast("error", "Error", checkError);
        return;
      }

      if (!canCancel) {
        setCancelModal({
          isOpen: true,
          appointment,
          canCancel: false,
          reason:
            "Appointments cannot be cancelled within the clinic's policy timeframe.",
        });
      } else {
        setCancelModal({
          isOpen: true,
          appointment,
          canCancel: true,
          reason: "",
        });
      }
    } catch (err) {
      console.error("Error checking cancellation eligibility:", err);
      showToast("error", "Error", "Failed to check cancellation eligibility");
    }
  };

  // ✅ REAL CANCELLATION: Execute cancellation
  const confirmCancelAppointment = async (
    appointmentId,
    cancellationReason
  ) => {
    try {
      const result = await cancelAppointment(appointmentId, cancellationReason);

      if (result.success) {
        setCancelModal({
          isOpen: false,
          appointment: null,
          canCancel: true,
          reason: "",
        });

        showToast(
          "success",
          "Appointment Cancelled",
          result.message || "Your appointment has been successfully cancelled."
        );
      } else {
        showToast(
          "error",
          "Cancellation Failed",
          result.error || "Failed to cancel appointment. Please try again."
        );
      }
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      showToast(
        "error",
        "Cancellation Failed",
        "An unexpected error occurred. Please try again or contact support."
      );
    }
  };

  // ✅ ENHANCED UTILITIES: Use real appointment data
  const getReminderMessage = (appointment) => {
    const appointmentDate = new Date(appointment.appointment_date);
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    if (appointment.appointment_date === todayStr) {
      return {
        message: `You have an appointment today at ${formatTime(
          appointment.appointment_time
        )}`,
        type: "today",
        urgent: true,
      };
    } else if (appointment.appointment_date === tomorrowStr) {
      return {
        message: `You have an appointment tomorrow at ${formatTime(
          appointment.appointment_time
        )}`,
        type: "tomorrow",
        urgent: true,
      };
    } else {
      return {
        message: `You have an upcoming appointment on ${formatDate(
          appointment.appointment_date
        )} at ${formatTime(appointment.appointment_time)}`,
        type: "upcoming",
        urgent: false,
      };
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleViewDetails = (appointment) => {
    const details = getAppointmentDetails(appointment.id);
    setSelectedAppointment(details || appointment);
  };

  const handleDownloadDetails = (appointment) => {
    const details = `
APPOINTMENT DETAILS
==================
Service: ${appointment.services?.map((s) => s.name).join(", ") || "N/A"}
Doctor: ${appointment.doctor?.name || "N/A"}
Clinic: ${appointment.clinic?.name || "N/A"}
Address: ${appointment.clinic?.address || "N/A"}
Date: ${formatDate(appointment.appointment_date)}
Time: ${formatTime(appointment.appointment_time)}
Duration: ${
      appointment.duration_minutes
        ? `${appointment.duration_minutes} minutes`
        : "N/A"
    }
Status: ${appointment.status}
Notes: ${appointment.notes || "None"}

CONTACT INFORMATION
==================
Phone: ${appointment.clinic?.phone || "N/A"}
Email: ${appointment.clinic?.email || "N/A"}
    `;

    const blob = new Blob([details], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `appointment-${appointment.id}-details.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRefresh = async () => {
    try {
      await refresh();
      showToast("success", "Refreshed", "Appointments updated successfully");
    } catch (err) {
      showToast("error", "Refresh Failed", "Failed to refresh appointments");
    }
  };

  // ✅ ACCESS CONTROL: Early return for unauthorized users
  if (!user || !canAccessApp || !isPatient()) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-medium text-foreground">Access Denied</h3>
          <p className="text-muted-foreground">
            You need to be a verified patient to view appointments.
          </p>
        </div>
      </div>
    );
  }

  // ✅ ERROR HANDLING: Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h3 className="text-lg font-medium text-foreground">
            Error Loading Appointments
          </h3>
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const EmptyState = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-16"
    >
      <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted/30 flex items-center justify-center">
        <CalendarDays className="w-12 h-12 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">
        No Upcoming Appointments
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        You don't have any upcoming appointments scheduled. Book your next
        appointment to maintain your dental health.
      </p>
      <button className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
        <Calendar className="w-4 h-4" />
        Book New Appointment
      </button>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-8 w-64 bg-muted rounded animate-pulse" />
            <div className="h-4 w-96 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-muted rounded animate-pulse" />
        </div>

        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <NotificationToast
        isVisible={toast.isVisible}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground">
            Upcoming Appointments
          </h1>
          <p className="text-muted-foreground">
            Manage and track your scheduled appointments
            {stats.upcoming > 0 && ` • ${stats.upcoming} upcoming`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {isConnected && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Live Updates
            </div>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Search appointments, doctors, or clinics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
          >
            <option value="upcoming">Upcoming</option>
            <option value="all">All Appointments</option>
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="thisWeek">This Week</option>
          </select>
        </div>
      </div>

      {/* Today's Reminders */}
      {urgentAppointments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-primary/5 border border-primary/20 rounded-lg"
        >
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">
                Appointment Reminders
              </h3>
              {urgentAppointments.map((appointment) => {
                const reminder = getReminderMessage(appointment);
                return (
                  <div
                    key={appointment.id}
                    className="text-sm text-muted-foreground"
                  >
                    {reminder.message}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Ongoing Treatments */}
      {ongoingTreatments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Timer className="w-5 h-5 text-primary" />
            Ongoing Treatments ({ongoingTreatments.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {ongoingTreatments.map((treatment, index) => (
              <motion.div
                key={treatment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-6 bg-card border border-border rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-foreground">
                        {treatment.services?.[0]?.name || "Ongoing Treatment"}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="w-4 h-4" />
                        {treatment.doctor?.name || "N/A"}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="w-4 h-4" />
                        {treatment.clinic?.name || "N/A"}
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                      In Progress
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => handleViewDetails(treatment)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                    <button
                      onClick={() => handleDownloadDetails(treatment)}
                      className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border hover:bg-muted/50 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Regular Appointments */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          Scheduled Appointments ({filteredAppointments.length})
        </h2>

        {filteredAppointments.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((appointment, index) => {
              const reminder = getReminderMessage(appointment);

              return (
                <motion.div
                  key={appointment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-6 bg-card border rounded-lg hover:shadow-md transition-all duration-200 ${
                    reminder.urgent
                      ? "border-primary/30 bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-foreground">
                            {appointment.services
                              ?.map((s) => s.name)
                              .join(", ") || "Appointment"}
                          </h3>
                          {reminder.urgent && (
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                reminder.type === "today"
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                                  : "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400"
                              }`}
                            >
                              {reminder.type === "today" ? "Today" : "Tomorrow"}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {reminder.message}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {appointment.status === "cancelled" ? (
                          <span className="px-3 py-1 bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 text-sm font-medium rounded-full">
                            Cancelled
                          </span>
                        ) : (
                          <span
                            className={`px-3 py-1 text-sm font-medium rounded-full ${
                              appointment.status === "confirmed"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
                            }`}
                          >
                            {appointment.status.charAt(0).toUpperCase() +
                              appointment.status.slice(1)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                          <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-foreground font-medium">
                            {appointment.doctor?.name || "N/A"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <div>
                            <div className="text-foreground font-medium">
                              {appointment.clinic?.name || "N/A"}
                            </div>
                            <div className="text-muted-foreground">
                              {appointment.clinic?.address || "N/A"}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                          <CalendarIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-foreground font-medium">
                            {formatDate(appointment.appointment_date)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-foreground font-medium">
                            {formatTime(appointment.appointment_time)}
                            {appointment.duration_minutes &&
                              ` (${appointment.duration_minutes} min)`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {appointment.notes && (
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="text-sm font-medium text-foreground mb-1">
                          Notes
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {appointment.notes}
                        </div>
                      </div>
                    )}

                    {/* Cancellation Reason */}
                    {appointment.status === "cancelled" &&
                      appointment.cancellation_reason && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
                          <div className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                            Cancellation Reason
                          </div>
                          <div className="text-sm text-red-700 dark:text-red-400">
                            {appointment.cancellation_reason}
                          </div>
                        </div>
                      )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-2 border-t border-border">
                      <button
                        onClick={() => handleViewDetails(appointment)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                      <button
                        onClick={() => handleDownloadDetails(appointment)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border hover:bg-muted/50 rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>

                      {/* Cancel Button */}
                      {appointment.status === "confirmed" &&
                        appointment.canCancel && (
                          <button
                            onClick={() => handleCancelAppointment(appointment)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                            Cancel
                          </button>
                        )}

                      <div className="ml-auto flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {appointment.clinic?.phone || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center pt-4">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-6 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cancel Appointment Modal */}
      <CancelAppointmentModal
        isOpen={cancelModal.isOpen}
        appointment={cancelModal.appointment}
        canCancel={cancelModal.canCancel}
        reason={cancelModal.reason}
        onConfirm={confirmCancelAppointment}
        onClose={() =>
          setCancelModal({
            isOpen: false,
            appointment: null,
            canCancel: true,
            reason: "",
          })
        }
      />

      {/* Details Modal */}
      <AnimatePresence>
        {selectedAppointment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setSelectedAppointment(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-card rounded-lg shadow-xl border max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-foreground">
                    Appointment Details
                  </h2>
                  <button
                    onClick={() => setSelectedAppointment(null)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Service
                        </label>
                        <div className="text-foreground">
                          {selectedAppointment.services
                            ?.map((s) => s.name)
                            .join(", ") || "N/A"}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Doctor
                        </label>
                        <div className="text-foreground">
                          {selectedAppointment.doctor?.name || "N/A"}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Clinic
                        </label>
                        <div className="text-foreground">
                          {selectedAppointment.clinic?.name || "N/A"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {selectedAppointment.clinic?.address || "N/A"}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Date & Time
                        </label>
                        <div className="text-foreground">
                          {selectedAppointment.appointment_date
                            ? formatDate(selectedAppointment.appointment_date)
                            : "N/A"}
                        </div>
                        <div className="text-foreground">
                          {selectedAppointment.appointment_time
                            ? formatTime(selectedAppointment.appointment_time)
                            : "N/A"}
                          {selectedAppointment.duration_minutes &&
                            ` (${selectedAppointment.duration_minutes} min)`}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Status
                        </label>
                        <div className="text-foreground capitalize">
                          {selectedAppointment.status}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Contact
                        </label>
                        <div className="text-foreground">
                          {selectedAppointment.clinic?.phone || "N/A"}
                        </div>
                        <div className="text-foreground">
                          {selectedAppointment.clinic?.email || "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedAppointment.notes && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Notes
                      </label>
                      <div className="text-foreground">
                        {selectedAppointment.notes}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <button
                    onClick={() => handleDownloadDetails(selectedAppointment)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download Details
                  </button>
                  <button
                    onClick={() => setSelectedAppointment(null)}
                    className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground border border-border hover:bg-muted/50 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UpcomingAppointments;
