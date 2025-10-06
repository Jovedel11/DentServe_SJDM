import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Check,
  X,
  Loader2,
  Bell,
  MessageSquare,
  Stethoscope,
  Activity,
  Eye,
  Shield,
  Heart,
  Phone,
  TrendingUp,
  AlertTriangle,
  Info,
  MapPin,
  Mail,
  FileText,
  ChevronRight,
} from "lucide-react";

// UI Components
import { Button } from "@/core/components/ui/button";
import { Textarea } from "@/core/components/ui/text-area";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/core/components/ui/card";
import { Badge } from "@/core/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/core/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/core/components/ui/tabs";
import { Checkbox } from "@/core/components/ui/checkbox";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/core/components/ui/alert";
import { Separator } from "@/core/components/ui/separator";

// Hooks
import { useAppointmentManagement } from "@/hooks/appointment/useAppointmentManagement";
import { useAppointmentRealtime } from "@/hooks/appointment/useAppointmentRealtime";
import { useAuth } from "@/auth/context/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

const ManageAppointments = () => {
  const { isStaff, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Hooks
  const appointmentManager = useAppointmentManagement({
    includeHistory: false,
    includeStats: true,
    autoRefresh: false,
  });

  // Real-time
  useAppointmentRealtime({
    onAppointmentUpdate: () => appointmentManager.refreshData(),
    enableAppointments: true,
  });

  // State
  const [activeTab, setActiveTab] = useState("pending");
  const [actionModal, setActionModal] = useState({
    type: null,
    isOpen: false,
    appointment: null,
  });
  const [treatmentModal, setTreatmentModal] = useState({
    isOpen: false,
    appointment: null,
  });
  const [detailsModal, setDetailsModal] = useState({
    isOpen: false,
    appointment: null,
  });
  const [actionForm, setActionForm] = useState({
    notes: "",
    reason: "",
    category: "staff_decision",
    sendRescheduleReminder: false,
    followUpRequired: false,
    followUpNotes: "",
  });
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // Toast helper
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(
      () => setToast({ show: false, message: "", type: "success" }),
      4000
    );
  };

  const resetForm = () => {
    setActionForm({
      notes: "",
      reason: "",
      category: "staff_decision",
      sendRescheduleReminder: false,
      followUpRequired: false,
      followUpNotes: "",
    });
  };

  const closeModal = () => {
    setActionModal({ type: null, isOpen: false, appointment: null });
    resetForm();
  };

  // ✅ APPROVE with treatment plan check
  const handleApprove = async () => {
    if (!actionModal.appointment) return;

    const result = await appointmentManager.approveAppointment(
      actionModal.appointment.id,
      actionForm.notes
    );

    if (result.success) {
      showToast("✅ Appointment approved and patient notified!", "success");
      closeModal();
      appointmentManager.refreshData();
    } else {
      showToast(result.error || "Failed to approve appointment", "error");
    }
  };

  // ✅ Handle treatment plan decision
  const handleTreatmentDecision = (needsTreatment) => {
    const appointment = treatmentModal.appointment;
    setTreatmentModal({ isOpen: false, appointment: null });

    if (needsTreatment) {
      // Navigate to treatment plan creation with appointment data
      navigate("/staff/treatment-plans/create", {
        state: {
          appointment,
          patientId: appointment.patient_id,
          patientName: appointment.patient?.name,
        },
      });
    }
  };

  // ✅ REJECT
  const handleReject = async () => {
    if (!actionModal.appointment || !actionForm.reason) {
      showToast("Please provide a rejection reason", "error");
      return;
    }

    const result = await appointmentManager.rejectAppointment(
      actionModal.appointment.id,
      {
        reason: actionForm.reason,
        category: actionForm.category,
      }
    );

    if (result.success) {
      if (actionForm.sendRescheduleReminder) {
        const { error } = await supabase.rpc("send_reschedule_reminder", {
          p_appointment_id: actionModal.appointment.id,
          p_reason: actionForm.reason,
        });

        if (error) {
          showToast(
            "Appointment rejected, but reschedule reminder failed to send",
            "error"
          );
        } else {
          showToast(
            "Appointment rejected and reschedule options sent to patient!",
            "success"
          );
        }
      } else {
        showToast("Appointment rejected and patient notified", "success");
      }

      closeModal();
      appointmentManager.refreshData();
    } else {
      showToast(result.error || "Failed to reject appointment", "error");
    }
  };

  // ✅ COMPLETE
  const handleComplete = async () => {
    if (!actionModal.appointment) return;

    const result = await appointmentManager.completeAppointment(
      actionModal.appointment.id,
      {
        notes: actionForm.notes,
        followUpRequired: actionForm.followUpRequired,
        followUpNotes: actionForm.followUpNotes,
      }
    );

    if (result.success) {
      showToast("✅ Appointment completed successfully!", "success");
      closeModal();
      appointmentManager.refreshData();

      // Check if treatment plan prompt needed
      const hasMultiVisitServices = actionModal.appointment.services?.some(
        (s) => s.requires_multiple_visits
      );

      // Always show treatment plan option after completion
      setTimeout(() => {
        setTreatmentModal({
          isOpen: true,
          appointment: actionModal.appointment,
        });
      }, 500);
    } else {
      showToast(result.error || "Failed to complete appointment", "error");
    }
  };

  // ✅ NO SHOW
  const handleNoShow = async () => {
    if (!actionModal.appointment) return;

    const result = await appointmentManager.markNoShow(
      actionModal.appointment.id,
      actionForm.notes
    );

    if (result.success) {
      showToast("Marked as no-show. Patient reliability updated.", "success");
      closeModal();
      appointmentManager.refreshData();
    } else {
      showToast(result.error || "Failed to mark no-show", "error");
    }
  };

  // ✅ Helper: Check if appointment is past (including time)
  const isAppointmentPast = (appointment) => {
    const appointmentDate = new Date(appointment.appointment_date);
    const appointmentTime = appointment.appointment_time;

    const [hours, minutes] = appointmentTime.split(":").map(Number);
    appointmentDate.setHours(hours, minutes, 0, 0);

    const now = new Date();
    return appointmentDate < now;
  };

  // ✅ Helper: Get time until appointment
  const getTimeUntilAppointment = (appointment) => {
    const appointmentDate = new Date(appointment.appointment_date);
    const appointmentTime = appointment.appointment_time;
    const [hours, minutes] = appointmentTime.split(":").map(Number);
    appointmentDate.setHours(hours, minutes, 0, 0);

    const now = new Date();
    const diffMs = appointmentDate - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `in ${diffDays} day${diffDays > 1 ? "s" : ""}`;
    if (diffHours > 0) return `in ${diffHours} hour${diffHours > 1 ? "s" : ""}`;
    if (diffMs > 0) return "soon";
    return "overdue";
  };

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    const {
      pendingAppointments,
      confirmedAppointments,
      todayAppointments,
      appointments,
    } = appointmentManager;

    // Only show active appointments (exclude completed, cancelled, no_show)
    const activeAppointments = appointments.filter(
      (apt) => !["completed", "cancelled", "no_show"].includes(apt.status)
    );

    switch (activeTab) {
      case "pending":
        return pendingAppointments || [];
      case "confirmed":
        return confirmedAppointments || [];
      case "today":
        return todayAppointments || [];
      default:
        return activeAppointments;
    }
  }, [activeTab, appointmentManager]);

  // Status Badge Component
  const StatusBadge = ({ status }) => {
    const config = {
      pending: {
        className: "bg-yellow-100 text-yellow-800 border-yellow-300",
        icon: Clock,
        label: "Pending Review",
      },
      confirmed: {
        className: "bg-blue-100 text-blue-800 border-blue-300",
        icon: CheckCircle,
        label: "Confirmed",
      },
    };

    const { className, icon: Icon, label } = config[status] || config.pending;

    return (
      <Badge className={`${className} border font-medium`}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    );
  };

  // ✅ Patient Reliability Alert Component
  const ReliabilityAlert = ({ reliability }) => {
    if (!reliability || reliability.risk_level === "reliable") return null;

    const isHighRisk = reliability.risk_level === "high_risk";
    const isModerateRisk = reliability.risk_level === "moderate_risk";

    return (
      <Alert
        variant={isHighRisk ? "destructive" : "default"}
        className={isModerateRisk ? "border-yellow-500 bg-yellow-50" : ""}
      >
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="font-semibold">
          {isHighRisk ? "⚠️ High Risk Patient" : "⚠️ Moderate Risk Patient"}
        </AlertTitle>
        <AlertDescription className="text-xs space-y-1 mt-2">
          <div className="flex items-center gap-4">
            <span>
              Completion Rate:{" "}
              <strong>{reliability.statistics?.completion_rate || 0}%</strong>
            </span>
            <span>
              No-Shows:{" "}
              <strong className="text-red-600">
                {reliability.statistics?.no_show_count || 0}
              </strong>
            </span>
          </div>
          {reliability.recommendations?.length > 0 && (
            <div className="mt-2 pt-2 border-t">
              <p className="font-semibold mb-1">📋 Recommendations:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {reliability.recommendations.slice(0, 2).map((rec, idx) => (
                  <li key={idx} className="text-xs">
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  };

  // ✅ Enhanced Appointment Details Modal
  const AppointmentDetails = ({ appointment }) => {
    const reliability = appointment.patient_reliability;
    const patientInfo = appointment.patient;

    return (
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        {/* Patient Reliability Warning - TOP PRIORITY */}
        {reliability && reliability.risk_level !== "reliable" && (
          <ReliabilityAlert reliability={reliability} />
        )}

        {/* Patient Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Full Name</p>
                <p className="font-medium">{patientInfo?.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Email</p>
                <p className="font-medium flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {patientInfo?.email || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Phone</p>
                <p className="font-medium flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {patientInfo?.phone || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Age</p>
                <p className="font-medium">{patientInfo?.age || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appointment Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Appointment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Date</p>
                <p className="font-medium">
                  {new Date(appointment.appointment_date).toLocaleDateString(
                    "en-US",
                    {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Time</p>
                <p className="font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {appointment.appointment_time}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Doctor</p>
                <p className="font-medium flex items-center gap-1">
                  <Stethoscope className="w-3 h-3" />
                  {appointment.doctor?.name || "Unassigned"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Duration</p>
                <p className="font-medium">
                  {appointment.duration_minutes || 30} minutes
                </p>
              </div>
            </div>

            {appointment.booking_type && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">
                  Booking Type
                </p>
                <Badge variant="outline" className="text-xs">
                  {appointment.booking_type.replace(/_/g, " ").toUpperCase()}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Services */}
        {appointment.services?.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Requested Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {appointment.services.map((service, idx) => (
                  <div key={idx} className="p-3 bg-muted/50 rounded-lg border">
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-medium text-sm">
                        {service.name}
                      </span>
                      {service.requires_multiple_visits && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-purple-100 text-purple-700"
                        >
                          Multi-Visit Required
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {service.duration_minutes} min
                      </span>
                      {service.min_price && (
                        <span>
                          ₱{service.min_price} - ₱{service.max_price}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Symptoms */}
        {appointment.symptoms && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Patient Symptoms / Concerns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm bg-muted/50 p-3 rounded-lg border">
                {appointment.symptoms}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Existing Notes */}
        {appointment.notes && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Appointment Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm bg-muted/50 p-3 rounded-lg border whitespace-pre-wrap">
                {appointment.notes}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Reliability Details (Full) */}
        {reliability && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Patient Reliability Score
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Risk Level:</span>
                <Badge
                  className={
                    reliability.risk_level === "reliable"
                      ? "bg-green-100 text-green-800 border-green-300"
                      : reliability.risk_level === "high_risk"
                      ? "bg-red-100 text-red-800 border-red-300"
                      : "bg-yellow-100 text-yellow-800 border-yellow-300"
                  }
                >
                  {reliability.risk_level?.replace("_", " ").toUpperCase()}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">
                    Completion Rate
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {reliability.statistics?.completion_rate || 0}%
                  </p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">
                    Completed
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {reliability.statistics?.completed_count || 0}
                  </p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">No-Shows</p>
                  <p className="text-2xl font-bold text-red-600">
                    {reliability.statistics?.no_show_count || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // ✅ Enhanced Appointment Card
  const AppointmentCard = ({ appointment }) => {
    const isPending = appointment.status === "pending";
    const isConfirmed = appointment.status === "confirmed";
    const appointmentDate = new Date(appointment.appointment_date);
    const isToday =
      appointmentDate.toDateString() === new Date().toDateString();
    const isPast = isAppointmentPast(appointment);
    const timeUntil = getTimeUntilAppointment(appointment);
    const reliability = appointment.patient_reliability;
    const isRisky = reliability && reliability.risk_level !== "reliable";

    // Show Complete/No Show buttons for confirmed appointments that have passed
    const showCompletionButtons = isConfirmed && isPast;

    return (
      <Card
        className={`hover:shadow-lg transition-all border-l-4 ${
          isRisky && isPending
            ? "border-l-red-500 bg-red-50/30"
            : isPending
            ? "border-l-yellow-500"
            : "border-l-blue-500"
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between mb-2">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">
                  {appointment.patient?.name || "Unknown Patient"}
                </h3>
                {isRisky && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Risk
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={appointment.status} />
                {isToday && (
                  <Badge className="bg-orange-100 text-orange-800 border-orange-300 border">
                    <Bell className="w-3 h-3 mr-1" />
                    Today
                  </Badge>
                )}
                {!isPast && !isToday && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {timeUntil}
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDetailsModal({ isOpen: true, appointment })}
              className="shrink-0"
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>

          {/* Quick Reliability Warning */}
          {isRisky && isPending && (
            <Alert variant="destructive" className="py-2 px-3">
              <AlertTriangle className="h-3 w-3" />
              <AlertDescription className="text-xs">
                {reliability.statistics?.no_show_count || 0} no-shows,{" "}
                {reliability.statistics?.completion_rate || 0}% completion rate
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {appointmentDate.toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4 shrink-0" />
              <span>{appointment.appointment_time}</span>
            </div>
          </div>

          <Separator />

          {/* Doctor */}
          <div className="flex items-center gap-2 text-sm">
            <Stethoscope className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="font-medium">
              {appointment.doctor?.name || "Unassigned"}
            </span>
          </div>

          {/* Services */}
          {appointment.services?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {appointment.services.slice(0, 2).map((service, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {service.name}
                </Badge>
              ))}
              {appointment.services.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{appointment.services.length - 2} more
                </Badge>
              )}
            </div>
          )}

          {/* Symptoms Preview */}
          {appointment.symptoms && (
            <div className="text-xs bg-muted/50 rounded p-2 border">
              <MessageSquare className="w-3 h-3 inline mr-1 text-muted-foreground" />
              <span className="line-clamp-1 text-muted-foreground">
                {appointment.symptoms}
              </span>
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {isPending && (
              <>
                <Button
                  size="sm"
                  onClick={() =>
                    setActionModal({
                      type: "approve",
                      isOpen: true,
                      appointment,
                    })
                  }
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() =>
                    setActionModal({
                      type: "reject",
                      isOpen: true,
                      appointment,
                    })
                  }
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-1" />
                  Reject
                </Button>
              </>
            )}

            {showCompletionButtons && (
              <>
                <Button
                  size="sm"
                  onClick={() =>
                    setActionModal({
                      type: "complete",
                      isOpen: true,
                      appointment,
                    })
                  }
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Complete
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setActionModal({
                      type: "no_show",
                      isOpen: true,
                      appointment,
                    })
                  }
                  className="flex-1"
                >
                  <AlertCircle className="w-4 h-4 mr-1" />
                  No Show
                </Button>
              </>
            )}

            {isConfirmed && !isPast && (
              <div className="w-full flex items-center justify-center py-2 bg-blue-50 rounded-md border border-blue-200">
                <Clock className="w-4 h-4 mr-2 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">
                  Scheduled - Awaiting Visit
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Security check
  if (!isStaff && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
            <div>
              <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                This page is restricted to staff members only.
              </p>
            </div>
            <Button onClick={() => navigate("/")}>Return Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Manage Appointments
            </h1>
            <p className="text-muted-foreground mt-1">
              Review, approve, and manage patient appointment requests
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => appointmentManager.refreshData()}
            disabled={appointmentManager.loading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${
                appointmentManager.loading ? "animate-spin" : ""
              }`}
            />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Pending Review
                  </p>
                  <p className="text-3xl font-bold text-yellow-600">
                    {appointmentManager.pendingCount || 0}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Confirmed
                  </p>
                  <p className="text-3xl font-bold text-blue-600">
                    {appointmentManager.stats?.confirmed || 0}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Today's Schedule
                  </p>
                  <p className="text-3xl font-bold text-orange-600">
                    {appointmentManager.todayCount || 0}
                  </p>
                </div>
                <Bell className="w-8 h-8 text-orange-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-primary">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Active
                  </p>
                  <p className="text-3xl font-bold">
                    {appointmentManager.stats?.total || 0}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toast Notification */}
        <AnimatePresence>
          {toast.show && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.95 }}
              className="fixed top-4 right-4 z-50 max-w-md"
            >
              <Alert
                variant={toast.type === "error" ? "destructive" : "default"}
                className="shadow-lg border-2"
              >
                {toast.type === "error" ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                <AlertTitle className="font-semibold">
                  {toast.type === "error" ? "Error" : "Success"}
                </AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                  {toast.message}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setToast({ ...toast, show: false })}
                    className="ml-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-4 h-auto p-1">
            <TabsTrigger
              value="pending"
              className="data-[state=active]:bg-yellow-100 data-[state=active]:text-yellow-900"
            >
              <div className="flex flex-col items-center py-2">
                <Clock className="w-4 h-4 mb-1" />
                <span className="font-medium">Pending</span>
                <span className="text-xs text-muted-foreground">
                  ({appointmentManager.pendingAppointments?.length || 0})
                </span>
              </div>
            </TabsTrigger>

            <TabsTrigger
              value="confirmed"
              className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900"
            >
              <div className="flex flex-col items-center py-2">
                <CheckCircle className="w-4 h-4 mb-1" />
                <span className="font-medium">Confirmed</span>
                <span className="text-xs text-muted-foreground">
                  ({appointmentManager.stats?.confirmed || 0})
                </span>
              </div>
            </TabsTrigger>

            <TabsTrigger
              value="today"
              className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-900"
            >
              <div className="flex flex-col items-center py-2">
                <Bell className="w-4 h-4 mb-1" />
                <span className="font-medium">Today</span>
                <span className="text-xs text-muted-foreground">
                  ({appointmentManager.todayAppointments?.length || 0})
                </span>
              </div>
            </TabsTrigger>

            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              <div className="flex flex-col items-center py-2">
                <Activity className="w-4 h-4 mb-1" />
                <span className="font-medium">All Active</span>
                <span className="text-xs text-muted-foreground">
                  (
                  {appointmentManager.appointments?.filter(
                    (a) =>
                      !["completed", "cancelled", "no_show"].includes(a.status)
                  ).length || 0}
                  )
                </span>
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {appointmentManager.loading ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-96 space-y-4">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                  <p className="text-muted-foreground">
                    Loading appointments...
                  </p>
                </CardContent>
              </Card>
            ) : filteredAppointments.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-96 text-center space-y-4">
                  <Calendar className="w-16 h-16 text-muted-foreground/50" />
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      No {activeTab} Appointments
                    </h3>
                    <p className="text-muted-foreground">
                      {activeTab === "pending" &&
                        "All caught up! No appointments waiting for approval."}
                      {activeTab === "confirmed" &&
                        "No confirmed appointments at this time."}
                      {activeTab === "today" &&
                        "No appointments scheduled for today."}
                      {activeTab === "all" && "No active appointments found."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Details Modal */}
        <Dialog
          open={detailsModal.isOpen}
          onOpenChange={() =>
            setDetailsModal({ isOpen: false, appointment: null })
          }
        >
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="text-xl">Appointment Details</DialogTitle>
              <DialogDescription>
                Complete information about this appointment and patient
              </DialogDescription>
            </DialogHeader>
            {detailsModal.appointment && (
              <AppointmentDetails appointment={detailsModal.appointment} />
            )}
          </DialogContent>
        </Dialog>

        {/* Treatment Plan Decision Modal */}
        <Dialog
          open={treatmentModal.isOpen}
          onOpenChange={() =>
            setTreatmentModal({ isOpen: false, appointment: null })
          }
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-purple-600" />
                Treatment Plan Needed?
              </DialogTitle>
              <DialogDescription>
                Does{" "}
                <strong>{treatmentModal.appointment?.patient?.name}</strong>{" "}
                require a treatment plan for ongoing care?
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Treatment plans help track multi-visit procedures, monitor
                  progress, and ensure comprehensive patient care.
                </AlertDescription>
              </Alert>

              {treatmentModal.appointment?.services?.some(
                (s) => s.requires_multiple_visits
              ) && (
                <Alert
                  variant="default"
                  className="border-purple-300 bg-purple-50"
                >
                  <AlertTriangle className="h-4 w-4 text-purple-600" />
                  <AlertDescription className="text-sm">
                    This appointment includes services that typically require
                    multiple visits.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleTreatmentDecision(false)}
                className="flex-1"
              >
                No, Not Needed
              </Button>
              <Button
                onClick={() => handleTreatmentDecision(true)}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                <Heart className="w-4 h-4 mr-2" />
                Yes, Create Plan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Action Modals */}
        <Dialog open={actionModal.isOpen} onOpenChange={closeModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {actionModal.type === "approve" && (
                  <span className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-5 h-5" />
                    Approve Appointment
                  </span>
                )}
                {actionModal.type === "reject" && (
                  <span className="flex items-center gap-2 text-red-700">
                    <XCircle className="w-5 h-5" />
                    Reject Appointment
                  </span>
                )}
                {actionModal.type === "complete" && (
                  <span className="flex items-center gap-2 text-blue-700">
                    <CheckCircle className="w-5 h-5" />
                    Complete Appointment
                  </span>
                )}
                {actionModal.type === "no_show" && (
                  <span className="flex items-center gap-2 text-gray-700">
                    <AlertCircle className="w-5 h-5" />
                    Mark as No Show
                  </span>
                )}
              </DialogTitle>
              <DialogDescription>
                {actionModal.appointment && (
                  <span className="text-sm">
                    Patient:{" "}
                    <strong>{actionModal.appointment.patient?.name}</strong>
                    {" • "}
                    {new Date(
                      actionModal.appointment.appointment_date
                    ).toLocaleDateString()}
                    {" at "}
                    {actionModal.appointment.appointment_time}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Approve Form */}
              {actionModal.type === "approve" && (
                <>
                  {actionModal.appointment?.patient_reliability?.risk_level !==
                    "reliable" && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Patient Reliability Warning</AlertTitle>
                      <AlertDescription className="text-xs mt-1">
                        This patient has{" "}
                        {actionModal.appointment.patient_reliability?.statistics
                          ?.no_show_count || 0}{" "}
                        no-shows and a{" "}
                        {actionModal.appointment.patient_reliability?.statistics
                          ?.completion_rate || 0}
                        % completion rate. Consider sending a confirmation
                        reminder.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Staff Notes (Optional)
                    </label>
                    <Textarea
                      value={actionForm.notes}
                      onChange={(e) =>
                        setActionForm({ ...actionForm, notes: e.target.value })
                      }
                      placeholder="Add any notes, special instructions, or reminders for the appointment..."
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                </>
              )}

              {/* Reject Form */}
              {actionModal.type === "reject" && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Rejection Category
                    </label>
                    <Select
                      value={actionForm.category}
                      onValueChange={(value) =>
                        setActionForm({ ...actionForm, category: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="doctor_unavailable">
                          Doctor Unavailable
                        </SelectItem>
                        <SelectItem value="overbooked">
                          Clinic Overbooked
                        </SelectItem>
                        <SelectItem value="staff_decision">
                          Staff Decision
                        </SelectItem>
                        <SelectItem value="other">Other Reason</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Rejection Reason <span className="text-red-600">*</span>
                    </label>
                    <Textarea
                      value={actionForm.reason}
                      onChange={(e) =>
                        setActionForm({ ...actionForm, reason: e.target.value })
                      }
                      placeholder="Provide a clear and professional reason that will be sent to the patient..."
                      rows={4}
                      required
                      className="resize-none"
                    />
                    {!actionForm.reason && (
                      <p className="text-xs text-red-600 mt-1">
                        Rejection reason is required
                      </p>
                    )}
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg border">
                    <Checkbox
                      id="sendReminder"
                      checked={actionForm.sendRescheduleReminder}
                      onCheckedChange={(checked) =>
                        setActionForm({
                          ...actionForm,
                          sendRescheduleReminder: checked,
                        })
                      }
                    />
                    <div className="flex-1">
                      <label
                        htmlFor="sendReminder"
                        className="text-sm font-medium cursor-pointer"
                      >
                        Send reschedule reminder to patient
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Patient will receive an email with alternative booking
                        options
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Complete Form */}
              {actionModal.type === "complete" && (
                <>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Completing this appointment will create a medical history
                      record and trigger feedback request to the patient.
                    </AlertDescription>
                  </Alert>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Completion Notes
                    </label>
                    <Textarea
                      value={actionForm.notes}
                      onChange={(e) =>
                        setActionForm({ ...actionForm, notes: e.target.value })
                      }
                      placeholder="Summary of appointment, treatments performed, patient condition..."
                      rows={4}
                      className="resize-none"
                    />
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg border">
                    <Checkbox
                      id="followUp"
                      checked={actionForm.followUpRequired}
                      onCheckedChange={(checked) =>
                        setActionForm({
                          ...actionForm,
                          followUpRequired: checked,
                        })
                      }
                    />
                    <div className="flex-1">
                      <label
                        htmlFor="followUp"
                        className="text-sm font-medium cursor-pointer"
                      >
                        Follow-up appointment required
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Mark if patient needs a follow-up visit
                      </p>
                    </div>
                  </div>

                  {actionForm.followUpRequired && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Follow-up Instructions
                      </label>
                      <Textarea
                        value={actionForm.followUpNotes}
                        onChange={(e) =>
                          setActionForm({
                            ...actionForm,
                            followUpNotes: e.target.value,
                          })
                        }
                        placeholder="Recommended timeframe, specific concerns to address..."
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                  )}
                </>
              )}

              {/* No Show Form */}
              {actionModal.type === "no_show" && (
                <>
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Patient Reliability Impact</AlertTitle>
                    <AlertDescription className="text-xs mt-1">
                      Marking as no-show will:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Update patient's reliability score</li>
                        <li>
                          Send notification to patient about missed appointment
                        </li>
                        <li>Free up the time slot for other patients</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Staff Notes (Optional)
                    </label>
                    <Textarea
                      value={actionForm.notes}
                      onChange={(e) =>
                        setActionForm({ ...actionForm, notes: e.target.value })
                      }
                      placeholder="Any additional context about the no-show (contacted patient, left message, etc.)..."
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (actionModal.type === "approve") handleApprove();
                  if (actionModal.type === "reject") handleReject();
                  if (actionModal.type === "complete") handleComplete();
                  if (actionModal.type === "no_show") handleNoShow();
                }}
                disabled={
                  appointmentManager.loading ||
                  (actionModal.type === "reject" && !actionForm.reason)
                }
                className={
                  actionModal.type === "approve"
                    ? "bg-green-600 hover:bg-green-700"
                    : actionModal.type === "reject"
                    ? "bg-red-600 hover:bg-red-700"
                    : actionModal.type === "complete"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-gray-600 hover:bg-gray-700"
                }
              >
                {appointmentManager.loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {actionModal.type === "approve" && (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Approve & Notify Patient
                      </>
                    )}
                    {actionModal.type === "reject" && (
                      <>
                        <X className="w-4 h-4 mr-2" />
                        Reject & Notify Patient
                      </>
                    )}
                    {actionModal.type === "complete" && (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark as Complete
                      </>
                    )}
                    {actionModal.type === "no_show" && (
                      <>
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Confirm No Show
                      </>
                    )}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ManageAppointments;
