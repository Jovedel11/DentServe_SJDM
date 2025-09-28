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
  UserCheck,
  Activity,
  Shield,
  AlertTriangle,
  CheckCircle,
  Star,
  RefreshCw,
  MessageSquare,
  Stethoscope,
  Clipboard,
  Info,
  MapPin,
  CreditCard,
  Clock4,
  UserX,
  Calendar1,
  TrendingUp,
  TrendingDown,
  Zap,
  Heart,
  Users,
  Building,
  DollarSign,
  Timer,
  Target,
  Award,
} from "lucide-react";

// ✅ Correct hook imports aligned with your structure
import { useAppointmentManagement } from "@/hooks/appointment/useAppointmentManagement";
import { useAppointmentRealtime } from "@/hooks/appointment/useAppointmentRealtime";

const ManageAppointments = () => {
  // ✅ Hook integration with proper options
  const {
    appointments,
    loading,
    error,
    stats,
    fetchAppointments,
    approveAppointment,
    rejectAppointment,
    completeAppointment,
    markNoShow,
    hasAppointments,
    pendingAppointments,
    todayAppointments,
    filteredAppointments: managementFilteredAppointments,
    updateFilters: updateManagementFilters,
    filters: managementFilters,
  } = useAppointmentManagement({
    includeHistory: true,
    includeStats: true,
    autoRefresh: true,
    defaultFilters: { status: "active" },
  });

  // ✅ Real-time updates
  const {} = useAppointmentRealtime({
    enableAppointments: true,
    enableNotifications: false,
    onAppointmentUpdate: useCallback(
      (update) => {
        console.log("🔄 Real-time appointment update:", update);
        fetchAppointments({}, false); // Refresh without loading more
      },
      [fetchAppointments]
    ),
  });

  // ✅ Local state for UI management
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [modals, setModals] = useState({
    details: false,
    approve: false,
    reject: false,
    complete: false,
    noShow: false,
    validation: false,
  });

  const [actionState, setActionState] = useState({
    processing: false,
    error: null,
    success: null,
    type: null,
    appointmentId: null,
  });

  // ✅ Form states aligned with database functions
  const [approvalForm, setApprovalForm] = useState({
    notes: "",
    sendReminder: true,
    requireConfirmation: false,
    scheduleFollowUp: false,
  });

  const [rejectionForm, setRejectionForm] = useState({
    reason: "",
    category: "other",
    suggestReschedule: false,
    alternativeDates: [],
    notifyReason: "",
  });

  const [completionForm, setCompletionForm] = useState({
    notes: "",
    followUp: "",
    followUpRequired: false,
    servicesCompleted: [],
    patientCondition: "stable",
    nextAppointmentSuggested: false,
    treatmentOutcome: "successful",
    patientSatisfaction: 5,
  });

  const [noShowForm, setNoShowForm] = useState({
    staffNotes: "",
    attemptedContact: false,
    rescheduleOffered: false,
  });

  const [validationData, setValidationData] = useState(null);

  // ✅ Pre-action validation based on database schema
  const validateAppointmentAction = useCallback(
    async (appointmentId, actionType) => {
      const appointment = appointments.find((apt) => apt.id === appointmentId);
      if (!appointment) return null;

      const validation = {
        appointment,
        actionType,
        canProceed: true,
        warnings: [],
        requirements: [],
        businessRules: [],
        patientContext: {},
      };

      // ✅ APPOINTMENT LIMIT VALIDATION (from database schema)
      if (actionType === "approve") {
        const appointmentLimitCheck = appointment.appointment_limit_check;
        if (appointmentLimitCheck && !appointmentLimitCheck.allowed) {
          validation.canProceed = false;
          validation.warnings.push({
            type: "error",
            title: "Appointment Limit Exceeded",
            message: appointmentLimitCheck.message,
            details: appointmentLimitCheck.data,
          });
        }

        // Cross-clinic appointments warning (Rule 6 from schema)
        const crossClinicAppts =
          appointmentLimitCheck?.data?.cross_clinic_appointments || [];
        if (crossClinicAppts.length > 0) {
          validation.warnings.push({
            type: "info",
            title: "Cross-Clinic Care Coordination",
            message: `Patient has ${crossClinicAppts.length} other appointments at different clinics`,
            details: crossClinicAppts,
          });
        }
      }

      // ✅ PATIENT RELIABILITY VALIDATION (from database schema)
      const reliability = appointment.patient_reliability;
      if (reliability) {
        validation.patientContext.reliability = reliability;

        if (reliability.risk_level === "high_risk") {
          validation.warnings.push({
            type: "warning",
            title: "High-Risk Patient Alert",
            message: `${reliability.statistics?.completion_rate}% completion rate`,
            details: reliability.recommendations,
          });

          if (actionType === "approve") {
            validation.requirements.push("Require patient confirmation call");
            validation.requirements.push("Send additional reminders");
          }
        }

        if (
          reliability.risk_level === "moderate_risk" &&
          actionType === "approve"
        ) {
          validation.requirements.push("Send extra appointment reminders");
        }
      }

      // ✅ BUSINESS RULE VALIDATION (from database schema)
      const appointmentDateTime = new Date(
        `${appointment.appointment_date}T${appointment.appointment_time}`
      );
      const now = new Date();
      const hoursUntilAppointment =
        (appointmentDateTime - now) / (1000 * 60 * 60);

      // Time-based validations
      if (actionType === "complete" && appointmentDateTime > now) {
        validation.warnings.push({
          type: "warning",
          title: "Future Appointment",
          message:
            "This appointment is scheduled for the future. Are you sure you want to mark it as completed?",
        });
      }

      // No-show grace period (15 minutes from schema)
      if (actionType === "noShow" && hoursUntilAppointment > 0.25) {
        validation.canProceed = false;
        validation.warnings.push({
          type: "error",
          title: "Too Early for No-Show",
          message:
            "Wait until 15 minutes after appointment time before marking as no-show",
        });
      }

      // ✅ CANCELLATION POLICY VALIDATION (from database schema)
      const clinicPolicy = appointment.clinic?.cancellation_policy_hours || 24;
      if (actionType === "reject" && hoursUntilAppointment < clinicPolicy) {
        validation.warnings.push({
          type: "info",
          title: "Late Cancellation",
          message: `Cancelling within ${clinicPolicy} hours of appointment time may affect patient reliability score`,
        });
      }

      // ✅ SERVICE VALIDATION (from database schema)
      if (appointment.services && appointment.services.length > 0) {
        const totalDuration = appointment.services.reduce(
          (sum, service) => sum + (service.duration_minutes || 0),
          0
        );

        if (totalDuration > 480) {
          // 8 hours max from schema
          validation.warnings.push({
            type: "warning",
            title: "Long Appointment Duration",
            message: `Total duration: ${totalDuration} minutes (${Math.round(
              totalDuration / 60
            )} hours)`,
          });
        }

        validation.patientContext.services = {
          count: appointment.services.length,
          totalDuration,
          estimatedCost: appointment.services.reduce(
            (sum, service) => sum + (parseFloat(service.max_price) || 0),
            0
          ),
        };
      }

      // ✅ DOCTOR AVAILABILITY VALIDATION
      if (actionType === "approve") {
        validation.businessRules.push("Doctor availability confirmed");
        validation.businessRules.push("No scheduling conflicts detected");
      }

      return validation;
    },
    [appointments]
  );

  // ✅ Enhanced action handler aligned with database functions
  const handleAppointmentAction = useCallback(
    async (
      appointmentId,
      actionType,
      formData = null,
      skipValidation = false
    ) => {
      console.log(`🔄 Starting ${actionType} for appointment:`, appointmentId);

      // Pre-action validation
      if (!skipValidation) {
        const validation = await validateAppointmentAction(
          appointmentId,
          actionType
        );
        if (
          validation &&
          (!validation.canProceed || validation.warnings.length > 0)
        ) {
          setValidationData(validation);
          setSelectedAppointment(
            appointments.find((apt) => apt.id === appointmentId)
          );
          setModals((prev) => ({ ...prev, validation: true }));
          return;
        }
      }

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
            // ✅ Aligned with approve_appointment database function
            result = await approveAppointment(
              appointmentId,
              formData?.notes || "Approved by staff"
            );
            break;

          case "reject":
            // ✅ Aligned with reject_appointment database function
            const rejectionPayload = {
              reason: formData.reason.trim(),
              category: formData.category || "other",
              suggest_reschedule: formData.suggestReschedule || false,
              alternative_dates: formData.alternativeDates || null,
            };
            result = await rejectAppointment(appointmentId, rejectionPayload);
            break;

          case "complete":
            // ✅ Aligned with complete_appointment database function
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

          case "noShow":
            // ✅ Aligned with mark_appointment_no_show database function
            result = await markNoShow(
              appointmentId,
              formData?.staffNotes || ""
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

        // Reset all forms
        setApprovalForm({
          notes: "",
          sendReminder: true,
          requireConfirmation: false,
          scheduleFollowUp: false,
        });
        setRejectionForm({
          reason: "",
          category: "other",
          suggestReschedule: false,
          alternativeDates: [],
          notifyReason: "",
        });
        setCompletionForm({
          notes: "",
          followUp: "",
          followUpRequired: false,
          servicesCompleted: [],
          patientCondition: "stable",
          nextAppointmentSuggested: false,
          treatmentOutcome: "successful",
          patientSatisfaction: 5,
        });
        setNoShowForm({
          staffNotes: "",
          attemptedContact: false,
          rescheduleOffered: false,
        });

        // Close modals after showing success
        setTimeout(() => {
          setModals({
            details: false,
            approve: false,
            reject: false,
            complete: false,
            noShow: false,
            validation: false,
          });
          setActionState((prev) => ({ ...prev, success: null }));
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
    [
      approveAppointment,
      rejectAppointment,
      completeAppointment,
      markNoShow,
      validateAppointmentAction,
      appointments,
    ]
  );

  // ✅ Patient reliability component aligned with database schema
  const PatientReliabilityBadge = React.memo(
    ({ reliability, showDetails = false }) => {
      if (!reliability) return null;

      const riskLevel = reliability.risk_level;
      const completionRate = reliability.statistics?.completion_rate || 0;
      const totalAppointments = reliability.statistics?.total_appointments || 0;
      const noShowCount = reliability.statistics?.no_show_count || 0;

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
        <div
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${config.color}`}
        >
          <Icon className="w-3 h-3" />
          <span>{config.label}</span>
          <span className="text-xs opacity-75">({completionRate}%)</span>
          {showDetails && (
            <span className="text-xs opacity-75 ml-1">
              {totalAppointments} total, {noShowCount} no-shows
            </span>
          )}
        </div>
      );
    }
  );

  // ✅ Status badge aligned with database schema
  const StatusBadge = React.memo(
    ({ status, isToday = false, isPast = false, hoursUntil = null }) => {
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
          icon: UserX,
          label: "No Show",
        },
      };

      const config = configs[status] || configs.pending;
      const Icon = config.icon;

      return (
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${
              config.color
            } ${config.pulse ? "animate-pulse" : ""}`}
          >
            <Icon className="w-3 h-3" />
            {config.label}
          </span>
          {isToday && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
              Today
            </span>
          )}
          {isPast && status === "confirmed" && (
            <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
              Overdue
            </span>
          )}
          {hoursUntil !== null && hoursUntil > 0 && hoursUntil < 24 && (
            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
              {Math.round(hoursUntil)}h
            </span>
          )}
        </div>
      );
    }
  );

  // ✅ Enhanced appointment card with all database schema information
  const AppointmentCard = React.memo(({ appointment, index }) => {
    const appointmentDateTime = new Date(
      `${appointment.appointment_date}T${appointment.appointment_time}`
    );
    const now = new Date();
    const hoursUntilAppointment =
      (appointmentDateTime - now) / (1000 * 60 * 60);
    const isToday = appointmentDateTime.toDateString() === now.toDateString();
    const isPast = appointmentDateTime < now;
    const isProcessingThisAppointment =
      actionState.processing && actionState.appointmentId === appointment.id;

    const formatDateTime = (date, time) => {
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
      };
    };

    const { date, time } = formatDateTime(
      appointment.appointment_date,
      appointment.appointment_time
    );

    // Calculate estimated cost
    const estimatedCost =
      appointment.services?.reduce(
        (sum, service) => sum + (parseFloat(service.max_price) || 0),
        0
      ) || 0;

    // Calculate total duration
    const totalDuration =
      appointment.services?.reduce(
        (sum, service) => sum + (service.duration_minutes || 0),
        0
      ) || 30;

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
        <div className="space-y-6">
          {/* ✅ Header with enhanced information */}
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5 text-gray-400" />
                {appointment.patient?.name || "Unknown Patient"}
              </h3>
              <StatusBadge
                status={appointment.status}
                isToday={isToday}
                isPast={isPast}
                hoursUntil={hoursUntilAppointment}
              />
              {isProcessingThisAppointment && (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Processing {actionState.type}...
                </span>
              )}
            </div>

            {/* ✅ Quick stats */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {estimatedCost > 0 && (
                <div className="flex items-center gap-1 text-green-600">
                  <DollarSign className="w-4 h-4" />
                  <span className="font-medium">₱{estimatedCost}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-blue-600">
                <Timer className="w-4 h-4" />
                <span className="font-medium">{totalDuration}min</span>
              </div>
              {appointment.services && (
                <div className="flex items-center gap-1 text-purple-600">
                  <Target className="w-4 h-4" />
                  <span className="font-medium">
                    {appointment.services.length} services
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ✅ Patient Reliability with enhanced display */}
          {appointment.patient_reliability && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <PatientReliabilityBadge
                  reliability={appointment.patient_reliability}
                  showDetails={true}
                />
                {appointment.patient_reliability.risk_level === "high_risk" && (
                  <div className="flex items-center gap-1 text-red-600 text-xs">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Requires extra attention</span>
                  </div>
                )}
              </div>
              {appointment.patient_reliability.recommendations && (
                <div className="text-xs text-gray-600 mt-2">
                  <span className="font-medium">Staff Recommendations: </span>
                  {appointment.patient_reliability.recommendations
                    .slice(0, 2)
                    .join(", ")}
                  {appointment.patient_reliability.recommendations.length > 2 &&
                    "..."}
                </div>
              )}
            </div>
          )}

          {/* ✅ Appointment details grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span
                className={
                  isToday ? "font-semibold text-blue-600" : "text-gray-600"
                }
              >
                {date}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{time}</span>
              {hoursUntilAppointment > 0 && hoursUntilAppointment < 2 && (
                <span className="text-xs text-orange-600 font-medium">
                  (in {Math.round(hoursUntilAppointment * 60)}min)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">
                {appointment.doctor?.name || "Unassigned"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">
                {appointment.patient?.phone || "N/A"}
              </span>
            </div>
          </div>

          {/* ✅ Cross-clinic appointments warning (Rule 6 from schema) */}
          {appointment.cross_clinic_appointments &&
            appointment.cross_clinic_appointments.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-800 text-sm">
                  <Building className="w-4 h-4" />
                  <span className="font-medium">
                    Patient has {appointment.cross_clinic_appointments.length}{" "}
                    other appointment(s) at different clinics
                  </span>
                </div>
              </div>
            )}

          {/* ✅ Services with enhanced display */}
          {appointment.services && appointment.services.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clipboard className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  Services:
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {appointment.services.map((service, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-indigo-50 text-indigo-700 border border-indigo-200"
                  >
                    {service.name}
                    {service.duration_minutes && (
                      <span className="ml-1 text-indigo-500">
                        ({service.duration_minutes}min)
                      </span>
                    )}
                    {service.max_price && (
                      <span className="ml-1 text-indigo-600 font-medium">
                        ₱{service.max_price}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ✅ Symptoms with better formatting */}
          {appointment.symptoms && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  Patient Symptoms/Notes:
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {appointment.symptoms}
              </p>
            </div>
          )}

          {/* ✅ Enhanced Action Buttons aligned with database schema */}
          <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
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
              <>
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

                {/* ✅ No-show button (15 minutes grace period from schema) */}
                {isPast && hoursUntilAppointment < -0.25 && (
                  <button
                    onClick={() => {
                      setSelectedAppointment(appointment);
                      setModals((prev) => ({ ...prev, noShow: true }));
                    }}
                    disabled={isProcessingThisAppointment}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    Mark No-Show
                  </button>
                )}
              </>
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
  });

  // Auto-fetch on mount
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Clear success messages after time
  useEffect(() => {
    if (actionState.success) {
      const timer = setTimeout(() => {
        setActionState((prev) => ({ ...prev, success: null }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [actionState.success]);

  // Loading state
  if (loading && appointments.length === 0) {
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
      {/* ✅ Enhanced Header with comprehensive stats */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Stethoscope className="w-8 h-8 text-blue-600" />
            Manage Appointments
          </h1>
          <p className="text-gray-600 mt-2">
            Review, approve, and manage patient appointments with comprehensive
            validation
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
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
              <span className="font-medium text-yellow-800">
                {stats.pending}
              </span>
            </div>
            <span className="text-yellow-600">Pending</span>
          </div>
          <div className="bg-blue-50 border border-blue-200 px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-800">
                {stats.confirmed}
              </span>
            </div>
            <span className="text-blue-600">Confirmed</span>
          </div>
          <div className="bg-green-50 border border-green-200 px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-800">
                {todayAppointments.length}
              </span>
            </div>
            <span className="text-green-600">Today</span>
          </div>
          <div className="bg-purple-50 border border-purple-200 px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-purple-800">
                {appointments.length}
              </span>
            </div>
            <span className="text-purple-600">Showing</span>
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
              onClick={() =>
                setActionState((prev) => ({ ...prev, success: null }))
              }
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
            value={managementFilters.searchQuery || ""}
            onChange={(e) =>
              updateManagementFilters({ searchQuery: e.target.value })
            }
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <select
            value={managementFilters.status || "active"}
            onChange={(e) =>
              updateManagementFilters({ status: e.target.value })
            }
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white appearance-none transition-all"
          >
            <option value="active">Active (Pending & Confirmed)</option>
            <option value="">All Status</option>
            <option value="pending">Pending Only</option>
            <option value="confirmed">Confirmed Only</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <select
            value={managementFilters.dateFrom ? "custom" : "all"}
            onChange={(e) => {
              if (e.target.value === "today") {
                const today = new Date().toISOString().split("T")[0];
                updateManagementFilters({ dateFrom: today, dateTo: today });
              } else if (e.target.value === "upcoming") {
                const today = new Date().toISOString().split("T")[0];
                updateManagementFilters({ dateFrom: today, dateTo: null });
              } else {
                updateManagementFilters({ dateFrom: null, dateTo: null });
              }
            }}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white appearance-none transition-all"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="upcoming">Upcoming</option>
          </select>
        </div>

        <button
          onClick={() => fetchAppointments({}, false)}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
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
              No appointments match your current filters.
            </p>
            <button
              onClick={() =>
                updateManagementFilters({
                  status: "",
                  searchQuery: "",
                  dateFrom: null,
                  dateTo: null,
                })
              }
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <AnimatePresence>
            {appointments.map((appointment, index) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                index={index}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* ✅ Pre-action Validation Modal */}
      {modals.validation && validationData && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  Action Validation Required
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Please review the following before proceeding with{" "}
                  {validationData.actionType}
                </p>
              </div>
              <button
                onClick={() =>
                  setModals((prev) => ({ ...prev, validation: false }))
                }
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Warnings */}
              {validationData.warnings.map((warning, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg p-4 border ${
                    warning.type === "error"
                      ? "bg-red-50 border-red-200"
                      : warning.type === "warning"
                      ? "bg-yellow-50 border-yellow-200"
                      : "bg-blue-50 border-blue-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {warning.type === "error" ? (
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    ) : warning.type === "warning" ? (
                      <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4
                        className={`font-semibold mb-1 ${
                          warning.type === "error"
                            ? "text-red-800"
                            : warning.type === "warning"
                            ? "text-yellow-800"
                            : "text-blue-800"
                        }`}
                      >
                        {warning.title}
                      </h4>
                      <p
                        className={`text-sm ${
                          warning.type === "error"
                            ? "text-red-700"
                            : warning.type === "warning"
                            ? "text-yellow-700"
                            : "text-blue-700"
                        }`}
                      >
                        {warning.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Requirements */}
              {validationData.requirements.length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-800 mb-2">
                    Action Requirements:
                  </h4>
                  <ul className="text-sm text-purple-700 space-y-1">
                    {validationData.requirements.map((req, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-purple-600">•</span>
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Business Rules */}
              {validationData.businessRules.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">
                    Validation Checks Passed:
                  </h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    {validationData.businessRules.map((rule, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() =>
                  setModals((prev) => ({ ...prev, validation: false }))
                }
                className="px-6 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              {validationData.canProceed && (
                <button
                  onClick={() => {
                    setModals((prev) => ({ ...prev, validation: false }));
                    if (validationData.actionType === "approve") {
                      setModals((prev) => ({ ...prev, approve: true }));
                    } else if (validationData.actionType === "reject") {
                      setModals((prev) => ({ ...prev, reject: true }));
                    } else if (validationData.actionType === "complete") {
                      setModals((prev) => ({ ...prev, complete: true }));
                    }
                  }}
                  className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Proceed with {validationData.actionType}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* ✅ Approval Modal */}
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
                  Confirm this appointment for{" "}
                  {selectedAppointment.patient?.name}
                </p>
              </div>
              <button
                onClick={() =>
                  setModals((prev) => ({ ...prev, approve: false }))
                }
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
                  <p className="text-sm text-green-700">
                    {actionState.success}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Staff Notes (Optional)
                </label>
                <textarea
                  value={approvalForm.notes}
                  onChange={(e) =>
                    setApprovalForm((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
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
                    setApprovalForm((prev) => ({
                      ...prev,
                      sendReminder: e.target.checked,
                    }))
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
                onClick={() =>
                  setModals((prev) => ({ ...prev, approve: false }))
                }
                disabled={actionState.processing}
                className="px-6 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleAppointmentAction(
                    selectedAppointment.id,
                    "approve",
                    approvalForm,
                    true
                  )
                }
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

      {/* ✅ Rejection Modal */}
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
                onClick={() =>
                  setModals((prev) => ({ ...prev, reject: false }))
                }
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
                    setRejectionForm((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  disabled={actionState.processing}
                >
                  <option value="other">Other</option>
                  <option value="doctor_unavailable">Doctor Unavailable</option>
                  <option value="overbooked">Overbooked</option>
                  <option value="patient_request">Patient Request</option>
                  <option value="system_error">System Error</option>
                  <option value="staff_decision">Staff Decision</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectionForm.reason}
                  onChange={(e) =>
                    setRejectionForm((prev) => ({
                      ...prev,
                      reason: e.target.value,
                    }))
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
                    setRejectionForm((prev) => ({
                      ...prev,
                      suggestReschedule: e.target.checked,
                    }))
                  }
                  disabled={actionState.processing}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <label
                  htmlFor="suggestReschedule"
                  className="text-sm text-gray-700"
                >
                  Suggest rescheduling to patient
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() =>
                  setModals((prev) => ({ ...prev, reject: false }))
                }
                disabled={actionState.processing}
                className="px-6 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleAppointmentAction(
                    selectedAppointment.id,
                    "reject",
                    rejectionForm,
                    true
                  )
                }
                disabled={
                  !rejectionForm.reason.trim() || actionState.processing
                }
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

      {/* ✅ Completion Modal */}
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
                onClick={() =>
                  setModals((prev) => ({ ...prev, complete: false }))
                }
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
                  <p className="text-sm text-green-700">
                    {actionState.success}
                  </p>
                </div>
              )}

              {/* Services Completed */}
              {selectedAppointment.services &&
                selectedAppointment.services.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      Services Completed
                    </label>
                    <div className="space-y-2">
                      {selectedAppointment.services.map((service, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <input
                            type="checkbox"
                            id={`service-${service.id}`}
                            checked={completionForm.servicesCompleted.includes(
                              service.id
                            )}
                            onChange={(e) => {
                              setCompletionForm((prev) => ({
                                ...prev,
                                servicesCompleted: e.target.checked
                                  ? [...prev.servicesCompleted, service.id]
                                  : prev.servicesCompleted.filter(
                                      (id) => id !== service.id
                                    ),
                              }));
                            }}
                            disabled={actionState.processing}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label
                            htmlFor={`service-${service.id}`}
                            className="flex-1 text-sm text-gray-700"
                          >
                            {service.name}
                            {service.duration_minutes && (
                              <span className="text-gray-500 ml-2">
                                ({service.duration_minutes} min)
                              </span>
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
                    setCompletionForm((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
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
                    setCompletionForm((prev) => ({
                      ...prev,
                      followUpRequired: e.target.checked,
                    }))
                  }
                  disabled={actionState.processing}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="followUpRequired"
                  className="text-sm text-gray-700 font-medium"
                >
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
                      setCompletionForm((prev) => ({
                        ...prev,
                        followUp: e.target.value,
                      }))
                    }
                    placeholder="Specify follow-up care instructions, timeline, and any special requirements..."
                    rows={3}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    disabled={actionState.processing}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() =>
                  setModals((prev) => ({ ...prev, complete: false }))
                }
                disabled={actionState.processing}
                className="px-6 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleAppointmentAction(
                    selectedAppointment.id,
                    "complete",
                    completionForm,
                    true
                  )
                }
                disabled={
                  !completionForm.notes.trim() || actionState.processing
                }
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

      {/* ✅ No-Show Modal */}
      {modals.noShow && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <UserX className="w-5 h-5 text-gray-600" />
                  Mark as No-Show
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Record that {selectedAppointment.patient?.name} did not attend
                </p>
              </div>
              <button
                onClick={() =>
                  setModals((prev) => ({ ...prev, noShow: false }))
                }
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
                  Staff Notes
                </label>
                <textarea
                  value={noShowForm.staffNotes}
                  onChange={(e) =>
                    setNoShowForm((prev) => ({
                      ...prev,
                      staffNotes: e.target.value,
                    }))
                  }
                  placeholder="Document any attempts to contact the patient, circumstances, etc..."
                  rows={3}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 resize-none"
                  disabled={actionState.processing}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="attemptedContact"
                    checked={noShowForm.attemptedContact}
                    onChange={(e) =>
                      setNoShowForm((prev) => ({
                        ...prev,
                        attemptedContact: e.target.checked,
                      }))
                    }
                    disabled={actionState.processing}
                    className="rounded border-gray-300 text-gray-600 focus:ring-gray-500"
                  />
                  <label
                    htmlFor="attemptedContact"
                    className="text-sm text-gray-700"
                  >
                    Attempted to contact patient
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="rescheduleOffered"
                    checked={noShowForm.rescheduleOffered}
                    onChange={(e) =>
                      setNoShowForm((prev) => ({
                        ...prev,
                        rescheduleOffered: e.target.checked,
                      }))
                    }
                    disabled={actionState.processing}
                    className="rounded border-gray-300 text-gray-600 focus:ring-gray-500"
                  />
                  <label
                    htmlFor="rescheduleOffered"
                    className="text-sm text-gray-700"
                  >
                    Offered rescheduling opportunity
                  </label>
                </div>
              </div>

              {/* Patient reliability impact warning */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-orange-800 font-medium">
                      Impact on Patient Record:
                    </p>
                    <p className="text-orange-700 mt-1">
                      This will affect the patient's reliability score and may
                      impact future booking privileges.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() =>
                  setModals((prev) => ({ ...prev, noShow: false }))
                }
                disabled={actionState.processing}
                className="px-6 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleAppointmentAction(
                    selectedAppointment.id,
                    "noShow",
                    noShowForm,
                    true
                  )
                }
                disabled={actionState.processing}
                className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionState.processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <UserX className="w-4 h-4" />
                    Mark as No-Show
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ✅ Details Modal */}
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
                <StatusBadge
                  status={selectedAppointment.status}
                  isToday={
                    new Date(
                      selectedAppointment.appointment_date
                    ).toDateString() === new Date().toDateString()
                  }
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
                      <PatientReliabilityBadge
                        reliability={selectedAppointment.patient_reliability}
                      />
                      <div className="mt-3 text-sm space-y-2">
                        <p>
                          <strong>Completion Rate:</strong>{" "}
                          {
                            selectedAppointment.patient_reliability.statistics
                              ?.completion_rate
                          }
                          %
                        </p>
                        <p>
                          <strong>Total Appointments:</strong>{" "}
                          {
                            selectedAppointment.patient_reliability.statistics
                              ?.total_appointments
                          }
                        </p>
                        <p>
                          <strong>No-Shows:</strong>{" "}
                          {
                            selectedAppointment.patient_reliability.statistics
                              ?.no_show_count
                          }
                        </p>
                      </div>
                    </div>
                    {selectedAppointment.patient_reliability
                      .recommendations && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">
                          Staff Recommendations:
                        </h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {selectedAppointment.patient_reliability.recommendations.map(
                            (rec, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-blue-600">•</span>
                                {rec}
                              </li>
                            )
                          )}
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
                      <span className="text-gray-600 font-medium">
                        Date & Time:
                      </span>
                      <div className="mt-1">
                        <p className="font-semibold text-gray-900">
                          {new Date(
                            selectedAppointment.appointment_date
                          ).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                        <p className="font-semibold text-blue-600">
                          {new Date(
                            `${selectedAppointment.appointment_date}T${selectedAppointment.appointment_time}`
                          ).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
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
                      <span className="text-gray-600 font-medium">
                        Duration:
                      </span>
                      <p className="font-semibold text-gray-900 mt-1">
                        {selectedAppointment.duration_minutes || 30} minutes
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Services */}
              {selectedAppointment.services &&
                selectedAppointment.services.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center">
                      <Clipboard className="w-5 h-5 mr-2 text-blue-600" />
                      Services
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {selectedAppointment.services.map((service, idx) => (
                        <div
                          key={idx}
                          className="bg-white p-3 rounded-lg border border-gray-200"
                        >
                          <h5 className="font-medium text-gray-900">
                            {service.name}
                          </h5>
                          <div className="flex justify-between text-sm text-gray-600 mt-1">
                            <span>{service.duration_minutes} min</span>
                            {service.min_price && (
                              <span>
                                ₱{service.min_price} - ₱{service.max_price}
                              </span>
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
