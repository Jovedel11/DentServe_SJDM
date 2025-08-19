import React, { useState, useEffect } from "react";
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

const UpcomingAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [ongoingTreatments, setOngoingTreatments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [cancelModal, setCancelModal] = useState({
    isOpen: false,
    appointment: null,
    canCancel: true,
    reason: "",
  });
  const [toast, setToast] = useState({
    isVisible: false,
    type: "success", // success, error, warning, info
    title: "",
    message: "",
  });

  // Mock data - replace with API calls
  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockAppointments = [
        {
          id: 1,
          type: "regular",
          service: "Regular Checkup",
          doctor: "Dr. Sarah Martinez",
          clinic: "Downtown Dental Center",
          clinicAddress: "123 Main St, Downtown",
          date: "2025-08-19", // Today
          time: "15:00",
          duration: "60 min",
          status: "confirmed",
          notes: "Routine examination and cleaning",
          contactInfo: {
            phone: "+1 (555) 123-4567",
            email: "appointments@downtown-dental.com",
          },
          reminder: "today",
          cancellable: false, // Same day - cannot cancel
        },
        {
          id: 2,
          type: "regular",
          service: "Teeth Whitening",
          doctor: "Dr. Emily Smith",
          clinic: "Smile Care Clinic",
          clinicAddress: "456 Oak Ave, Midtown",
          date: "2025-08-20", // Tomorrow
          time: "10:00",
          duration: "120 min",
          status: "confirmed",
          notes: "Professional whitening treatment",
          contactInfo: {
            phone: "+1 (555) 987-6543",
            email: "info@smilecare.com",
          },
          reminder: "tomorrow",
          cancellable: false, // Less than 2 days - cannot cancel
        },
        {
          id: 3,
          type: "regular",
          service: "Cavity Filling",
          doctor: "Dr. Michael Johnson",
          clinic: "Advanced Dental Solutions",
          clinicAddress: "789 Pine St, Uptown",
          date: "2025-08-25",
          time: "14:30",
          duration: "90 min",
          status: "confirmed",
          notes: "Composite filling for upper molar",
          contactInfo: {
            phone: "+1 (555) 456-7890",
            email: "contact@advanceddental.com",
          },
          reminder: "upcoming",
          cancellable: true, // More than 2 days - can cancel
        },
        {
          id: 4,
          type: "regular",
          service: "Root Canal - Follow-up",
          doctor: "Dr. James Brown",
          clinic: "Downtown Dental Center",
          clinicAddress: "123 Main St, Downtown",
          date: "2025-09-02",
          time: "09:00",
          duration: "90 min",
          status: "confirmed",
          notes: "Final check-up after root canal treatment",
          contactInfo: {
            phone: "+1 (555) 123-4567",
            email: "appointments@downtown-dental.com",
          },
          reminder: "upcoming",
          cancellable: true, // More than 2 days - can cancel
        },
      ];

      const mockOngoingTreatments = [
        {
          id: 101,
          type: "ongoing",
          treatment: "Orthodontic Braces",
          doctor: "Dr. Michael Johnson",
          clinic: "Advanced Dental Solutions",
          clinicAddress: "789 Pine St, Uptown",
          startDate: "2025-06-15",
          estimatedEndDate: "2025-12-15",
          progress: 65,
          nextAppointment: {
            date: "2025-08-22",
            time: "11:00",
            service: "Braces Adjustment",
            duration: "45 min",
            cancellable: true,
          },
          totalSessions: 12,
          completedSessions: 8,
          contactInfo: {
            phone: "+1 (555) 456-7890",
            email: "contact@advanceddental.com",
          },
        },
        {
          id: 102,
          type: "ongoing",
          treatment: "Implant Procedure",
          doctor: "Dr. Sarah Martinez",
          clinic: "Downtown Dental Center",
          clinicAddress: "123 Main St, Downtown",
          startDate: "2025-07-01",
          estimatedEndDate: "2025-10-01",
          progress: 40,
          nextAppointment: {
            date: "2025-08-28",
            time: "13:30",
            service: "Implant Check & Crown Fitting",
            duration: "75 min",
            cancellable: true,
          },
          totalSessions: 5,
          completedSessions: 2,
          contactInfo: {
            phone: "+1 (555) 123-4567",
            email: "appointments@downtown-dental.com",
          },
        },
      ];

      setAppointments(mockAppointments);
      setOngoingTreatments(mockOngoingTreatments);
      setLoading(false);
    };

    fetchAppointments();
  }, []);

  // Check if appointment can be cancelled (more than 48 hours before)
  const checkCancellationEligibility = (appointmentDate) => {
    const appointment = new Date(appointmentDate);
    const now = new Date();
    const diffHours = (appointment.getTime() - now.getTime()) / (1000 * 3600);
    return diffHours > 48; // More than 48 hours
  };

  // Calculate days remaining until appointment
  const getDaysUntilAppointment = (appointmentDate) => {
    const appointment = new Date(appointmentDate);
    const now = new Date();
    const diffTime = appointment.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
    return diffDays;
  };

  const showToast = (type, title, message) => {
    setToast({
      isVisible: true,
      type,
      title,
      message,
    });

    // Auto-hide toast after 5 seconds
    setTimeout(() => {
      setToast((prev) => ({ ...prev, isVisible: false }));
    }, 5000);
  };

  const handleCancelAppointment = (appointment) => {
    const daysUntil = getDaysUntilAppointment(appointment.date);
    const canCancel = daysUntil > 2;

    if (!canCancel) {
      let reason = "";
      if (daysUntil === 0) {
        reason = "Appointments cannot be cancelled on the same day.";
      } else if (daysUntil === 1) {
        reason =
          "Appointments cannot be cancelled with less than 24 hours notice.";
      } else if (daysUntil === 2) {
        reason =
          "Appointments cannot be cancelled with less than 48 hours notice.";
      }

      setCancelModal({
        isOpen: true,
        appointment,
        canCancel: false,
        reason,
      });
    } else {
      setCancelModal({
        isOpen: true,
        appointment,
        canCancel: true,
        reason: "",
      });
    }
  };

  const confirmCancelAppointment = async (
    appointmentId,
    cancellationReason
  ) => {
    try {
      // Here you would call your API to cancel the appointment
      // await cancelAppointmentAPI(appointmentId, cancellationReason);

      // Update local state
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === appointmentId
            ? { ...apt, status: "cancelled", cancellationReason }
            : apt
        )
      );

      setOngoingTreatments((prev) =>
        prev.map((treatment) =>
          treatment.id === appointmentId
            ? {
                ...treatment,
                nextAppointment: {
                  ...treatment.nextAppointment,
                  status: "cancelled",
                  cancellationReason,
                },
              }
            : treatment
        )
      );

      setCancelModal({
        isOpen: false,
        appointment: null,
        canCancel: true,
        reason: "",
      });

      showToast(
        "success",
        "Appointment Cancelled",
        "Your appointment has been successfully cancelled. You'll receive a confirmation email shortly."
      );
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      showToast(
        "error",
        "Cancellation Failed",
        "There was an error cancelling your appointment. Please try again or contact support."
      );
    }
  };

  // Filter appointments based on search and filter type
  const filteredAppointments = appointments.filter((appointment) => {
    const matchesSearch =
      appointment.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.doctor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.clinic.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === "all") return true;

    const appointmentDate = new Date(appointment.date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    switch (filterType) {
      case "today":
        return appointmentDate.toDateString() === today.toDateString();
      case "tomorrow":
        return appointmentDate.toDateString() === tomorrow.toDateString();
      case "thisWeek":
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        return appointmentDate >= today && appointmentDate <= nextWeek;
      default:
        return true;
    }
  });

  const getReminderMessage = (appointment) => {
    const appointmentDate = new Date(`${appointment.date}T${appointment.time}`);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const appointmentDay = new Date(
      appointmentDate.getFullYear(),
      appointmentDate.getMonth(),
      appointmentDate.getDate()
    );

    const diffTime = appointmentDay.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return {
        message: `You have an appointment today at ${formatTime(
          appointment.time
        )}`,
        type: "today",
        urgent: true,
      };
    } else if (diffDays === 1) {
      return {
        message: `You have an appointment tomorrow at ${formatTime(
          appointment.time
        )}`,
        type: "tomorrow",
        urgent: true,
      };
    } else {
      return {
        message: `You have an upcoming appointment on ${formatDate(
          appointment.date
        )} at ${formatTime(appointment.time)}`,
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
    setSelectedAppointment(appointment);
  };

  const handleDownloadDetails = (appointment) => {
    const details = `
APPOINTMENT DETAILS
==================
Service: ${appointment.service}
Doctor: ${appointment.doctor}
Clinic: ${appointment.clinic}
Address: ${appointment.clinicAddress}
Date: ${formatDate(appointment.date)}
Time: ${formatTime(appointment.time)}
Duration: ${appointment.duration}
Status: ${appointment.status}
Notes: ${appointment.notes}

CONTACT INFORMATION
==================
Phone: ${appointment.contactInfo.phone}
Email: ${appointment.contactInfo.email}
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
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/50 transition-colors">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
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
            <option value="all">All Appointments</option>
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="thisWeek">This Week</option>
          </select>
        </div>
      </div>

      {/* Today's Reminders */}
      {filteredAppointments.some(
        (apt) => apt.reminder === "today" || apt.reminder === "tomorrow"
      ) && (
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
              {filteredAppointments
                .filter(
                  (apt) =>
                    apt.reminder === "today" || apt.reminder === "tomorrow"
                )
                .map((appointment) => {
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
            Ongoing Treatments
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {ongoingTreatments.map((treatment) => (
              <motion.div
                key={treatment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-card border border-border rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-foreground">
                        {treatment.treatment}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="w-4 h-4" />
                        {treatment.doctor}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="w-4 h-4" />
                        {treatment.clinic}
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                      In Progress
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium text-foreground">
                        {treatment.progress}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-500"
                        style={{ width: `${treatment.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {treatment.completedSessions} of{" "}
                        {treatment.totalSessions} sessions
                      </span>
                      <span>
                        Est. completion:{" "}
                        {formatDate(treatment.estimatedEndDate)}
                      </span>
                    </div>
                  </div>

                  {/* Next Appointment */}
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="text-sm font-medium text-foreground mb-2">
                      Next Appointment
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        {formatDate(treatment.nextAppointment.date)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {formatTime(treatment.nextAppointment.time)} (
                        {treatment.nextAppointment.duration})
                      </div>
                      <div className="flex items-center gap-2">
                        <Stethoscope className="w-3 h-3" />
                        {treatment.nextAppointment.service}
                      </div>
                    </div>
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
          Scheduled Appointments
        </h2>

        {filteredAppointments.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((appointment, index) => {
              const reminder = getReminderMessage(appointment);
              const daysUntil = getDaysUntilAppointment(appointment.date);
              const canCancel =
                checkCancellationEligibility(appointment.date) &&
                appointment.status === "confirmed";

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
                            {appointment.service}
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
                          <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 text-sm font-medium rounded-full">
                            Confirmed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Cancellation Warning */}
                    {!canCancel && appointment.status === "confirmed" && (
                      <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <span className="font-medium text-orange-800 dark:text-orange-300">
                            Cannot be cancelled
                          </span>
                          <div className="text-orange-700 dark:text-orange-400">
                            {daysUntil === 0 &&
                              "Same-day appointments cannot be cancelled"}
                            {daysUntil === 1 &&
                              "Less than 24 hours notice required"}
                            {daysUntil === 2 &&
                              "Less than 48 hours notice required"}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                          <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-foreground font-medium">
                            {appointment.doctor}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <div>
                            <div className="text-foreground font-medium">
                              {appointment.clinic}
                            </div>
                            <div className="text-muted-foreground">
                              {appointment.clinicAddress}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                          <CalendarIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-foreground font-medium">
                            {formatDate(appointment.date)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-foreground font-medium">
                            {formatTime(appointment.time)} (
                            {appointment.duration})
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
                      appointment.cancellationReason && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
                          <div className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                            Cancellation Reason
                          </div>
                          <div className="text-sm text-red-700 dark:text-red-400">
                            {appointment.cancellationReason}
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
                      {appointment.status === "confirmed" && (
                        <button
                          onClick={() => handleCancelAppointment(appointment)}
                          disabled={!canCancel}
                          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            canCancel
                              ? "text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/30"
                              : "text-muted-foreground bg-muted cursor-not-allowed opacity-50"
                          }`}
                        >
                          <XCircle className="w-4 h-4" />
                          Cancel
                        </button>
                      )}

                      <div className="ml-auto flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {appointment.contactInfo.phone}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
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
                          {selectedAppointment.service ||
                            selectedAppointment.treatment}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Doctor
                        </label>
                        <div className="text-foreground">
                          {selectedAppointment.doctor}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Clinic
                        </label>
                        <div className="text-foreground">
                          {selectedAppointment.clinic}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {selectedAppointment.clinicAddress}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Date & Time
                        </label>
                        <div className="text-foreground">
                          {selectedAppointment.date
                            ? formatDate(selectedAppointment.date)
                            : "N/A"}
                        </div>
                        <div className="text-foreground">
                          {selectedAppointment.time
                            ? formatTime(selectedAppointment.time)
                            : "N/A"}
                          {selectedAppointment.duration &&
                            ` (${selectedAppointment.duration})`}
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
                          {selectedAppointment.contactInfo?.phone}
                        </div>
                        <div className="text-foreground">
                          {selectedAppointment.contactInfo?.email}
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

                  {selectedAppointment.type === "ongoing" && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Progress
                        </label>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all duration-500"
                              style={{
                                width: `${selectedAppointment.progress}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-foreground">
                            {selectedAppointment.progress}%
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Sessions Completed
                          </label>
                          <div className="text-foreground">
                            {selectedAppointment.completedSessions} of{" "}
                            {selectedAppointment.totalSessions}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Estimated Completion
                          </label>
                          <div className="text-foreground">
                            {formatDate(selectedAppointment.estimatedEndDate)}
                          </div>
                        </div>
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
