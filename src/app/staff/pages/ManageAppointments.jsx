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
} from "lucide-react";

// UI Components
import { Button } from "@/core/components/ui/button";
import { Textarea } from "@/core/components/ui/text-area";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
      3000
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
      showToast("Appointment approved successfully!");
      closeModal();
      appointmentManager.refreshData();

      // ✅ Check if services require treatment plan
      const hasMultiVisitServices = actionModal.appointment.services?.some(
        (s) => s.requires_multiple_visits
      );

      if (hasMultiVisitServices) {
        // Show treatment plan modal
        setTimeout(() => {
          setTreatmentModal({
            isOpen: true,
            appointment: actionModal.appointment,
          });
        }, 500);
      }
    } else {
      showToast(result.error || "Failed to approve", "error");
    }
  };

  // ✅ Handle treatment plan decision
  const handleTreatmentDecision = (needsTreatment) => {
    const appointment = treatmentModal.appointment;
    setTreatmentModal({ isOpen: false, appointment: null });

    if (needsTreatment) {
      // Navigate to treatment plan creation with appointment data
      navigate("/staff/treatment-plans/create", {
        state: { appointment },
      });
    }
  };

  // ✅ REJECT
  const handleReject = async () => {
    if (!actionModal.appointment || !actionForm.reason) {
      showToast("Rejection reason is required", "error");
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
            "Rejected, but failed to send reschedule reminder",
            "error"
          );
        } else {
          showToast("Rejected and reschedule reminder sent to patient!");
        }
      } else {
        showToast("Appointment rejected successfully!");
      }

      closeModal();
      appointmentManager.refreshData();
    } else {
      showToast(result.error || "Failed to reject", "error");
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
      showToast("Appointment completed successfully!");
      closeModal();
      appointmentManager.refreshData();

      // Check if treatment plan needed
      const hasMultiVisitServices = actionModal.appointment.services?.some(
        (s) => s.requires_multiple_visits
      );

      if (hasMultiVisitServices) {
        setTimeout(() => {
          setTreatmentModal({
            isOpen: true,
            appointment: actionModal.appointment,
          });
        }, 500);
      }
    } else {
      showToast(result.error || "Failed to complete", "error");
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
      showToast("Marked as no-show successfully!");
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

    // Combine date and time
    const [hours, minutes] = appointmentTime.split(":").map(Number);
    appointmentDate.setHours(hours, minutes, 0, 0);

    const now = new Date();

    // Appointment is past if it's before current time
    return appointmentDate < now;
  };

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    const { pendingAppointments, todayAppointments, appointments } =
      appointmentManager;
    const activeAppointments = appointments.filter(
      (apt) => !["completed", "cancelled", "no_show"].includes(apt.status)
    );

    switch (activeTab) {
      case "pending":
        return pendingAppointments || [];
      case "confirmed":
        return appointments.filter((apt) => apt.status === "confirmed");
      case "today":
        return todayAppointments || [];
      default:
        return activeAppointments;
    }
  }, [activeTab, appointmentManager]);

  // Status Badge
  const StatusBadge = ({ status }) => {
    const config = {
      pending: {
        className: "bg-yellow-100 text-yellow-800",
        icon: Clock,
        label: "Pending",
      },
      confirmed: {
        className: "bg-blue-100 text-blue-800",
        icon: CheckCircle,
        label: "Confirmed",
      },
      completed: {
        className: "bg-green-100 text-green-800",
        icon: CheckCircle,
        label: "Completed",
      },
      cancelled: {
        className: "bg-red-100 text-red-800",
        icon: XCircle,
        label: "Cancelled",
      },
      no_show: {
        className: "bg-gray-100 text-gray-800",
        icon: AlertCircle,
        label: "No Show",
      },
    };

    const { className, icon: Icon, label } = config[status] || config.pending;

    return (
      <Badge className={className}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
                </Badge>
    );
  };

  // ✅ Details Modal Content
  const AppointmentDetails = ({ appointment }) => {
    const reliability = appointment.patient_reliability;
    const patientInfo = appointment.patient;

    return (
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Patient Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="w-4 h-4" />
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <strong>Name:</strong> {patientInfo?.name}
            </div>
                <div>
              <strong>Email:</strong> {patientInfo?.email}
                </div>
                <div>
              <strong>Phone:</strong> {patientInfo?.phone || "N/A"}
                </div>
            </CardContent>
          </Card>

        {/* Reliability */}
        {reliability && (
          <Card>
        <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Patient Reliability
          </CardTitle>
        </CardHeader>
            <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
                <span>Risk Level:</span>
            <Badge
                  className={
                    reliability.risk_level === "reliable"
                      ? "bg-green-100 text-green-800"
                      : reliability.risk_level === "high_risk"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                  }
                >
                  {reliability.risk_level?.replace("_", " ").toUpperCase()}
            </Badge>
          </div>
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Completion</p>
                  <p className="text-lg font-bold">
                    {reliability.statistics?.completion_rate || 0}%
              </p>
            </div>
                <div className="text-center">
              <p className="text-xs text-muted-foreground">Completed</p>
                  <p className="text-lg font-bold text-green-600">
                    {reliability.statistics?.completed_count || 0}
              </p>
            </div>
                <div className="text-center">
              <p className="text-xs text-muted-foreground">No-Shows</p>
                  <p className="text-lg font-bold text-red-600">
                    {reliability.statistics?.no_show_count || 0}
              </p>
            </div>
          </div>
              {reliability.recommendations?.length > 0 && (
                <div className="mt-2 p-2 bg-yellow-50 rounded text-xs">
                  <p className="font-semibold mb-1">⚠️ Recommendations:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {reliability.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
        )}

        {/* Services */}
        {appointment.services?.length > 0 && (
          <Card>
        <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Stethoscope className="w-4 h-4" />
                Services
          </CardTitle>
        </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {appointment.services.map((service, idx) => (
                  <div key={idx} className="p-2 bg-muted/50 rounded">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{service.name}</span>
                  {service.requires_multiple_visits && (
                    <Badge
                      variant="outline"
                          className="text-xs bg-purple-50"
                    >
                          Multi-visit
                    </Badge>
                  )}
                </div>
                    <p className="text-xs text-muted-foreground">
                      {service.duration_minutes} min
                    </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
        )}

        {/* Symptoms */}
        {appointment.symptoms && (
            <Card>
            <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                Symptoms
                  </CardTitle>
                </CardHeader>
                <CardContent>
              <p className="text-sm">{appointment.symptoms}</p>
                </CardContent>
              </Card>
        )}
      </div>
    );
  };

  // Appointment Card
  const AppointmentCard = ({ appointment }) => {
    const isPending = appointment.status === "pending";
    const isConfirmed = appointment.status === "confirmed";
    const appointmentDate = new Date(appointment.appointment_date);
    const isToday =
      appointmentDate.toDateString() === new Date().toDateString();
    const isPast = isAppointmentPast(appointment);

    // ✅ Show Complete/No Show buttons for confirmed appointments that have passed
    const showCompletionButtons = isConfirmed && isPast;

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">
                {appointment.patient?.name || "Unknown"}
              </h3>
              <div className="flex items-center gap-2">
                <StatusBadge status={appointment.status} />
                {isToday && (
                  <Badge className="bg-orange-100 text-orange-800">
                    <Bell className="w-3 h-3 mr-1" />
                    Today
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDetailsModal({ isOpen: true, appointment })}
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Details */}
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {appointmentDate.toLocaleDateString()}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {appointment.appointment_time}
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <Stethoscope className="w-4 h-4" />
                {appointment.doctor?.name || "Unassigned"}
            </div>
          </div>

          {/* Services */}
          {appointment.services?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {appointment.services.map((service, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {service.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Symptoms */}
          {appointment.symptoms && (
            <div className="text-sm bg-muted/50 rounded p-2">
                <MessageSquare className="w-3 h-3 inline mr-1" />
              <span className="line-clamp-2">{appointment.symptoms}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
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
              <Button variant="outline" size="sm" className="w-full" disabled>
                <Clock className="w-4 h-4 mr-1" />
                Upcoming
              </Button>
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
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">Staff only.</p>
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
            <h1 className="text-3xl font-bold">Manage Appointments</h1>
            <p className="text-muted-foreground mt-1">
              Review and manage appointment requests
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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">
                    {appointmentManager.stats?.pending || 0}
                  </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">Confirmed</p>
                  <p className="text-2xl font-bold">
                    {appointmentManager.stats?.confirmed || 0}
                  </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">
                    {appointmentManager.stats?.completed || 0}
                  </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">
                    {appointmentManager.stats?.total || 0}
                  </p>
            </CardContent>
          </Card>
        </div>

        {/* Toast */}
        <AnimatePresence>
          {toast.show && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-4 right-4 z-50"
            >
              <Card
                className={
                  toast.type === "error" ? "border-red-500" : "border-green-500"
                }
              >
                <CardContent className="pt-6 flex items-center gap-3">
                    {toast.type === "error" ? (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                  <p className="text-sm">{toast.message}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setToast({ ...toast, show: false })}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending">
              Pending ({appointmentManager.pendingAppointments?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="confirmed">
              Confirmed ({appointmentManager.stats?.confirmed || 0})
            </TabsTrigger>
            <TabsTrigger value="today">
              Today ({appointmentManager.todayAppointments?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="all">All Active</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {appointmentManager.loading ? (
              <Card>
                <CardContent className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </CardContent>
              </Card>
            ) : filteredAppointments.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                  <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Appointments</h3>
                  <p className="text-muted-foreground text-sm">
                    No {activeTab} appointments at this time
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Appointment Details</DialogTitle>
            </DialogHeader>
            {detailsModal.appointment && (
              <AppointmentDetails appointment={detailsModal.appointment} />
            )}
          </DialogContent>
        </Dialog>

        {/* Treatment Plan Modal */}
        <Dialog
          open={treatmentModal.isOpen}
          onOpenChange={() =>
            setTreatmentModal({ isOpen: false, appointment: null })
          }
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Treatment Plan Required</DialogTitle>
              <DialogDescription>
                This appointment includes services that may require a treatment
                plan. Does this patient need a treatment plan?
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Treatment plans help track multi-visit services and patient
                progress over time.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleTreatmentDecision(false)}
              >
                No, Not Needed
              </Button>
              <Button
                onClick={() => handleTreatmentDecision(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Yes, Create Treatment Plan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Action Modals */}
        <Dialog open={actionModal.isOpen} onOpenChange={closeModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {actionModal.type === "approve" && "Approve Appointment"}
                {actionModal.type === "reject" && "Reject Appointment"}
                {actionModal.type === "complete" && "Complete Appointment"}
                {actionModal.type === "no_show" && "Mark as No Show"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Approve Form */}
              {actionModal.type === "approve" && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Staff Notes (Optional)
                  </label>
                  <Textarea
                    value={actionForm.notes}
                    onChange={(e) =>
                      setActionForm({ ...actionForm, notes: e.target.value })
                    }
                    placeholder="Add any notes or special instructions..."
                    rows={3}
                  />
                </div>
              )}

              {/* Reject Form */}
              {actionModal.type === "reject" && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Category
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
                        <SelectItem value="staff_decision">
                          Staff Decision
                        </SelectItem>
                        <SelectItem value="doctor_unavailable">
                          Doctor Unavailable
                        </SelectItem>
                        <SelectItem value="overbooked">Overbooked</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Reason *
                    </label>
                    <Textarea
                      value={actionForm.reason}
                      onChange={(e) =>
                        setActionForm({ ...actionForm, reason: e.target.value })
                      }
                      placeholder="Provide a detailed reason for rejection..."
                      rows={4}
                      required
                    />
                  </div>

                  <div className="flex items-center gap-2">
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
                    <label
                      htmlFor="sendReminder"
                      className="text-sm font-medium"
                    >
                      Send reschedule reminder to patient
                    </label>
                </div>
                </>
              )}

              {/* Complete Form */}
              {actionModal.type === "complete" && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Completion Notes
                    </label>
                    <Textarea
                      value={actionForm.notes}
                      onChange={(e) =>
                        setActionForm({ ...actionForm, notes: e.target.value })
                      }
                      placeholder="Appointment summary, treatments completed..."
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center gap-2">
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
                    <label htmlFor="followUp" className="text-sm font-medium">
                      Follow-up appointment required
                    </label>
                  </div>

                  {actionForm.followUpRequired && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Follow-up Notes
                      </label>
                      <Textarea
                        value={actionForm.followUpNotes}
                        onChange={(e) =>
                          setActionForm({
                            ...actionForm,
                            followUpNotes: e.target.value,
                          })
                        }
                        placeholder="Follow-up instructions..."
                        rows={2}
                      />
                    </div>
                  )}
                </>
              )}

              {/* No Show Form */}
              {actionModal.type === "no_show" && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Staff Notes (Optional)
                    </label>
                    <Textarea
                      value={actionForm.notes}
                      onChange={(e) =>
                        setActionForm({ ...actionForm, notes: e.target.value })
                      }
                    placeholder="Any additional context..."
                      rows={3}
                    />
                </div>
              )}
            </div>

            <DialogFooter>
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
                    : ""
                }
              >
                {appointmentManager.loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {actionModal.type === "approve" && "Approve"}
                    {actionModal.type === "reject" && "Reject"}
                    {actionModal.type === "complete" && "Complete"}
                    {actionModal.type === "no_show" && "Mark No Show"}
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
