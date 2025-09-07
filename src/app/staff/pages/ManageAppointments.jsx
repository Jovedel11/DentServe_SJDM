import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";

// ✅ FIXED: Import correct validated hooks
import { useStaffAppointments } from "@/core/hooks/useStaffAppointment";
import { useAppointmentRealtime } from "@/core/hooks/useAppointmentRealtime";

const ManageAppointments = () => {
  // ✅ Hook integration
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

  // ✅ Real-time updates
  const {} = useAppointmentRealtime({
    enableAppointments: true,
    enableNotifications: false,
    onAppointmentUpdate: useCallback(
      (update) => {
        console.log("Real-time appointment update:", update);
        fetchAppointments({ refresh: true });
      },
      [fetchAppointments]
    ),
  });

  // ✅ FIXED: Better state management
  const [filters, setFilters] = useState({
    status: "all",
    search: "",
    date: "all",
  });

  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [modals, setModals] = useState({
    details: false,
    condition: false,
  });

  const [actionState, setActionState] = useState({
    processing: false,
    error: null,
    type: null,
    appointmentId: null,
  });

  const [conditionReport, setConditionReport] = useState({
    appointmentId: "",
    conditions: "",
    followUp: "",
    type: "completion",
  });

  // ✅ FIXED: Enhanced action handler with better error handling
  const handleAppointmentAction = useCallback(
    async (appointmentId, actionType, data = null) => {
      console.log(`🔄 Starting ${actionType} for appointment:`, appointmentId);

      setActionState({
        processing: true,
        error: null,
        type: actionType,
        appointmentId,
      });

      try {
        let result;

        switch (actionType) {
          case "approve":
            console.log("📋 Calling approveAppointment...");
            result = await approveAppointment(
              appointmentId,
              data?.notes || "Approved by staff"
            );
            break;

          case "reject":
            // ✅ Proper reject case
            const rejectionPayload = {
              reason: data.reason.trim(),
              // ⚠️ must match your enum: doctor_unavailable, overbooked, patient_request, system_error, other
              category: data.category || "other",
              suggest_reschedule: data.suggestReschedule || false,
              alternative_dates: data.alternativeDates || null,
            };

            console.log("📤 Rejection payload:", rejectionPayload);
            result = await rejectAppointment(appointmentId, rejectionPayload);
            break;

          case "complete":
            console.log("✅ Calling completeAppointment...");
            if (!data?.notes?.trim()) {
              throw new Error("Treatment summary is required");
            }

            const completionPayload = {
              notes: data.notes.trim(),
              follow_up_required: Boolean(data.followUp?.trim()),
              follow_up_notes: data.followUp || "",
              services_completed: data.services || [],
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

        // ✅ SUCCESS: Reset state and close modals
        setConditionReport({
          appointmentId: "",
          conditions: "",
          followUp: "",
          type: "completion",
        });
        setModals({ details: false, condition: false });
        setActionState({
          processing: false,
          error: null,
          type: null,
          appointmentId: null,
        });

        return result;
      } catch (err) {
        console.error(`❌ ${actionType} error:`, err);
        const errorMessage =
          err.message || `${actionType} failed. Please try again.`;

        setActionState({
          processing: false,
          error: errorMessage,
          type: null,
          appointmentId: null,
        });

        throw err;
      }
    },
    [approveAppointment, rejectAppointment, completeAppointment]
  );

  // ✅ FIXED: Quick approve handler
  const quickApprove = useCallback(
    async (appointmentId) => {
      try {
        await handleAppointmentAction(appointmentId, "approve");
      } catch (err) {
        console.error("Quick approve failed:", err);
      }
    },
    [handleAppointmentAction]
  );

  // ✅ FIXED: Condition modal handler
  const openConditionModal = useCallback((appointment, type) => {
    console.log("🔄 Opening condition modal:", {
      appointmentId: appointment.id,
      type,
    });

    setConditionReport({
      appointmentId: appointment.id,
      conditions: "",
      followUp: "",
      type,
    });
    setActionState({
      processing: false,
      error: null,
      type: null,
      appointmentId: null,
    });
    setModals((prev) => ({ ...prev, condition: true }));
  }, []);

  // ✅ FIXED: Submit condition report with validation
  // In your submitConditionReport function, add this logging:
  const submitConditionReport = useCallback(async () => {
    console.log("📋 Submitting condition report:", conditionReport);

    const { appointmentId, conditions, followUp, type } = conditionReport;

    if (!conditions.trim()) {
      const errorMsg =
        type === "completion"
          ? "Treatment summary is required"
          : "Rejection reason is required";
      setActionState((prev) => ({ ...prev, error: errorMsg }));
      return;
    }

    try {
      if (type === "completion") {
        await handleAppointmentAction(appointmentId, "complete", {
          notes: conditions,
          followUp: followUp,
        });
      } else if (type === "cancellation") {
        // ✅ ADD: Better debugging for rejection
        console.log("🚫 About to reject with payload:", {
          appointmentId,
          reason: conditions,
          category: "staff_decision",
        });

        const result = await handleAppointmentAction(appointmentId, "reject", {
          reason: conditions,
          category: "other", // ✅ CHANGED: Use valid enum value
          suggestReschedule: false,
        });

        console.log("🚫 Rejection result:", result);
      }
    } catch (err) {
      console.error("Submit condition report failed:", err);
      console.error("Full error details:", {
        message: err.message,
        stack: err.stack,
        conditionReport,
      });
    }
  }, [conditionReport, handleAppointmentAction]);

  // ✅ Memoized filtered appointments
  const filteredAppointments = React.useMemo(() => {
    return appointments.filter((appointment) => {
      const matchesStatus =
        filters.status === "all" || appointment.status === filters.status;
      const matchesSearch =
        !filters.search ||
        [
          appointment.patient?.name,
          appointment.doctor?.name,
          appointment.patient?.email,
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
        (filters.date === "upcoming" && appointmentDate > today) ||
        (filters.date === "past" && appointmentDate < today);

      return matchesStatus && matchesSearch && matchesDate;
    });
  }, [appointments, filters]);

  // ✅ Filter update handler
  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ✅ Format date/time
  const formatDateTime = useCallback((date, time) => {
    const dateObj = new Date(`${date}T${time}`);
    return {
      date: dateObj.toLocaleDateString("en-US", {
        weekday: "short",
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
  }, []);

  // ✅ Status Badge Component
  const StatusBadge = React.memo(({ status }) => {
    const configs = {
      pending: {
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: Clock,
        label: "Pending",
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
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}
      >
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  });

  // Auto-fetch on mount
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Loading state
  if (isLoading && appointments.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Manage Appointments
          </h1>
          <p className="text-gray-600 mt-1">Healthcare Management Dashboard</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="bg-gray-50 border px-3 py-2 rounded-lg">
            <span className="font-medium text-gray-900">{stats.total}</span>
            <span className="text-gray-600 ml-1">total</span>
          </div>
          <div className="bg-yellow-50 border-yellow-200 border px-3 py-2 rounded-lg">
            <span className="font-medium text-yellow-800">{stats.pending}</span>
            <span className="text-yellow-600 ml-1">pending</span>
          </div>
          <div className="bg-blue-50 border-blue-200 border px-3 py-2 rounded-lg">
            <span className="font-medium text-blue-800">
              {filteredAppointments.length}
            </span>
            <span className="text-blue-600 ml-1">showing</span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {(error || actionState.error) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
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
              setError(null);
              setActionState((prev) => ({ ...prev, error: null }));
            }}
            className="text-red-400 hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search patients, doctors..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <select
            value={filters.status}
            onChange={(e) => updateFilter("status", e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white appearance-none"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <select
            value={filters.date}
            onChange={(e) => updateFilter("date", e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white appearance-none"
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
            <Activity className="w-4 h-4" />
          )}
          Refresh
        </button>
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {!hasAppointments ? (
          <div className="text-center py-16 bg-gray-50 rounded-lg">
            <AlertCircle className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No appointments found
            </h3>
            <p className="text-gray-600 mb-6">
              {Object.values(filters).some((v) => v !== "all" && v !== "")
                ? "Try adjusting your filters to see more results."
                : "No appointments have been scheduled yet."}
            </p>
            {Object.values(filters).some((v) => v !== "all" && v !== "") && (
              <button
                onClick={() =>
                  setFilters({ status: "all", search: "", date: "all" })
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <AnimatePresence>
            {filteredAppointments.map((appointment, index) => {
              const { date, time, isToday } = formatDateTime(
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
                  className={`bg-white border rounded-lg p-6 hover:shadow-md transition-all duration-200 ${
                    isToday ? "border-blue-300 bg-blue-50" : "border-gray-200"
                  } ${isProcessingThisAppointment ? "opacity-75" : ""}`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    {/* Appointment Info */}
                    <div className="flex-1 space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {appointment.patient?.name || "Unknown Patient"}
                        </h3>
                        <StatusBadge status={appointment.status} />
                        {isToday && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                            Today
                          </span>
                        )}
                        {isProcessingThisAppointment && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Processing...
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{date}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{time}</span>
                        </div>
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2 text-gray-400" />
                          <span>
                            {appointment.doctor?.name || "Unassigned"}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{appointment.patient?.phone || "N/A"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      {appointment.status === "pending" && (
                        <>
                          <button
                            onClick={() => quickApprove(appointment.id)}
                            disabled={isProcessingThisAppointment}
                            className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg bg-green-100 text-green-800 hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isProcessingThisAppointment &&
                            actionState.type === "approve" ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4 mr-1" />
                            )}
                            Confirm
                          </button>
                          <button
                            onClick={() =>
                              openConditionModal(appointment, "cancellation")
                            }
                            disabled={isProcessingThisAppointment}
                            className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg bg-red-100 text-red-800 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </button>
                        </>
                      )}

                      {appointment.status === "confirmed" && (
                        <button
                          onClick={() =>
                            openConditionModal(appointment, "completion")
                          }
                          disabled={isProcessingThisAppointment}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Complete
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setSelectedAppointment(appointment);
                          setModals((prev) => ({ ...prev, details: true }));
                        }}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors"
                      >
                        <Eye className="w-4 h-4 mr-1" />
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

      {/* Condition Report Modal */}
      {modals.condition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {conditionReport.type === "completion"
                    ? "Complete Appointment"
                    : "Cancel Appointment"}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {conditionReport.type === "completion"
                    ? "Document treatment and follow-up instructions"
                    : "Provide reason for cancellation"}
                </p>
              </div>
              <button
                onClick={() => {
                  setModals((prev) => ({ ...prev, condition: false }));
                  setActionState((prev) => ({ ...prev, error: null }));
                }}
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
                  {conditionReport.type === "completion"
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
                    conditionReport.type === "completion"
                      ? "Describe treatment provided, patient response, medications prescribed, etc."
                      : "Explain the reason for cancellation, scheduling conflicts, etc."
                  }
                  rows={4}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  disabled={actionState.processing}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {conditionReport.conditions.length}/1000 characters
                </p>
              </div>

              {conditionReport.type === "completion" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Follow-up Instructions
                  </label>
                  <textarea
                    value={conditionReport.followUp}
                    onChange={(e) =>
                      setConditionReport((prev) => ({
                        ...prev,
                        followUp: e.target.value,
                      }))
                    }
                    placeholder="Any follow-up care instructions, next appointment recommendations, etc."
                    rows={3}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    disabled={actionState.processing}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setModals((prev) => ({ ...prev, condition: false }));
                  setActionState((prev) => ({ ...prev, error: null }));
                }}
                disabled={actionState.processing}
                className="px-6 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitConditionReport}
                disabled={
                  !conditionReport.conditions.trim() || actionState.processing
                }
                className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionState.processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {conditionReport.type === "completion"
                      ? "Complete"
                      : "Cancel"}{" "}
                    Appointment
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Appointment Details Modal */}
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
                onClick={() =>
                  setModals((prev) => ({ ...prev, details: false }))
                }
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
                <StatusBadge status={selectedAppointment.status} />
              </div>

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
                      <span className="text-gray-600 font-medium">
                        Date & Time:
                      </span>
                      <div className="mt-1">
                        <p className="font-semibold text-gray-900">
                          {
                            formatDateTime(
                              selectedAppointment.appointment_date,
                              selectedAppointment.appointment_time
                            ).date
                          }
                        </p>
                        <p className="font-semibold text-blue-600">
                          {
                            formatDateTime(
                              selectedAppointment.appointment_date,
                              selectedAppointment.appointment_time
                            ).time
                          }
                        </p>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Doctor:</span>
                      <p className="font-semibold text-gray-900 mt-1">
                        {selectedAppointment.doctor?.name || "Unassigned"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">
                        Services:
                      </span>
                      <p className="font-semibold text-gray-900 mt-1">
                        {selectedAppointment.services
                          ?.map((s) => s.name)
                          .join(", ") || "General Consultation"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedAppointment.notes && (
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-bold text-gray-900 mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-blue-600" />
                    Notes
                  </h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {selectedAppointment.notes}
                  </p>
                </div>
              )}

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
                      Cancelled:{" "}
                      {new Date(
                        selectedAppointment.cancelled_at
                      ).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() =>
                  setModals((prev) => ({ ...prev, details: false }))
                }
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
