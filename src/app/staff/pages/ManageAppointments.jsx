import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  FileText,
  AlertCircle,
  Check,
  X,
  Eye,
  Filter,
  Search,
  Loader2,
  Send,
  UserCheck,
  Activity,
  Shield,
  AlertTriangle,
  CheckCircle,
  Star,
  Heart,
  Zap,
  RefreshCw,
  Bell,
  MessageSquare,
  Stethoscope,
  Clipboard,
  TrendingUp,
  TrendingDown,
  Info,
} from "lucide-react";

import { useStaffAppointments } from "@/core/hooks/useStaffAppointment";
import { useAppointmentRealtime } from "@/core/hooks/useAppointmentRealtime";

const ManageAppointments = () => {
  // ✅ Enhanced hook integration
  const {
    appointments,
    isLoading,
    error,
    stats,
    fetchAppointments,
    approveAppointment,
    rejectAppointment,
    completeAppointment,
    hasAppointments,
  } = useStaffAppointments();

  // ✅ Real-time updates with better error handling
  const {} = useAppointmentRealtime({
    enableAppointments: true,
    enableNotifications: false,
    onAppointmentUpdate: useCallback(
      (update) => {
        console.log("🔄 Real-time appointment update:", update);
        fetchAppointments({ refresh: true });
      },
      [fetchAppointments]
    ),
  });

  // ✅ Enhanced state management
  const [filters, setFilters] = useState({
    status: "active", // Only show pending and confirmed
    search: "",
    date: "all",
    priority: "all",
  });

  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [modals, setModals] = useState({
    details: false,
    approve: false,
    reject: false,
    complete: false,
  });

  const [actionState, setActionState] = useState({
    processing: false,
    error: null,
    success: null,
    type: null,
    appointmentId: null,
  });

  // ✅ Enhanced form states for different actions
  const [approvalForm, setApprovalForm] = useState({
    notes: "",
    sendReminder: true,
  });

  const [rejectionForm, setRejectionForm] = useState({
    reason: "",
    category: "other",
    suggestReschedule: false,
    alternativeDates: [],
  });

  const [completionForm, setCompletionForm] = useState({
    notes: "",
    followUp: "",
    followUpRequired: false,
    servicesCompleted: [],
    patientCondition: "stable",
    nextAppointmentSuggested: false,
  });

  // ✅ Enhanced action handler with comprehensive error handling and success feedback
  const handleAppointmentAction = useCallback(
    async (appointmentId, actionType, formData = null) => {
      console.log(`🔄 Starting ${actionType} for appointment:`, appointmentId);

      setActionState({
        processing: true,
        error: null,
        success: null,
        type: actionType,
        appointmentId,
      });

      try {
        let result;

        switch (actionType) {
          case "approve":
            console.log("📋 Calling approveAppointment with:", formData);
            result = await approveAppointment(
              appointmentId,
              formData?.notes || "Approved by staff"
            );
            break;

          case "reject":
            console.log("🚫 Calling rejectAppointment with:", formData);
            const rejectionPayload = {
              reason: formData.reason.trim(),
              category: formData.category || "other",
              suggest_reschedule: formData.suggestReschedule || false,
              alternative_dates: formData.alternativeDates || null,
            };
            result = await rejectAppointment(appointmentId, rejectionPayload);
            break;

          case "complete":
            console.log("✅ Calling completeAppointment with:", formData);
            if (!formData?.notes?.trim()) {
              throw new Error("Treatment summary is required for completion");
            }

            const completionPayload = {
              notes: formData.notes.trim(),
              follow_up_required: Boolean(formData.followUpRequired),
              follow_up_notes: formData.followUp || "",
              services_completed: formData.servicesCompleted || [],
            };

            result = await completeAppointment(
              appointmentId,
              completionPayload
            );
            break;

          default:
            throw new Error("Invalid action type");
        }

        console.log(`✅ ${actionType} result:`, result);

        if (!result.success) {
          throw new Error(result.error || `${actionType} failed`);
        }

        // ✅ SUCCESS: Show success message and reset forms
        setActionState({
          processing: false,
          error: null,
          success: result.message || `${actionType} completed successfully`,
          type: null,
          appointmentId: null,
        });

        // Reset forms
        setApprovalForm({ notes: "", sendReminder: true });
        setRejectionForm({
          reason: "",
          category: "other",
          suggestReschedule: false,
          alternativeDates: [],
        });
        setCompletionForm({
          notes: "",
          followUp: "",
          followUpRequired: false,
          servicesCompleted: [],
          patientCondition: "stable",
          nextAppointmentSuggested: false,
        });

        // Close modals after a brief delay to show success
        setTimeout(() => {
          setModals({
            details: false,
            approve: false,
            reject: false,
            complete: false,
          });
          setActionState(prev => ({ ...prev, success: null }));
        }, 2000);

        return result;
      } catch (err) {
        console.error(`❌ ${actionType} error:`, err);
        const errorMessage =
          err.message || `${actionType} failed. Please try again.`;

        setActionState({
          processing: false,
          error: errorMessage,
          success: null,
          type: null,
          appointmentId: null,
        });

        throw err;
      }
    },
    [approveAppointment, rejectAppointment, completeAppointment]
  );

  // ✅ Enhanced filtered appointments with better logic
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      // Status filter - only show active appointments (pending, confirmed)
      const matchesStatus =
        filters.status === "all" ||
        (filters.status === "active" && 
         ["pending", "confirmed"].includes(appointment.status)) ||
        appointment.status === filters.status;

      const matchesSearch =
        !filters.search ||
        [
          appointment.patient?.name,
          appointment.doctor?.name,
          appointment.patient?.email,
          appointment.patient?.phone,
        ].some((field) =>
          field?.toLowerCase().includes(filters.search.toLowerCase())
        );

      const appointmentDate = new Date(appointment.appointment_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const matchesDate =
        filters.date === "all" ||
        (filters.date === "today" &&
          appointmentDate.toDateString() === today.toDateString()) ||
        (filters.date === "upcoming" && appointmentDate >= today) ||
        (filters.date === "past" && appointmentDate < today);

      return matchesStatus && matchesSearch && matchesDate;
    });
  }, [appointments, filters]);

  // ✅ Enhanced patient reliability component
  const PatientReliabilityBadge = React.memo(({ reliability }) => {
    if (!reliability) return null;

    const riskLevel = reliability.risk_level;
    const completionRate = reliability.statistics?.completion_rate || 0;

    const riskConfig = {
      reliable: {
        color: "bg-green-100 text-green-800 border-green-200",
        icon: CheckCircle,
        label: "Reliable",
      },
      low_risk: {
        color: "bg-blue-100 text-blue-800 border-blue-200",
        icon: Shield,
        label: "Low Risk",
      },
      moderate_risk: {
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: AlertTriangle,
        label: "Moderate Risk",
      },
      high_risk: {
        color: "bg-red-100 text-red-800 border-red-200",
        icon: AlertCircle,
        label: "High Risk",
      },
      new_patient: {
        color: "bg-purple-100 text-purple-800 border-purple-200",
        icon: Star,
        label: "New Patient",
      },
    };

    const config = riskConfig[riskLevel] || riskConfig.reliable;
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        <Icon className="w-3 h-3" />
        <span>{config.label}</span>
        <span className="text-xs opacity-75">({completionRate}%)</span>
      </div>
    );
  });

  // ✅ Enhanced status badge with better styling
  const StatusBadge = React.memo(({ status, isToday = false }) => {
    const configs = {
      pending: {
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: Clock,
        label: "Pending Review",
        pulse: true,
      },
      confirmed: {
        color: "bg-blue-100 text-blue-800 border-blue-200",
        icon: UserCheck,
        label: "Confirmed",
      },
      completed: {
        color: "bg-green-100 text-green-800 border-green-200",
        icon: Check,
        label: "Completed",
      },
      cancelled: {
        color: "bg-red-100 text-red-800 border-red-200",
        icon: X,
        label: "Cancelled",
      },
      no_show: {
        color: "bg-gray-100 text-gray-800 border-gray-200",
        icon: AlertCircle,
        label: "No Show",
      },
    };

    const config = configs[status] || configs.pending;
    const Icon = config.icon;

    return (
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${config.color} ${
            config.pulse ? "animate-pulse" : ""
          }`}
        >
          <Icon className="w-3 h-3" />
          {config.label}
        </span>
        {isToday && (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
            Today
          </span>
        )}
      </div>
    );
  });

  // ✅ Format date/time with enhanced display
  const formatDateTime = useCallback((date, time) => {
    const dateObj = new Date(`${date}T${time}`);
    return {
      date: dateObj.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      time: dateObj.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
      isToday: dateObj.toDateString() === new Date().toDateString(),
      isPast: dateObj < new Date(),
      isUpcoming: dateObj > new Date(),
    };
  }, []);

  // ✅ Filter update handler
  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Clear success messages after time
  useEffect(() => {
    if (actionState.success) {
      const timer = setTimeout(() => {
        setActionState(prev => ({ ...prev, success: null }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [actionState.success]);

  // Loading state
  if (isLoading && appointments.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-40 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* ✅ Enhanced Header with better stats */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Stethoscope className="w-8 h-8 text-blue-600" />
            Manage Appointments
          </h1>
          <p className="text-gray-600 mt-2">
            Review, approve, and manage patient appointments
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="bg-white border border-gray-200 px-4 py-3 rounded-lg shadow-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-gray-900">{stats.total}</span>
            </div>
            <span className="text-gray-600">Total</span>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              <span className="font-medium text-yellow-800">{stats.pending}</span>
            </div>
            <span className="text-yellow-600">Pending</span>
          </div>
          <div className="bg-blue-50 border border-blue-200 px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-800">{stats.confirmed}</span>
            </div>
            <span className="text-blue-600">Confirmed</span>
          </div>
          <div className="bg-green-50 border border-green-200 px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-800">
                {filteredAppointments.length}
              </span>
            </div>
            <span className="text-green-600">Showing</span>
          </div>
        </div>
      </div>

      {/* ✅ Success/Error Messages */}
      <AnimatePresence>
        {(error || actionState.error) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-700 font-medium">
                {error || actionState.error}
              </p>
              {actionState.appointmentId && (
                <p className="text-xs text-red-600 mt-1">
                  Appointment ID: {actionState.appointmentId.slice(0, 8)}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                setError?.(null);
                setActionState((prev) => ({ ...prev, error: null }));
              }}
              className="text-red-400 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {actionState.success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3"
          >
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-green-700 font-medium">
                {actionState.success}
              </p>
            </div>
            <button
              onClick={() => setActionState((prev) => ({ ...prev, success: null }))}
              className="text-green-400 hover:text-green-600"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✅ Enhanced Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search patients, doctors..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <select
            value={filters.status}
            onChange={(e) => updateFilter("status", e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white appearance-none transition-all"
          >
            <option value="active">Active (Pending & Confirmed)</option>
            <option value="all">All Status</option>
            <option value="pending">Pending Only</option>
            <option value="confirmed">Confirmed Only</option>
          </select>
        </div>

        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <select
            value={filters.date}
            onChange={(e) => updateFilter("date", e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white appearance-none transition-all"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
          </select>
        </div>

        <button
          onClick={() => fetchAppointments({ refresh: true })}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Refresh
        </button>
      </div>

      {/* ✅ Enhanced Appointments List */}
      <div className="space-y-4">
        {!hasAppointments ? (
          <div className="text-center py-16 bg-gray-50 rounded-lg">
            <Stethoscope className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No appointments found
            </h3>
            <p className="text-gray-600 mb-6">
              {Object.values(filters).some((v) => v !== "all" && v !== "" && v !== "active")
                ? "Try adjusting your filters to see more results."
                : "No appointments have been scheduled yet."}
            </p>
            {Object.values(filters).some((v) => v !== "all" && v !== "" && v !== "active") && (
              <button
                onClick={() =>
                  setFilters({ status: "active", search: "", date: "all", priority: "all" })
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <AnimatePresence>
            {filteredAppointments.map((appointment, index) => {
              const { date, time, isToday, isPast } = formatDateTime(
                appointment.appointment_date,
                appointment.appointment_time
              );

              const isProcessingThisAppointment =
                actionState.processing &&
                actionState.appointmentId === appointment.id;

              return (
                <motion.div
                  key={appointment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-white border rounded-xl p-6 hover:shadow-lg transition-all duration-300 ${
                    isToday ? "border-blue-300 bg-blue-50/50" : "border-gray-200"
                  } ${isProcessingThisAppointment ? "opacity-75" : ""} ${
                    appointment.status === "pending" ? "ring-2 ring-yellow-100" : ""
                  }`}
                >
                  <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
                    {/* ✅ Enhanced Appointment Info */}
                    <div className="flex-1 space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                          <User className="w-5 h-5 text-gray-400" />
                          {appointment.patient?.name || "Unknown Patient"}
                        </h3>
                        <StatusBadge status={appointment.status} isToday={isToday} />
                        {isProcessingThisAppointment && (
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Processing {actionState.type}...
                          </span>
                        )}
                      </div>

                      {/* Patient Reliability Info */}
                      {appointment.patient_reliability && (
                        <PatientReliabilityBadge reliability={appointment.patient_reliability} />
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className={isToday ? "font-semibold text-blue-600" : "text-gray-600"}>
                            {date}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">
                            {appointment.doctor?.name || "Unassigned"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{appointment.patient?.phone || "N/A"}</span>
                        </div>
                      </div>

                      {/* Services */}
                      {appointment.services && appointment.services.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {appointment.services.map((service, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-indigo-50 text-indigo-700 border border-indigo-200"
                            >
                              {service.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Symptoms */}
                      {appointment.symptoms && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-700">Symptoms:</span>
                          </div>
                          <p className="text-sm text-gray-600">{appointment.symptoms}</p>
                        </div>
                      )}
                    </div>

                    {/* ✅ Enhanced Action Buttons */}
                    <div className="flex flex-wrap xl:flex-col items-center gap-2">
                      {appointment.status === "pending" && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedAppointment(appointment);
                              setModals((prev) => ({ ...prev, approve: true }));
                            }}
                            disabled={isProcessingThisAppointment}
                            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-green-100 text-green-800 hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedAppointment(appointment);
                              setModals((prev) => ({ ...prev, reject: true }));
                            }}
                            disabled={isProcessingThisAppointment}
                            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-red-100 text-red-800 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Reject
                          </button>
                        </>
                      )}

                      {appointment.status === "confirmed" && (
                        <button
                          onClick={() => {
                            setSelectedAppointment(appointment);
                            setModals((prev) => ({ ...prev, complete: true }));
                          }}
                          disabled={isProcessingThisAppointment}
                          className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          <Clipboard className="w-4 h-4 mr-2" />
                          Complete
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setSelectedAppointment(appointment);
                          setModals((prev) => ({ ...prev, details: true }));
                        }}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 transition-all"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Details
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* ✅ Enhanced Approval Modal */}
      {modals.approve && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" />
                  Approve Appointment
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Confirm this appointment for {selectedAppointment.patient?.name}
                </p>
              </div>
              <button
                onClick={() => setModals((prev) => ({ ...prev, approve: false }))}
                disabled={actionState.processing}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {actionState.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{actionState.error}</p>
                </div>
              )}

              {actionState.success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-700">{actionState.success}</p>
                </div>
              )}

              {/* Patient Reliability Warning */}
              {selectedAppointment.patient_reliability?.risk_level === 'high_risk' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-red-800 mb-1">High Risk Patient</h4>
                      <p className="text-sm text-red-700 mb-2">
                        This patient has a {selectedAppointment.patient_reliability.statistics?.completion_rate}% completion rate.
                      </p>
                      <div className="text-xs text-red-600">
                        <p className="font-medium">Recommended Actions:</p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          {selectedAppointment.patient_reliability.recommendations?.map((rec, idx) => (
                            <li key={idx}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Staff Notes (Optional)
                </label>
                <textarea
                  value={approvalForm.notes}
                  onChange={(e) =>
                    setApprovalForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Add any notes about this approval..."
                  rows={3}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                  disabled={actionState.processing}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendReminder"
                  checked={approvalForm.sendReminder}
                  onChange={(e) =>
                    setApprovalForm((prev) => ({ ...prev, sendReminder: e.target.checked }))
                  }
                  disabled={actionState.processing}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <label htmlFor="sendReminder" className="text-sm text-gray-700">
                  Send confirmation reminder to patient
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setModals((prev) => ({ ...prev, approve: false }))}
                disabled={actionState.processing}
                className="px-6 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAppointmentAction(selectedAppointment.id, "approve", approvalForm)}
                disabled={actionState.processing}
                className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionState.processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Approve Appointment
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ✅ Enhanced Rejection Modal */}
      {modals.reject && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <X className="w-5 h-5 text-red-600" />
                  Reject Appointment
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Provide a reason for rejecting this appointment
                </p>
              </div>
              <button
                onClick={() => setModals((prev) => ({ ...prev, reject: false }))}
                disabled={actionState.processing}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {actionState.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{actionState.error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Rejection Category
                </label>
                <select
                  value={rejectionForm.category}
                  onChange={(e) =>
                    setRejectionForm((prev) => ({ ...prev, category: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  disabled={actionState.processing}
                >
                  <option value="other">Other</option>
                  <option value="doctor_unavailable">Doctor Unavailable</option>
                  <option value="overbooked">Overbooked</option>
                  <option value="patient_request">Patient Request</option>
                  <option value="system_error">System Error</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectionForm.reason}
                  onChange={(e) =>
                    setRejectionForm((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  placeholder="Explain why this appointment is being rejected..."
                  rows={4}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                  disabled={actionState.processing}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {rejectionForm.reason.length}/500 characters
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="suggestReschedule"
                  checked={rejectionForm.suggestReschedule}
                  onChange={(e) =>
                    setRejectionForm((prev) => ({ ...prev, suggestReschedule: e.target.checked }))
                  }
                  disabled={actionState.processing}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <label htmlFor="suggestReschedule" className="text-sm text-gray-700">
                  Suggest rescheduling to patient
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setModals((prev) => ({ ...prev, reject: false }))}
                disabled={actionState.processing}
                className="px-6 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAppointmentAction(selectedAppointment.id, "reject", rejectionForm)}
                disabled={!rejectionForm.reason.trim() || actionState.processing}
                className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionState.processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4" />
                    Reject Appointment
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ✅ Enhanced Completion Modal */}
      {modals.complete && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Clipboard className="w-5 h-5 text-blue-600" />
                  Complete Appointment
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Document treatment and completion details
                </p>
              </div>
              <button
                onClick={() => setModals((prev) => ({ ...prev, complete: false }))}
                disabled={actionState.processing}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {actionState.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{actionState.error}</p>
                </div>
              )}

              {actionState.success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-700">{actionState.success}</p>
                </div>
              )}

              {/* Services Completed */}
              {selectedAppointment.services && selectedAppointment.services.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Services Completed
                  </label>
                  <div className="space-y-2">
                    {selectedAppointment.services.map((service, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <input
                          type="checkbox"
                          id={`service-${service.id}`}
                          checked={completionForm.servicesCompleted.includes(service.id)}
                          onChange={(e) => {
                            setCompletionForm((prev) => ({
                              ...prev,
                              servicesCompleted: e.target.checked
                                ? [...prev.servicesCompleted, service.id]
                                : prev.servicesCompleted.filter(id => id !== service.id)
                            }));
                          }}
                          disabled={actionState.processing}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor={`service-${service.id}`} className="flex-1 text-sm text-gray-700">
                          {service.name}
                          {service.duration_minutes && (
                            <span className="text-gray-500 ml-2">({service.duration_minutes} min)</span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Treatment Summary *
                </label>
                <textarea
                  value={completionForm.notes}
                  onChange={(e) =>
                    setCompletionForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Document the treatment provided, patient response, medications prescribed, observations, etc."
                  rows={5}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  disabled={actionState.processing}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {completionForm.notes.length}/1000 characters
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="followUpRequired"
                  checked={completionForm.followUpRequired}
                  onChange={(e) =>
                    setCompletionForm((prev) => ({ ...prev, followUpRequired: e.target.checked }))
                  }
                  disabled={actionState.processing}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="followUpRequired" className="text-sm text-gray-700 font-medium">
                  Follow-up appointment required
                </label>
              </div>

              {completionForm.followUpRequired && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Follow-up Instructions
                  </label>
                  <textarea
                    value={completionForm.followUp}
                    onChange={(e) =>
                      setCompletionForm((prev) => ({ ...prev, followUp: e.target.value }))
                    }
                    placeholder="Specify follow-up care instructions, timeline, and any special requirements..."
                    rows={3}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    disabled={actionState.processing}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Patient Condition
                </label>
                <select
                  value={completionForm.patientCondition}
                  onChange={(e) =>
                    setCompletionForm((prev) => ({ ...prev, patientCondition: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={actionState.processing}
                >
                  <option value="stable">Stable</option>
                  <option value="improved">Improved</option>
                  <option value="needs_monitoring">Needs Monitoring</option>
                  <option value="requires_followup">Requires Follow-up</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setModals((prev) => ({ ...prev, complete: false }))}
                disabled={actionState.processing}
                className="px-6 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAppointmentAction(selectedAppointment.id, "complete", completionForm)}
                disabled={!completionForm.notes.trim() || actionState.processing}
                className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionState.processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    <Clipboard className="w-4 h-4" />
                    Complete Appointment
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ✅ Enhanced Details Modal */}
      {modals.details && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Appointment Details
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  ID: {selectedAppointment.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => setModals((prev) => ({ ...prev, details: false }))}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold text-gray-900">
                  {selectedAppointment.patient?.name || "Unknown Patient"}
                </h3>
                <StatusBadge 
                  status={selectedAppointment.status} 
                  isToday={formatDateTime(selectedAppointment.appointment_date, selectedAppointment.appointment_time).isToday} 
                />
              </div>

              {/* Patient Reliability Section */}
              {selectedAppointment.patient_reliability && (
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-bold text-gray-900 mb-4 flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-blue-600" />
                    Patient Reliability Assessment
                  </h4>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div>
                      <PatientReliabilityBadge reliability={selectedAppointment.patient_reliability} />
                      <div className="mt-3 text-sm space-y-2">
                        <p><strong>Completion Rate:</strong> {selectedAppointment.patient_reliability.statistics?.completion_rate}%</p>
                        <p><strong>Total Appointments:</strong> {selectedAppointment.patient_reliability.statistics?.total_appointments}</p>
                        <p><strong>No-Shows:</strong> {selectedAppointment.patient_reliability.statistics?.no_show_count}</p>
                      </div>
                    </div>
                    {selectedAppointment.patient_reliability.recommendations && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Staff Recommendations:</h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {selectedAppointment.patient_reliability.recommendations.map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-blue-600">•</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-bold text-gray-900 mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2 text-blue-600" />
                    Patient Information
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-gray-600 font-medium">Name:</span>
                      <p className="font-semibold text-gray-900 mt-1">
                        {selectedAppointment.patient?.name || "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Email:</span>
                      <p className="font-semibold text-gray-900 mt-1 flex items-center">
                        <Mail className="w-4 h-4 mr-2 text-gray-400" />
                        {selectedAppointment.patient?.email || "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Phone:</span>
                      <p className="font-semibold text-gray-900 mt-1 flex items-center">
                        <Phone className="w-4 h-4 mr-2 text-gray-400" />
                        {selectedAppointment.patient?.phone || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-bold text-gray-900 mb-4 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                    Appointment Details
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-gray-600 font-medium">Date & Time:</span>
                      <div className="mt-1">
                        <p className="font-semibold text-gray-900">
                          {formatDateTime(selectedAppointment.appointment_date, selectedAppointment.appointment_time).date}
                        </p>
                        <p className="font-semibold text-blue-600">
                          {formatDateTime(selectedAppointment.appointment_date, selectedAppointment.appointment_time).time}
                        </p>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Doctor:</span>
                      <p className="font-semibold text-gray-900 mt-1 flex items-center">
                        <Stethoscope className="w-4 h-4 mr-2 text-gray-400" />
                        {selectedAppointment.doctor?.name || "Unassigned"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Duration:</span>
                      <p className="font-semibold text-gray-900 mt-1">
                        {selectedAppointment.duration_minutes || 30} minutes
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Services */}
              {selectedAppointment.services && selectedAppointment.services.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-bold text-gray-900 mb-4 flex items-center">
                    <Clipboard className="w-5 h-5 mr-2 text-blue-600" />
                    Services
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {selectedAppointment.services.map((service, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200">
                        <h5 className="font-medium text-gray-900">{service.name}</h5>
                        <div className="flex justify-between text-sm text-gray-600 mt-1">
                          <span>{service.duration_minutes} min</span>
                          {service.min_price && (
                            <span>₱{service.min_price} - ₱{service.max_price}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Symptoms */}
              {selectedAppointment.symptoms && (
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-bold text-gray-900 mb-4 flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
                    Symptoms & Concerns
                  </h4>
                  <p className="text-sm text-gray-700 leading-relaxed bg-white p-4 rounded-lg border border-gray-200">
                    {selectedAppointment.symptoms}
                  </p>
                </div>
              )}

              {/* Notes */}
              {selectedAppointment.notes && (
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-bold text-gray-900 mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-blue-600" />
                    Notes
                  </h4>
                  <p className="text-sm text-gray-700 leading-relaxed bg-white p-4 rounded-lg border border-gray-200">
                    {selectedAppointment.notes}
                  </p>
                </div>
              )}

              {/* Cancellation Details */}
              {selectedAppointment.cancellation_reason && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                  <h4 className="font-bold text-red-900 mb-4 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
                    Cancellation Details
                  </h4>
                  <p className="text-sm text-red-700 leading-relaxed">
                    {selectedAppointment.cancellation_reason}
                  </p>
                  {selectedAppointment.cancelled_at && (
                    <p className="text-xs text-red-600 mt-2">
                      Cancelled: {new Date(selectedAppointment.cancelled_at).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setModals((prev) => ({ ...prev, details: false }))}
                className="px-6 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ManageAppointments;