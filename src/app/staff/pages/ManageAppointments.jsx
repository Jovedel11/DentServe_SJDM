import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  AlertCircle,
  Check,
  X,
  Eye,
  Filter,
  Search,
  Loader2,
  Send,
  Building2,
  UserCheck,
  Activity,
} from "lucide-react";
import {
  mockAppointments,
  mockCurrentStaff,
} from "@/data/patient/real/mock-manage-appointment";

const ManageAppointments = () => {
  // State Management
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);
  const [error, setError] = useState(null);

  const [conditionReport, setConditionReport] = useState({
    appointmentId: "",
    conditions: "",
    symptoms: "",
    reportType: "completion", // 'completion' or 'cancellation'
  });

  // Load appointments on component mount
  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    setLoading(true);
    setError(null);

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // TODO: Replace with actual Supabase call
      // const { data, error } = await supabase
      //   .from('appointments')
      //   .select(`
      //     *,
      //     patient:users!patient_id(
      //       id, email, user_type,
      //       user_profile:user_profiles(first_name, last_name, phone, address, date_of_birth, gender),
      //       patient_profile:patient_profiles(emergency_contact_name, emergency_contact_phone, insurance_provider, medical_conditions, allergies)
      //     ),
      //     doctor:doctors(
      //       id, license_number, specialization, rating, total_reviews,
      //       user:users(
      //         user_profile:user_profiles(first_name, last_name, phone)
      //       )
      //     ),
      //     clinic:clinics(id, name, address, city, phone, email)
      //   `)
      //   .eq('clinic_id', mockCurrentStaff.staff_profile.clinic_id)
      //   .order('created_at', { ascending: false });

      // if (error) throw error;

      setAppointments(mockAppointments);
    } catch (err) {
      setError(err.message || "Failed to load appointments");
      console.error("Error loading appointments:", err);
    } finally {
      setLoading(false);
    }
  };

  // Status badge component with enhanced styling
  const StatusBadge = ({ status }) => {
    const statusConfig = {
      pending: {
        color:
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800",
        label: "Pending",
        icon: Clock,
      },
      confirmed: {
        color:
          "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
        label: "Confirmed",
        icon: UserCheck,
      },
      completed: {
        color:
          "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800",
        label: "Completed",
        icon: Check,
      },
      cancelled: {
        color:
          "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800",
        label: "Cancelled",
        icon: X,
      },
      no_show: {
        color:
          "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border border-gray-200 dark:border-gray-800",
        label: "No Show",
        icon: AlertCircle,
      },
    };

    const config = statusConfig[status];
    const Icon = config?.icon || Activity;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${config?.color}`}
      >
        <Icon className="w-3 h-3" />
        {config?.label || status}
      </span>
    );
  };

  // Handle status update with proper error handling
  const handleStatusUpdate = async (appointmentId, newStatus) => {
    try {
      setError(null);

      // TODO: Replace with actual Supabase call
      // const { error } = await supabase
      //   .from('appointments')
      //   .update({
      //     status: newStatus,
      //     updated_at: new Date().toISOString()
      //   })
      //   .eq('id', appointmentId);

      // if (error) throw error;

      // Update local state
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === appointmentId
            ? {
                ...apt,
                status: newStatus,
                updated_at: new Date().toISOString(),
              }
            : apt
        )
      );

      // If cancelling, also update the cancelled fields
      if (newStatus === "cancelled") {
        setAppointments((prev) =>
          prev.map((apt) =>
            apt.id === appointmentId
              ? {
                  ...apt,
                  cancelled_by: mockCurrentStaff.id,
                  cancelled_at: new Date().toISOString(),
                  cancellation_reason: "Cancelled by clinic staff",
                }
              : apt
          )
        );
      }

      console.log(
        `Appointment ${appointmentId} status updated to ${newStatus}`
      );
    } catch (err) {
      setError(err.message || "Failed to update appointment status");
      console.error("Error updating appointment status:", err);
    }
  };

  // Handle sending condition report with email integration
  const handleSendConditionReport = async () => {
    setSendingReport(true);
    setError(null);

    try {
      const appointment = appointments.find(
        (apt) => apt.id === conditionReport.appointmentId
      );
      if (!appointment) throw new Error("Appointment not found");

      // TODO: Replace with actual Supabase call
      // const { error } = await supabase
      //   .from('email_communications')
      //   .insert({
      //     from_user_id: mockCurrentStaff.id,
      //     to_user_id: appointment.patient_id,
      //     appointment_id: conditionReport.appointmentId,
      //     subject: `${conditionReport.reportType === 'completion' ? 'Treatment Report' : 'Appointment Update'} - ${appointment.clinic.name}`,
      //     message_body: `
      //       Dear ${appointment.patient.user_profile.first_name},
      //
      //       ${conditionReport.reportType === 'completion' ? 'Treatment Summary:' : 'Appointment Update:'}
      //       ${conditionReport.conditions}
      //
      //       ${conditionReport.symptoms ? `Additional Notes:\n${conditionReport.symptoms}` : ''}
      //
      //       Best regards,
      //       ${appointment.clinic.name}
      //     `,
      //     email_type: conditionReport.reportType === 'completion' ? 'treatment_report' : 'appointment_update'
      //   });

      // if (error) throw error;

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      console.log("Condition report sent:", {
        appointmentId: conditionReport.appointmentId,
        patientEmail: appointment.patient.email,
        reportType: conditionReport.reportType,
        conditions: conditionReport.conditions,
        symptoms: conditionReport.symptoms,
      });

      // Reset modal
      setShowConditionModal(false);
      setConditionReport({
        appointmentId: "",
        conditions: "",
        symptoms: "",
        reportType: "completion",
      });

      alert("Report sent successfully to patient's email!");
    } catch (err) {
      setError(err.message || "Failed to send condition report");
      console.error("Error sending condition report:", err);
    } finally {
      setSendingReport(false);
    }
  };

  // Open condition report modal
  const openConditionModal = (appointment, type) => {
    setConditionReport({
      appointmentId: appointment.id,
      conditions: "",
      symptoms: "",
      reportType: type,
    });
    setShowConditionModal(true);
  };

  // Enhanced filtering logic
  const filteredAppointments = appointments.filter((appointment) => {
    const matchesStatus =
      filterStatus === "all" || appointment.status === filterStatus;

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      searchTerm === "" ||
      `${appointment.patient.user_profile.first_name} ${appointment.patient.user_profile.last_name}`
        .toLowerCase()
        .includes(searchLower) ||
      `${appointment.doctor.user.user_profile.first_name} ${appointment.doctor.user.user_profile.last_name}`
        .toLowerCase()
        .includes(searchLower) ||
      appointment.service_type.toLowerCase().includes(searchLower) ||
      appointment.patient.email.toLowerCase().includes(searchLower);

    const appointmentDate = new Date(appointment.appointment_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const matchesDate =
      dateFilter === "all" ||
      (dateFilter === "today" &&
        appointmentDate.toDateString() === today.toDateString()) ||
      (dateFilter === "upcoming" && appointmentDate > today) ||
      (dateFilter === "past" && appointmentDate < today);

    return matchesStatus && matchesSearch && matchesDate;
  });

  // Enhanced date and time formatting
  const formatDateTime = (date, time) => {
    const dateObj = new Date(`${date}T${time}`);
    return {
      date: dateObj.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      time: dateObj.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
      isToday: dateObj.toDateString() === new Date().toDateString(),
      isPast: dateObj < new Date(),
    };
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="flex justify-between items-center">
            <div className="h-8 bg-muted rounded-lg w-64"></div>
            <div className="h-6 bg-muted rounded w-32"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-muted rounded-lg"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">
            Manage Appointments
          </h1>
          <p className="text-muted-foreground">
            {mockCurrentStaff.staff_profile.clinic_id
              ? "Bright Smile Dental Clinic"
              : "All Clinics"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg">
            <span className="font-medium">{appointments.length}</span> total
            appointments
          </div>
          <div className="text-sm text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg">
            <span className="font-medium">{filteredAppointments.length}</span>{" "}
            showing
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Enhanced Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Search patients, doctors, services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-border rounded-xl bg-background text-foreground focus:border-primary focus:outline-none appearance-none"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>
        </div>

        {/* Date Filter */}
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-border rounded-xl bg-background text-foreground focus:border-primary focus:outline-none appearance-none"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
          </select>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-center">
          <button
            onClick={loadAppointments}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Activity className="w-4 h-4" />
                Refresh
              </>
            )}
          </button>
        </div>
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {filteredAppointments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <AlertCircle className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No appointments found
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm || filterStatus !== "all" || dateFilter !== "all"
                ? "Try adjusting your filters to see more results."
                : "No appointments have been scheduled yet."}
            </p>
            {(searchTerm || filterStatus !== "all" || dateFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setFilterStatus("all");
                  setDateFilter("all");
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </motion.div>
        ) : (
          <AnimatePresence>
            {filteredAppointments.map((appointment, index) => {
              const { date, time, isToday, isPast } = formatDateTime(
                appointment.appointment_date,
                appointment.appointment_time
              );

              return (
                <motion.div
                  key={appointment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className={`bg-card border-2 border-border rounded-xl p-6 hover:shadow-lg transition-all duration-200 ${
                    isToday ? "border-primary/50 bg-primary/5" : ""
                  } ${
                    isPast && appointment.status === "pending"
                      ? "border-yellow-300 bg-yellow-50 dark:bg-yellow-900/10"
                      : ""
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    {/* Main Info */}
                    <div className="flex-1 space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-bold text-card-foreground">
                          {appointment.patient.user_profile.first_name}{" "}
                          {appointment.patient.user_profile.last_name}
                        </h3>
                        <StatusBadge status={appointment.status} />
                        {isToday && (
                          <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded-full">
                            Today
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center text-muted-foreground">
                          <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span>{date}</span>
                        </div>
                        <div className="flex items-center text-muted-foreground">
                          <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span>
                            {time} ({appointment.duration_minutes}m)
                          </span>
                        </div>
                        <div className="flex items-center text-muted-foreground">
                          <User className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span>
                            Dr.{" "}
                            {appointment.doctor.user.user_profile.first_name}{" "}
                            {appointment.doctor.user.user_profile.last_name}
                          </span>
                        </div>
                        <div className="flex items-center text-muted-foreground">
                          <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span>{appointment.service_type}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center text-muted-foreground">
                          <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span>{appointment.patient.user_profile.phone}</span>
                        </div>
                        <div className="flex items-center text-muted-foreground">
                          <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span>{appointment.patient.email}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      {appointment.status === "pending" && (
                        <>
                          <button
                            onClick={() =>
                              handleStatusUpdate(appointment.id, "confirmed")
                            }
                            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50 transition-colors"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Confirm
                          </button>
                          <button
                            onClick={() =>
                              openConditionModal(appointment, "cancellation")
                            }
                            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 transition-colors"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancel & Report
                          </button>
                        </>
                      )}

                      {appointment.status === "confirmed" && (
                        <button
                          onClick={() => {
                            handleStatusUpdate(appointment.id, "completed");
                            openConditionModal(appointment, "completion");
                          }}
                          className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-colors"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Complete & Report
                        </button>
                      )}

                      {appointment.status === "completed" && (
                        <button
                          onClick={() =>
                            openConditionModal(appointment, "completion")
                          }
                          className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50 transition-colors"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Send Report
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setSelectedAppointment(appointment);
                          setIsModalOpen(true);
                        }}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Condition Report Modal */}
      {showConditionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border-2 border-border rounded-xl w-full max-w-lg"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="text-xl font-bold text-card-foreground">
                  {conditionReport.reportType === "completion"
                    ? "Post-Treatment Report"
                    : "Cancellation Report"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  This report will be sent to the patient's email
                </p>
              </div>
              <button
                onClick={() => setShowConditionModal(false)}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-card-foreground mb-2">
                  {conditionReport.reportType === "completion"
                    ? "Treatment Summary *"
                    : "Cancellation Reason *"}
                </label>
                <textarea
                  value={conditionReport.conditions}
                  onChange={(e) =>
                    setConditionReport((prev) => ({
                      ...prev,
                      conditions: e.target.value,
                    }))
                  }
                  placeholder={
                    conditionReport.reportType === "completion"
                      ? "Describe the treatment provided, procedures performed, medications prescribed, patient response, etc."
                      : "Explain the reason for cancellation, any scheduling conflicts, patient requests, etc."
                  }
                  rows={5}
                  className="w-full px-4 py-3 border-2 border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-card-foreground mb-2">
                  {conditionReport.reportType === "completion"
                    ? "Follow-up Instructions"
                    : "Next Steps"}
                </label>
                <textarea
                  value={conditionReport.symptoms}
                  onChange={(e) =>
                    setConditionReport((prev) => ({
                      ...prev,
                      symptoms: e.target.value,
                    }))
                  }
                  placeholder={
                    conditionReport.reportType === "completion"
                      ? "Any follow-up care instructions, next appointment recommendations, care tips, etc."
                      : "Rescheduling options, alternative solutions, refund information, etc."
                  }
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-none transition-colors"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 p-6 border-t border-border">
              <button
                onClick={() => setShowConditionModal(false)}
                disabled={sendingReport}
                className="px-6 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendConditionReport}
                disabled={!conditionReport.conditions.trim() || sendingReport}
                className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sendingReport ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Report
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Appointment Details Modal */}
      {isModalOpen && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border-2 border-border rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="text-2xl font-bold text-card-foreground">
                  Appointment Details
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  #{selectedAppointment.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Status and Basic Info */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-card-foreground">
                      {selectedAppointment.patient.user_profile.first_name}{" "}
                      {selectedAppointment.patient.user_profile.last_name}
                    </h3>
                    <StatusBadge status={selectedAppointment.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Created{" "}
                    {new Date(
                      selectedAppointment.created_at
                    ).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Patient Information */}
                <div className="bg-muted/30 rounded-xl p-6">
                  <h4 className="font-bold text-card-foreground mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2 text-primary" />
                    Patient Information
                  </h4>
                  <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="text-muted-foreground font-medium">
                          Full Name:
                        </span>
                        <p className="font-semibold">
                          {selectedAppointment.patient.user_profile.first_name}{" "}
                          {selectedAppointment.patient.user_profile.last_name}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground font-medium">
                          Date of Birth:
                        </span>
                        <p className="font-semibold">
                          {new Date(
                            selectedAppointment.patient.user_profile.date_of_birth
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground font-medium">
                          Email:
                        </span>
                        <p className="font-semibold flex items-center">
                          <Mail className="w-4 h-4 mr-2 text-primary" />
                          {selectedAppointment.patient.email}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground font-medium">
                          Phone:
                        </span>
                        <p className="font-semibold flex items-center">
                          <Phone className="w-4 h-4 mr-2 text-primary" />
                          {selectedAppointment.patient.user_profile.phone}
                        </p>
                      </div>
                    </div>

                    <div>
                      <span className="text-muted-foreground font-medium">
                        Address:
                      </span>
                      <p className="font-semibold flex items-start mt-1">
                        <MapPin className="w-4 h-4 mr-2 mt-0.5 text-primary flex-shrink-0" />
                        {selectedAppointment.patient.user_profile.address}
                      </p>
                    </div>

                    {selectedAppointment.patient.patient_profile
                      ?.emergency_contact_name && (
                      <div className="pt-3 border-t border-border">
                        <span className="text-muted-foreground font-medium">
                          Emergency Contact:
                        </span>
                        <p className="font-semibold">
                          {
                            selectedAppointment.patient.patient_profile
                              .emergency_contact_name
                          }
                        </p>
                        <p className="text-muted-foreground">
                          {
                            selectedAppointment.patient.patient_profile
                              .emergency_contact_phone
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Doctor Information */}
                <div className="bg-muted/30 rounded-xl p-6">
                  <h4 className="font-bold text-card-foreground mb-4 flex items-center">
                    <UserCheck className="w-5 h-5 mr-2 text-primary" />
                    Assigned Doctor
                  </h4>
                  <div className="space-y-4 text-sm">
                    <div>
                      <span className="text-muted-foreground font-medium">
                        Doctor:
                      </span>
                      <p className="font-semibold">
                        Dr.{" "}
                        {
                          selectedAppointment.doctor.user.user_profile
                            .first_name
                        }{" "}
                        {selectedAppointment.doctor.user.user_profile.last_name}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-medium">
                        Specialization:
                      </span>
                      <p className="font-semibold">
                        {selectedAppointment.doctor.specialization}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-medium">
                        License Number:
                      </span>
                      <p className="font-semibold">
                        {selectedAppointment.doctor.license_number}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-muted-foreground font-medium">
                          Rating:
                        </span>
                        <p className="font-semibold">
                          {selectedAppointment.doctor.rating}/5.0
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground font-medium">
                          Reviews:
                        </span>
                        <p className="font-semibold">
                          {selectedAppointment.doctor.total_reviews}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Appointment Details */}
              <div className="bg-muted/30 rounded-xl p-6">
                <h4 className="font-bold text-card-foreground mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-primary" />
                  Appointment Details
                </h4>
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <span className="text-muted-foreground font-medium">
                        Date & Time:
                      </span>
                      <p className="font-semibold">
                        {
                          formatDateTime(
                            selectedAppointment.appointment_date,
                            selectedAppointment.appointment_time
                          ).date
                        }
                      </p>
                      <p className="text-primary font-semibold">
                        {
                          formatDateTime(
                            selectedAppointment.appointment_date,
                            selectedAppointment.appointment_time
                          ).time
                        }
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-medium">
                        Duration:
                      </span>
                      <p className="font-semibold">
                        {selectedAppointment.duration_minutes} minutes
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-medium">
                        Service Type:
                      </span>
                      <p className="font-semibold">
                        {selectedAppointment.service_type}
                      </p>
                    </div>
                  </div>

                  {selectedAppointment.symptoms && (
                    <div>
                      <span className="text-muted-foreground font-medium">
                        Symptoms/Concern:
                      </span>
                      <p className="font-semibold mt-1 leading-relaxed">
                        {selectedAppointment.symptoms}
                      </p>
                    </div>
                  )}

                  {selectedAppointment.notes && (
                    <div>
                      <span className="text-muted-foreground font-medium">
                        Patient Notes:
                      </span>
                      <p className="font-semibold mt-1 leading-relaxed">
                        {selectedAppointment.notes}
                      </p>
                    </div>
                  )}

                  {selectedAppointment.cancellation_reason && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <span className="text-muted-foreground font-medium">
                        Cancellation Reason:
                      </span>
                      <p className="font-semibold mt-1 text-red-700 dark:text-red-300">
                        {selectedAppointment.cancellation_reason}
                      </p>
                      {selectedAppointment.cancelled_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Cancelled on{" "}
                          {new Date(
                            selectedAppointment.cancelled_at
                          ).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Clinic Information */}
              <div className="bg-muted/30 rounded-xl p-6">
                <h4 className="font-bold text-card-foreground mb-4 flex items-center">
                  <Building2 className="w-5 h-5 mr-2 text-primary" />
                  Clinic Information
                </h4>
                <div className="text-sm space-y-2">
                  <p className="font-semibold text-lg">
                    {selectedAppointment.clinic.name}
                  </p>
                  <p className="text-muted-foreground flex items-start">
                    <MapPin className="w-4 h-4 mr-2 mt-0.5 text-primary flex-shrink-0" />
                    {selectedAppointment.clinic.address},{" "}
                    {selectedAppointment.clinic.city}
                  </p>
                  <div className="flex items-center gap-4 pt-2">
                    <p className="text-muted-foreground flex items-center">
                      <Phone className="w-4 h-4 mr-2 text-primary" />
                      {selectedAppointment.clinic.phone}
                    </p>
                    <p className="text-muted-foreground flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-primary" />
                      {selectedAppointment.clinic.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 p-6 border-t border-border">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Close
              </button>

              {selectedAppointment.status === "pending" && (
                <>
                  <button
                    onClick={() => {
                      handleStatusUpdate(selectedAppointment.id, "confirmed");
                      setIsModalOpen(false);
                    }}
                    className="px-6 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Confirm Appointment
                  </button>
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      openConditionModal(selectedAppointment, "cancellation");
                    }}
                    className="px-6 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Cancel & Report
                  </button>
                </>
              )}

              {selectedAppointment.status === "confirmed" && (
                <button
                  onClick={() => {
                    handleStatusUpdate(selectedAppointment.id, "completed");
                    setIsModalOpen(false);
                    openConditionModal(selectedAppointment, "completion");
                  }}
                  className="px-6 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Mark Completed & Send Report
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ManageAppointments;
