import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { usePatientAppointments } from "@/core/hooks/usePatientAppointment";
import { useAppointmentCancellation } from "@/core/hooks/useAppointmentCancellation";
import { useAppointmentRealtime } from "@/core/hooks/useAppointmentRealtime";
import { supabase } from "@/lib/supabaseClient";
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  Search,
  Download,
  Eye,
  X,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Bell,
  Activity,
  Stethoscope,
  Building,
  FileText,
  AlertCircle,
  ChevronRight,
  Wifi,
  WifiOff,
  Filter,
  Star,
  Mail,
  Plus,
} from "lucide-react";

// Enhanced Toast Component
const Toast = React.memo(({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const toastConfig = {
    error: {
      bg: "bg-destructive",
      text: "text-white",
      icon: <AlertCircle className="w-5 h-5" />,
    },
    success: {
      bg: "bg-success",
      text: "text-white",
      icon: <CheckCircle2 className="w-5 h-5" />,
    },
    info: {
      bg: "bg-primary",
      text: "text-primary-foreground",
      icon: <AlertCircle className="w-5 h-5" />,
    },
    warning: {
      bg: "bg-warning",
      text: "text-white",
      icon: <AlertTriangle className="w-5 h-5" />,
    },
  };

  const config = toastConfig[type] || toastConfig.info;

  return (
    <div
      className={`fixed top-6 right-6 z-50 p-4 rounded-lg shadow-lg max-w-sm border animate-fadeIn ${config.bg} ${config.text}`}
    >
      <div className="flex items-center gap-3">
        {config.icon}
        <span className="font-medium flex-1">{message}</span>
        <button
          onClick={onClose}
          className="ml-2 hover:opacity-70 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

// Enhanced Loading Component
const LoadingSpinner = React.memo(
  ({ message = "Loading...", size = "default" }) => {
    const sizeClasses = {
      small: "h-4 w-4",
      default: "h-8 w-8",
      large: "h-12 w-12",
    };

    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div
            className={`animate-spin rounded-full border-4 border-muted border-t-primary mx-auto mb-4 ${sizeClasses[size]}`}
          />
          <p className="text-muted-foreground font-medium">{message}</p>
        </div>
      </div>
    );
  }
);

// Enhanced Stats Card Component
const StatsCard = React.memo(
  ({ title, value, icon, color = "primary", trend }) => (
    <div className="bg-card rounded-xl p-6 border shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
          {trend && (
            <p className="text-xs text-muted-foreground mt-1">{trend}</p>
          )}
        </div>
        <div
          className={`w-12 h-12 rounded-lg bg-${color}/10 flex items-center justify-center`}
        >
          {icon}
        </div>
      </div>
    </div>
  )
);

// Enhanced Status Badge Component
const StatusBadge = React.memo(({ status, urgent = false }) => {
  const statusConfig = {
    pending: {
      bg: "bg-warning/10",
      text: "text-warning",
      border: "border-warning/20",
      icon: <Clock className="w-3 h-3" />,
    },
    confirmed: {
      bg: "bg-success/10",
      text: "text-success",
      border: "border-success/20",
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    cancelled: {
      bg: "bg-destructive/10",
      text: "text-destructive",
      border: "border-destructive/20",
      icon: <X className="w-3 h-3" />,
    },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}
    >
      {config.icon}
      <span className="capitalize">{status}</span>
      {urgent && (
        <span className="ml-1 px-1.5 py-0.5 bg-destructive text-white rounded-full text-xs">
          URGENT
        </span>
      )}
    </div>
  );
});

// Enhanced Search Component
const SearchBar = React.memo(({ value, onChange, onClear, placeholder }) => (
  <div className="relative">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full pl-10 pr-10 py-3 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
    />
    {value && (
      <button
        onClick={onClear}
        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    )}
  </div>
));

const UpcomingAppointments = () => {
  const { user, profile, isPatient } = useAuth();

  // Hook integrations
  const {
    appointments,
    loading: appointmentsLoading,
    error: appointmentsError,
    stats,
    refresh: refreshAppointments,
    getAppointmentDetails,
    cancelAppointment: hookCancelAppointment,
    canCancelAppointment: hookCheckCanCancel,
  } = usePatientAppointments();

  const {
    loading: cancelLoading,
    error: cancelError,
    cancelAppointment: cancellationHookCancel,
    checkCancellationEligibility,
  } = useAppointmentCancellation();

  const { enableRealtimeUpdates, disableRealtimeUpdates, isConnected } =
    useAppointmentRealtime({
      onAppointmentUpdate: useCallback(
        (update) => {
          console.log("Real-time appointment update:", update);
          refreshAppointments();
        },
        [refreshAppointments]
      ),
      onAppointmentStatusChange: useCallback(
        (statusUpdate) => {
          console.log("Appointment status changed:", statusUpdate);
          showToast(
            `Appointment status changed to ${statusUpdate.newStatus}`,
            "info"
          );
          refreshAppointments();
        },
        [refreshAppointments]
      ),
      enableAppointments: true,
      enableNotifications: true,
    });

  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [ongoingTreatments, setOngoingTreatments] = useState([]);
  const [treatmentsLoading, setTreatmentsLoading] = useState(false);
  const [treatmentsError, setTreatmentsError] = useState(null);
  const [cancelModal, setCancelModal] = useState({
    isOpen: false,
    appointment: null,
    canCancel: true,
    reason: "",
    eligibilityChecked: false,
  });
  const [toastMessage, setToastMessage] = useState("");

  // Toast helper
  const showToast = useCallback((message, type = "info") => {
    setToastMessage({ message, type });
  }, []);

  const closeToast = useCallback(() => {
    setToastMessage("");
  }, []);

  // Fetch ongoing treatments
  const fetchOngoingTreatments = useCallback(async () => {
    if (!isPatient()) return;

    try {
      setTreatmentsLoading(true);
      setTreatmentsError(null);

      const { data, error } = await supabase.rpc("get_ongoing_treatments");

      if (error) {
        console.error("RPC Error:", error);
        throw new Error(error.message);
      }

      if (data?.authenticated === false) {
        throw new Error("Authentication required");
      }

      if (!data?.success) {
        throw new Error(data?.error || "Failed to fetch treatments");
      }

      console.log("Ongoing treatments data:", data.data);
      setOngoingTreatments(data.data?.treatments || []);
    } catch (err) {
      console.error("Error fetching ongoing treatments:", err);
      setTreatmentsError(err.message);
    } finally {
      setTreatmentsLoading(false);
    }
  }, [isPatient]);

  // Initialization
  useEffect(() => {
    if (!user || !isPatient()) {
      console.warn("Access denied: Not a patient or not authenticated");
      return;
    }

    fetchOngoingTreatments();
    enableRealtimeUpdates();

    return () => disableRealtimeUpdates();
  }, [
    user,
    isPatient,
    fetchOngoingTreatments,
    enableRealtimeUpdates,
    disableRealtimeUpdates,
  ]);

  // Filter only upcoming appointments
  const upcomingAppointments = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];

    return appointments.filter((apt) => {
      const isUpcoming =
        ["pending", "confirmed"].includes(apt.status) &&
        apt.appointment_date >= today;
      return isUpcoming;
    });
  }, [appointments]);

  // Search filtering
  const filteredAppointments = useMemo(() => {
    let filtered = upcomingAppointments;

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (apt) =>
          apt.services?.some((service) =>
            service.name?.toLowerCase().includes(query)
          ) ||
          apt.doctor?.name?.toLowerCase().includes(query) ||
          apt.clinic?.name?.toLowerCase().includes(query) ||
          apt.symptoms?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [upcomingAppointments, searchTerm]);

  // Urgent appointments (today and tomorrow)
  const urgentAppointments = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    return upcomingAppointments.filter(
      (apt) =>
        apt.appointment_date === today || apt.appointment_date === tomorrowStr
    );
  }, [upcomingAppointments]);

  // Utility functions
  const formatDate = useCallback((dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  const formatTime = useCallback((timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }, []);

  const getReminderMessage = useCallback(
    (appointment) => {
      const today = new Date().toISOString().split("T")[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      if (appointment.appointment_date === today) {
        return {
          message: `Today at ${formatTime(appointment.appointment_time)}`,
          type: "today",
          urgent: true,
        };
      } else if (appointment.appointment_date === tomorrowStr) {
        return {
          message: `Tomorrow at ${formatTime(appointment.appointment_time)}`,
          type: "tomorrow",
          urgent: true,
        };
      } else {
        return {
          message: `${formatDate(appointment.appointment_date)} at ${formatTime(
            appointment.appointment_time
          )}`,
          type: "upcoming",
          urgent: false,
        };
      }
    },
    [formatDate, formatTime]
  );

  // Event handlers
  const handleCancelAppointment = useCallback(
    async (appointment) => {
      try {
        console.log(
          "Checking cancellation eligibility for appointment:",
          appointment.id
        );

        const eligibility = await checkCancellationEligibility(appointment.id);
        console.log("Eligibility result:", eligibility);

        setCancelModal({
          isOpen: true,
          appointment,
          canCancel: eligibility.canCancel,
          reason: "",
          eligibilityMessage: eligibility.canCancel ? null : eligibility.reason,
          eligibilityChecked: true,
        });
      } catch (err) {
        console.error("Error checking cancellation eligibility:", err);
        showToast("Failed to check cancellation eligibility", "error");
      }
    },
    [checkCancellationEligibility, showToast]
  );

  const confirmCancelAppointment = useCallback(
    async (appointmentId, cancellationReason) => {
      if (!cancellationReason || cancellationReason.trim() === "") {
        showToast("Please provide a cancellation reason", "warning");
        return;
      }

      try {
        console.log(
          "Attempting to cancel appointment:",
          appointmentId,
          "with reason:",
          cancellationReason
        );

        const hookResult = await hookCancelAppointment(
          appointmentId,
          cancellationReason.trim()
        );
        console.log("Hook cancellation result:", hookResult);

        if (hookResult?.success) {
          setCancelModal({
            isOpen: false,
            appointment: null,
            canCancel: true,
            reason: "",
            eligibilityChecked: false,
          });
          showToast("Appointment cancelled successfully", "success");
          refreshAppointments();
          return;
        }

        const fallbackResult = await cancellationHookCancel(
          appointmentId,
          cancellationReason.trim()
        );
        console.log("Fallback cancellation result:", fallbackResult);

        if (fallbackResult?.success) {
          setCancelModal({
            isOpen: false,
            appointment: null,
            canCancel: true,
            reason: "",
            eligibilityChecked: false,
          });
          showToast("Appointment cancelled successfully", "success");
          refreshAppointments();
        } else {
          showToast(
            fallbackResult?.error || "Failed to cancel appointment",
            "error"
          );
        }
      } catch (error) {
        console.error("Error cancelling appointment:", error);
        showToast("An error occurred while cancelling", "error");
      }
    },
    [
      hookCancelAppointment,
      cancellationHookCancel,
      showToast,
      refreshAppointments,
    ]
  );

  const handleViewDetails = useCallback(
    (appointment) => {
      const detailedAppointment = getAppointmentDetails(appointment.id);
      setSelectedAppointment(detailedAppointment || appointment);
    },
    [getAppointmentDetails]
  );

  const handleDownloadDetails = useCallback(
    (appointment) => {
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
    },
    [formatDate, formatTime]
  );

  // Access control
  if (!user || !isPatient()) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center p-8 glass-effect rounded-xl border shadow-lg">
          <div className="w-16 h-16 mx-auto mb-4 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Access Denied
          </h1>
          <p className="text-muted-foreground">
            You need to be a verified patient to view appointments.
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (appointmentsError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center p-8 glass-effect rounded-xl border shadow-lg">
          <div className="w-16 h-16 mx-auto mb-4 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Error Loading Appointments
          </h1>
          <p className="text-muted-foreground mb-6">{appointmentsError}</p>
          <button
            onClick={refreshAppointments}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (appointmentsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <LoadingSpinner message="Loading your appointments..." size="large" />
      </div>
    );
  }

  // Empty state
  if (
    filteredAppointments.length === 0 &&
    ongoingTreatments.length === 0 &&
    !appointmentsLoading
  ) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-muted/30 rounded-full flex items-center justify-center">
              <Calendar className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-4">
              {searchTerm
                ? "No appointments found"
                : "No Upcoming Appointments"}
            </h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              {searchTerm
                ? "Try adjusting your search terms to find what you're looking for."
                : "You don't have any upcoming appointments scheduled. Book your next dental visit today."}
            </p>
            <div className="flex items-center justify-center gap-4">
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="px-6 py-3 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
                >
                  Clear Search
                </button>
              )}
              <button className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">
                <Plus className="w-4 h-4" />
                Book New Appointment
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        {/* Toast Notification */}
        {toastMessage && (
          <Toast
            message={toastMessage.message}
            type={toastMessage.type}
            onClose={closeToast}
          />
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Upcoming Appointments
              </h1>
              <p className="text-muted-foreground text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Manage your scheduled appointments and ongoing treatments •{" "}
                {upcomingAppointments.length} upcoming
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg">
                {isConnected ? (
                  <>
                    <Wifi className="w-4 h-4 text-success" />
                    <span className="text-sm font-medium text-success">
                      Live Updates
                    </span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Offline
                    </span>
                  </>
                )}
              </div>
              <button
                onClick={refreshAppointments}
                disabled={appointmentsLoading}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    appointmentsLoading ? "animate-spin" : ""
                  }`}
                />
                {appointmentsLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Total Upcoming"
              value={upcomingAppointments.length}
              icon={<Calendar className="w-6 h-6 text-primary" />}
              color="primary"
            />
            <StatsCard
              title="Pending"
              value={
                upcomingAppointments.filter((a) => a.status === "pending")
                  .length
              }
              icon={<Clock className="w-6 h-6 text-warning" />}
              color="warning"
            />
            <StatsCard
              title="Confirmed"
              value={
                upcomingAppointments.filter((a) => a.status === "confirmed")
                  .length
              }
              icon={<CheckCircle2 className="w-6 h-6 text-success" />}
              color="success"
            />
            <StatsCard
              title="Ongoing Treatments"
              value={ongoingTreatments.length}
              icon={<Activity className="w-6 h-6 text-accent" />}
              color="accent"
            />
          </div>

          {/* Search Bar */}
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            onClear={() => setSearchTerm("")}
            placeholder="Search appointments, doctors, or clinics..."
          />
        </div>

        {/* Urgent Reminders */}
        {urgentAppointments.length > 0 && (
          <div className="mb-8 p-6 bg-warning/10 border border-warning/20 rounded-xl animate-fadeIn">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="w-6 h-6 text-warning" />
              <h3 className="text-xl font-bold text-foreground">
                Appointment Reminders
              </h3>
            </div>
            <div className="space-y-3">
              {urgentAppointments.map((appointment) => {
                const reminder = getReminderMessage(appointment);
                return (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-4 bg-background rounded-lg border border-warning/30"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          reminder.type === "today"
                            ? "bg-destructive"
                            : "bg-warning"
                        }`}
                      />
                      <div>
                        <p className="font-medium text-foreground">
                          {appointment.clinic?.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {reminder.message}
                        </p>
                      </div>
                    </div>
                    {reminder.urgent && (
                      <StatusBadge status={appointment.status} urgent={true} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Ongoing Treatments Section */}
        {(ongoingTreatments.length > 0 ||
          treatmentsLoading ||
          treatmentsError) && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">
                Ongoing Treatments
              </h2>
            </div>

            {treatmentsLoading && (
              <LoadingSpinner message="Loading treatments..." />
            )}

            {treatmentsError && (
              <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  <span className="font-medium text-destructive">
                    Error loading treatments: {treatmentsError}
                  </span>
                </div>
              </div>
            )}

            {ongoingTreatments.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {ongoingTreatments.map((treatment) => (
                  <div
                    key={treatment.id}
                    className="bg-card rounded-xl border p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-foreground mb-1">
                          {treatment.treatment_type}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="w-4 h-4" />
                          <span>{treatment.doctor_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Building className="w-4 h-4" />
                          <span>{treatment.clinic_name}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {treatment.progress}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {treatment.completed_sessions}/
                          {treatment.total_sessions} sessions
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-500"
                          style={{ width: `${treatment.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Next Appointment */}
                    {treatment.next_appointment && (
                      <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                        <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          Next Session
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span>
                              {formatDate(treatment.next_appointment.date)} at{" "}
                              {formatTime(treatment.next_appointment.time)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Stethoscope className="w-4 h-4 text-muted-foreground" />
                            <span>
                              {treatment.next_appointment.service_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span>
                              Duration: {treatment.next_appointment.duration}
                            </span>
                          </div>
                        </div>
                        {treatment.next_appointment.cancellable && (
                          <button className="mt-3 px-4 py-2 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg hover:bg-destructive/20 transition-colors text-sm font-medium">
                            Cancel Next Session
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Appointments List */}
        <div className="space-y-6">
          {filteredAppointments.map((appointment) => {
            const reminder = getReminderMessage(appointment);

            return (
              <div
                key={appointment.id}
                className={`bg-card rounded-xl border p-6 hover:shadow-lg transition-all duration-300 ${
                  reminder.urgent ? "ring-2 ring-warning/50" : ""
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-foreground">
                        {appointment.services?.map((s) => s.name).join(", ") ||
                          "Appointment"}
                      </h3>
                      <StatusBadge
                        status={appointment.status}
                        urgent={reminder.urgent}
                      />
                    </div>
                    <p className="text-muted-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {reminder.message}
                    </p>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">
                          {appointment.doctor?.name || "N/A"}
                        </p>
                        <p className="text-sm text-muted-foreground">Doctor</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Building className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">
                          {appointment.clinic?.name || "N/A"}
                        </p>
                        <p className="text-sm text-muted-foreground">Clinic</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground">
                          {appointment.clinic?.address || "N/A"}
                        </p>
                        <p className="text-sm text-muted-foreground">Address</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">
                          {formatDate(appointment.appointment_date)}
                        </p>
                        <p className="text-sm text-muted-foreground">Date</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">
                          {formatTime(appointment.appointment_time)}
                          {appointment.duration_minutes &&
                            ` (${appointment.duration_minutes} min)`}
                        </p>
                        <p className="text-sm text-muted-foreground">Time</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">
                          {appointment.clinic?.phone || "N/A"}
                        </p>
                        <p className="text-sm text-muted-foreground">Phone</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {appointment.notes && (
                  <div className="mb-6 p-4 bg-muted/30 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <h4 className="font-semibold text-foreground">Notes:</h4>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {appointment.notes}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => handleViewDetails(appointment)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                  <button
                    onClick={() => handleDownloadDetails(appointment)}
                    className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground border border-border rounded-lg hover:bg-muted/80 transition-colors font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  {["confirmed", "pending"].includes(appointment.status) && (
                    <button
                      onClick={() => handleCancelAppointment(appointment)}
                      className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg hover:bg-destructive/20 transition-colors font-medium"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Cancel Modal */}
        {cancelModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl border shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-6">
                <AlertTriangle className="w-6 h-6 text-destructive" />
                <h3 className="text-xl font-bold text-foreground">
                  Cancel Appointment
                </h3>
              </div>

              {!cancelModal.canCancel ? (
                <div>
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg mb-6">
                    <p className="text-destructive font-medium">
                      {cancelModal.eligibilityMessage ||
                        "Outside cancellation window"}
                    </p>
                  </div>
                  <p className="text-muted-foreground mb-6">
                    Please contact the clinic directly to discuss cancellation
                    options.
                  </p>
                  <div className="flex justify-end">
                    <button
                      onClick={() =>
                        setCancelModal({
                          isOpen: false,
                          appointment: null,
                          canCancel: true,
                          reason: "",
                          eligibilityChecked: false,
                        })
                      }
                      className="px-6 py-3 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors font-medium"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-muted-foreground mb-6">
                    Are you sure you want to cancel your appointment with{" "}
                    <strong className="text-foreground">
                      {cancelModal.appointment?.clinic?.name}
                    </strong>
                    ?
                  </p>

                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Reason for cancellation: *
                    </label>
                    <textarea
                      value={cancelModal.reason}
                      onChange={(e) =>
                        setCancelModal((prev) => ({
                          ...prev,
                          reason: e.target.value,
                        }))
                      }
                      placeholder="Please provide a reason for cancellation..."
                      rows={4}
                      className="w-full px-4 py-3 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors resize-none"
                      required
                    />
                    {!cancelModal.reason.trim() && (
                      <p className="text-destructive text-sm mt-1">
                        Cancellation reason is required
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 justify-end">
                    <button
                      onClick={() =>
                        setCancelModal({
                          isOpen: false,
                          appointment: null,
                          canCancel: true,
                          reason: "",
                          eligibilityChecked: false,
                        })
                      }
                      className="px-6 py-3 border border-border rounded-lg text-foreground hover:bg-muted transition-colors font-medium"
                    >
                      Keep Appointment
                    </button>
                    <button
                      onClick={() =>
                        confirmCancelAppointment(
                          cancelModal.appointment?.id,
                          cancelModal.reason
                        )
                      }
                      disabled={!cancelModal.reason.trim() || cancelLoading}
                      className="flex items-center gap-2 px-6 py-3 bg-destructive text-white rounded-lg hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {cancelLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                          Cancelling...
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4" />
                          Confirm Cancel
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Details Modal */}
        {selectedAppointment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl border shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-2xl font-bold text-foreground">
                  Appointment Details
                </h2>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                        <Stethoscope className="w-5 h-5 text-primary" />
                        Service Information
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Services:
                          </span>
                          <p className="font-medium text-foreground">
                            {selectedAppointment.services
                              ?.map((s) => s.name)
                              .join(", ") || "N/A"}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Status:
                          </span>
                          <div className="mt-1">
                            <StatusBadge status={selectedAppointment.status} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        Healthcare Provider
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Doctor:
                          </span>
                          <p className="font-medium text-foreground">
                            {selectedAppointment.doctor?.name || "N/A"}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Clinic:
                          </span>
                          <p className="font-medium text-foreground">
                            {selectedAppointment.clinic?.name || "N/A"}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Address:
                          </span>
                          <p className="font-medium text-foreground">
                            {selectedAppointment.clinic?.address || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        Schedule
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Date:
                          </span>
                          <p className="font-medium text-foreground">
                            {formatDate(selectedAppointment.appointment_date)}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Time:
                          </span>
                          <p className="font-medium text-foreground">
                            {formatTime(selectedAppointment.appointment_time)}
                            {selectedAppointment.duration_minutes &&
                              ` (${selectedAppointment.duration_minutes} min)`}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                        <Phone className="w-5 h-5 text-primary" />
                        Contact Information
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Phone:
                          </span>
                          <p className="font-medium text-foreground">
                            {selectedAppointment.clinic?.phone || "N/A"}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Email:
                          </span>
                          <p className="font-medium text-foreground">
                            {selectedAppointment.clinic?.email || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedAppointment.notes && (
                  <div className="mt-8 p-4 bg-muted/30 rounded-lg border">
                    <h4 className="font-bold text-foreground mb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      Notes
                    </h4>
                    <p className="text-foreground">
                      {selectedAppointment.notes}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
                <button
                  onClick={() => handleDownloadDetails(selectedAppointment)}
                  className="flex items-center gap-2 px-6 py-3 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors font-medium"
                >
                  <Download className="w-4 h-4" />
                  Download Details
                </button>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpcomingAppointments;
