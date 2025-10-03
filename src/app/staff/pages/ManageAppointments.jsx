import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  Check,
  X,
  AlertTriangle,
  Shield,
  Star,
  Info,
  Loader2,
  FileText,
  Activity,
  Stethoscope,
  Bell,
  MessageSquare,
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/core/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/core/components/ui/tabs";
import { Separator } from "@/core/components/ui/separator";

// Hooks
import { useAppointmentManagement } from "@/hooks/appointment/useAppointmentManagement";
import { useAppointmentRealtime } from "@/hooks/appointment/useAppointmentRealtime";
import { useAuth } from "@/auth/context/AuthProvider";

const ManageAppointments = () => {
  const { isStaff, isAdmin, profile } = useAuth();

  // ✅ Hooks Integration
  const appointmentManager = useAppointmentManagement({
    includeHistory: false,
    includeStats: true,
    autoRefresh: true,
    defaultFilters: {
      status: null, // null = all statuses
    },
  });

  // ✅ Real-time updates
  useAppointmentRealtime({
    onAppointmentUpdate: () => appointmentManager.refreshData(),
    onAppointmentStatusChange: () => appointmentManager.refreshData(),
    enableAppointments: true,
    enableNotifications: true,
  });

  // ✅ State Management
  const [activeTab, setActiveTab] = useState("pending"); // pending, confirmed, all
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [actionModal, setActionModal] = useState({
    type: null, // approve, reject, complete, no_show
    isOpen: false,
    data: null,
  });

  const [actionForm, setActionForm] = useState({
    notes: "",
    reason: "",
    category: "staff_decision",
    suggestReschedule: false,
    followUpRequired: false,
    followUpNotes: "",
  });

  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // ✅ Helper Functions
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(
      () => setToast({ show: false, message: "", type: "success" }),
      4000
    );
  };

  const resetActionForm = () => {
    setActionForm({
      notes: "",
      reason: "",
      category: "staff_decision",
      suggestReschedule: false,
      followUpRequired: false,
      followUpNotes: "",
    });
  };

  const closeActionModal = () => {
    setActionModal({ type: null, isOpen: false, data: null });
    resetActionForm();
  };

  // ✅ Action Handlers
  const handleApprove = async () => {
    if (!actionModal.data) return;

    const result = await appointmentManager.approveAppointment(
      actionModal.data.id,
      actionForm.notes
    );

    if (result.success) {
      showToast(
        result.message ||
          "Appointment approved successfully! Patient has been notified."
      );
      closeActionModal();
      appointmentManager.refreshData();
    } else {
      showToast(result.error || "Failed to approve appointment", "error");
    }
  };

  const handleReject = async () => {
    if (!actionModal.data || !actionForm.reason) {
      showToast("Please provide a rejection reason", "error");
      return;
    }

    const result = await appointmentManager.rejectAppointment(
      actionModal.data.id,
      {
        reason: actionForm.reason,
        category: actionForm.category,
        suggestReschedule: actionForm.suggestReschedule,
      }
    );

    if (result.success) {
      showToast(
        result.message || "Appointment rejected. Patient has been notified."
      );
      closeActionModal();
      appointmentManager.refreshData();
    } else {
      showToast(result.error || "Failed to reject appointment", "error");
    }
  };

  const handleComplete = async () => {
    if (!actionModal.data) return;

    const result = await appointmentManager.completeAppointment(
      actionModal.data.id,
      {
        notes: actionForm.notes,
        followUpRequired: actionForm.followUpRequired,
        followUpNotes: actionForm.followUpNotes,
      }
    );

    if (result.success) {
      showToast(
        result.message ||
          "Appointment completed! Feedback request sent to patient."
      );
      closeActionModal();
      appointmentManager.refreshData();
    } else {
      showToast(result.error || "Failed to complete appointment", "error");
    }
  };

  const handleNoShow = async () => {
    if (!actionModal.data) return;

    const result = await appointmentManager.markNoShow(
      actionModal.data.id,
      actionForm.notes
    );

    if (result.success) {
      showToast(
        result.message || "Marked as no-show. Patient reliability updated."
      );
      closeActionModal();
      appointmentManager.refreshData();
    } else {
      showToast(result.error || "Failed to mark no-show", "error");
    }
  };

  // ✅ Filtered Appointments by Tab
  const filteredAppointments = useMemo(() => {
    const { pendingAppointments, todayAppointments, appointments } =
      appointmentManager;

    const activeAppointments = appointments.filter(
      (apt) =>
        apt.status !== "completed" &&
        apt.status !== "cancelled" &&
        apt.status !== "no_show"
    );

    switch (activeTab) {
      case "pending":
        return pendingAppointments || [];
      case "confirmed":
        return appointments.filter(
          (apt) => apt.status === "confirmed" || apt.status === "rescheduled"
        );
      case "today":
        return todayAppointments || [];
      case "all":
      default:
        return activeAppointments;
    }
  }, [activeTab, appointmentManager]);

  // ✅ Status Badge Component
  const StatusBadge = ({ status }) => {
    const statusConfig = {
      pending: {
        variant: "secondary",
        className: "bg-yellow-100 text-yellow-800 border-yellow-300",
        icon: Clock,
        label: "Pending Approval",
      },
      confirmed: {
        variant: "default",
        className: "bg-blue-100 text-blue-800 border-blue-300",
        icon: CheckCircle,
        label: "Confirmed",
      },
      rescheduled: {
        variant: "secondary",
        className: "bg-purple-100 text-purple-800 border-purple-300",
        icon: RefreshCw,
        label: "Rescheduled",
      },
      completed: {
        variant: "default",
        className: "bg-green-100 text-green-800 border-green-300",
        icon: CheckCircle,
        label: "Completed",
      },
      cancelled: {
        variant: "destructive",
        className: "bg-red-100 text-red-800 border-red-300",
        icon: XCircle,
        label: "Cancelled",
      },
      no_show: {
        variant: "secondary",
        className: "bg-gray-100 text-gray-800 border-gray-300",
        icon: AlertCircle,
        label: "No Show",
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  // ✅ Patient Reliability Indicator
  const ReliabilityIndicator = ({ reliability }) => {
    if (!reliability) return null;

    const { risk_level, statistics } = reliability;
    const completionRate = statistics?.completion_rate || 0;
    const noShowCount = statistics?.no_show_count || 0;
    const totalAppointments = statistics?.total_appointments || 0;

    const riskConfig = {
      reliable: {
        icon: Shield,
        className: "bg-green-100 text-green-800 border-green-300",
        label: "Reliable Patient",
        color: "text-green-600",
      },
      low_risk: {
        icon: CheckCircle,
        className: "bg-blue-100 text-blue-800 border-blue-300",
        label: "Low Risk",
        color: "text-blue-600",
      },
      moderate_risk: {
        icon: AlertTriangle,
        className: "bg-yellow-100 text-yellow-800 border-yellow-300",
        label: "Moderate Risk",
        color: "text-yellow-600",
      },
      high_risk: {
        icon: AlertCircle,
        className: "bg-red-100 text-red-800 border-red-300",
        label: "High Risk",
        color: "text-red-600",
      },
      new_patient: {
        icon: Star,
        className: "bg-purple-100 text-purple-800 border-purple-300",
        label: "New Patient",
        color: "text-purple-600",
      },
    };

    const config = riskConfig[risk_level] || riskConfig.reliable;
    const Icon = config.icon;

    return (
      <div className="space-y-2">
        <Badge className={config.className}>
          <Icon className="w-3 h-3 mr-1" />
          {config.label} ({completionRate}%)
        </Badge>

        {/* ✅ FIXED: Show simple stats instead of recommendations */}
        {(risk_level === "moderate_risk" || risk_level === "high_risk") && (
          <div className="text-xs space-y-1 pl-2 border-l-2 border-yellow-400">
            <p className="text-muted-foreground flex items-start gap-1">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>
                {noShowCount} no-show{noShowCount !== 1 ? "s" : ""} out of{" "}
                {totalAppointments} appointments
              </span>
            </p>
            {risk_level === "high_risk" && (
              <p className="text-muted-foreground flex items-start gap-1">
                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0 text-red-500" />
                <span className="font-medium text-red-600">
                  Consider confirmation call before appointment
                </span>
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  // ✅ Appointment Card Component
  const AppointmentCard = ({ appointment }) => {
    const isPending = appointment.status === "pending";
    const isConfirmed =
      appointment.status === "confirmed" ||
      appointment.status === "rescheduled";
    const appointmentDate = new Date(appointment.appointment_date);
    const isToday =
      appointmentDate.toDateString() === new Date().toDateString();
    const isPast = appointmentDate < new Date() && !isToday;

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">
                  {appointment.patient?.name}
                </CardTitle>
                {isToday && (
                  <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                    <Bell className="w-3 h-3" />
                    Today
                  </Badge>
                )}
              </div>
              <StatusBadge status={appointment.status} />
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedAppointment(appointment)}
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Patient Reliability */}
          {appointment.patient_reliability && (
            <ReliabilityIndicator
              reliability={appointment.patient_reliability}
            />
          )}

          {/* Appointment Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                {appointmentDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{appointment.appointment_time}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Stethoscope className="w-4 h-4" />
              <span className="truncate">
                {appointment.doctor?.name || "Unassigned"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4" />
              <span className="truncate">{appointment.patient?.email}</span>
            </div>
          </div>

          {/* Services */}
          {appointment.services && appointment.services.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {appointment.services.slice(0, 3).map((service, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {service.name}
                </Badge>
              ))}
              {appointment.services.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{appointment.services.length - 3} more
                </Badge>
              )}
            </div>
          )}

          {/* Symptoms Preview */}
          {appointment.symptoms && (
            <div className="text-sm bg-muted/50 rounded p-2">
              <p className="text-muted-foreground line-clamp-2">
                <MessageSquare className="w-3 h-3 inline mr-1" />
                {appointment.symptoms}
              </p>
            </div>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-2">
            {isPending && (
              <>
                <Button
                  size="sm"
                  onClick={() =>
                    setActionModal({
                      type: "approve",
                      isOpen: true,
                      data: appointment,
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
                      data: appointment,
                    })
                  }
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-1" />
                  Reject
                </Button>
              </>
            )}

            {isConfirmed && isPast && (
              <>
                <Button
                  size="sm"
                  onClick={() =>
                    setActionModal({
                      type: "complete",
                      isOpen: true,
                      data: appointment,
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
                      data: appointment,
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
                Upcoming Appointment
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // ✅ Security Check
  if (!isStaff && !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              This page is only accessible to staff members.
            </p>
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

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">
                    {appointmentManager.stats?.pending || 0}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Confirmed</p>
                  <p className="text-2xl font-bold">
                    {appointmentManager.stats?.confirmed || 0}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">
                    {appointmentManager.stats?.completed || 0}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">
                    {appointmentManager.stats?.total || 0}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toast Notifications */}
        <AnimatePresence>
          {toast.show && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-4 right-4 z-50 max-w-md"
            >
              <Card
                className={
                  toast.type === "error" ? "border-red-500" : "border-green-500"
                }
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    {toast.type === "error" ? (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                    <p className="flex-1 text-sm">{toast.message}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setToast({ ...toast, show: false })}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs Navigation */}
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
            {/* Loading State */}
            {appointmentManager.loading && filteredAppointments.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Loading appointments...
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : filteredAppointments.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                  <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Appointments</h3>
                  <p className="text-muted-foreground text-sm">
                    {activeTab === "pending"
                      ? "No pending appointments requiring approval"
                      : `No ${activeTab} appointments at this time`}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAppointments.map((appointment, index) => (
                  <motion.div
                    key={appointment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.05, 0.5) }}
                  >
                    <AppointmentCard appointment={appointment} />
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Action Modals */}
        <Dialog open={actionModal.isOpen} onOpenChange={closeActionModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {actionModal.type === "approve" && "Approve Appointment"}
                {actionModal.type === "reject" && "Reject Appointment"}
                {actionModal.type === "complete" && "Complete Appointment"}
                {actionModal.type === "no_show" && "Mark as No Show"}
              </DialogTitle>
              <DialogDescription>
                {actionModal.data && (
                  <div className="mt-2 space-y-1 text-sm">
                    <p>
                      <strong>Patient:</strong> {actionModal.data.patient?.name}
                    </p>
                    <p>
                      <strong>Date:</strong>{" "}
                      {new Date(
                        actionModal.data.appointment_date
                      ).toLocaleDateString()}{" "}
                      at {actionModal.data.appointment_time}
                    </p>
                    <p>
                      <strong>Doctor:</strong>{" "}
                      {actionModal.data.doctor?.name || "Unassigned"}
                    </p>
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Approve Form */}
              {actionModal.type === "approve" && (
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Approval Process:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>
                            Patient will receive confirmation notification
                          </li>
                          <li>Appointment status changes to "Confirmed"</li>
                          <li>Patient reliability score will be tracked</li>
                        </ul>
                      </div>
                    </div>
                  </div>

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
                </div>
              )}

              {/* Reject Form */}
              {actionModal.type === "reject" && (
                <div className="space-y-3">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div className="text-sm text-red-800">
                        <p className="font-medium mb-1">Rejection Impact:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Patient will be notified with your reason</li>
                          <li>Appointment will be cancelled</li>
                          <li>Patient can book another appointment</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Rejection Category <span className="text-red-500">*</span>
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
                        <SelectItem value="schedule_conflict">
                          Schedule Conflict
                        </SelectItem>
                        <SelectItem value="doctor_unavailable">
                          Doctor Unavailable
                        </SelectItem>
                        <SelectItem value="capacity_full">
                          Capacity Full
                        </SelectItem>
                        <SelectItem value="other">Other Reason</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Rejection Reason <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                      value={actionForm.reason}
                      onChange={(e) =>
                        setActionForm({ ...actionForm, reason: e.target.value })
                      }
                      placeholder="Please provide a detailed reason for rejection..."
                      rows={4}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Complete Form */}
              {actionModal.type === "complete" && (
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      <div className="text-sm text-green-800">
                        <p className="font-medium mb-1">Completion Process:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Patient will be notified of completion</li>
                          <li>Feedback request will be sent automatically</li>
                          <li>Patient reliability score will improve</li>
                          <li>Appointment moves to history</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Completion Notes
                    </label>
                    <Textarea
                      value={actionForm.notes}
                      onChange={(e) =>
                        setActionForm({ ...actionForm, notes: e.target.value })
                      }
                      placeholder="Appointment summary, treatments completed, etc..."
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="followUp"
                      checked={actionForm.followUpRequired}
                      onChange={(e) =>
                        setActionForm({
                          ...actionForm,
                          followUpRequired: e.target.checked,
                        })
                      }
                      className="rounded"
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
                        placeholder="Follow-up instructions or recommendations..."
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* No Show Form */}
              {actionModal.type === "no_show" && (
                <div className="space-y-3">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div className="text-sm text-yellow-800">
                        <p className="font-medium mb-1">No-Show Impact:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>
                            Patient will be notified they missed appointment
                          </li>
                          <li>Patient reliability score will be affected</li>
                          <li>Future appointments may require confirmation</li>
                          <li>No-show policy will be applied</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Staff Notes (Optional)
                    </label>
                    <Textarea
                      value={actionForm.notes}
                      onChange={(e) =>
                        setActionForm({ ...actionForm, notes: e.target.value })
                      }
                      placeholder="Any additional context or observations..."
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeActionModal}>
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
                    {actionModal.type === "approve" && "Approve Appointment"}
                    {actionModal.type === "reject" && "Reject Appointment"}
                    {actionModal.type === "complete" && "Complete Appointment"}
                    {actionModal.type === "no_show" && "Mark No Show"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Appointment Details Modal */}
        <Dialog
          open={!!selectedAppointment}
          onOpenChange={() => setSelectedAppointment(null)}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Appointment Details</DialogTitle>
            </DialogHeader>

            {selectedAppointment && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-semibold">
                    {selectedAppointment.patient?.name}
                  </h3>
                  <StatusBadge status={selectedAppointment.status} />
                </div>

                {/* Patient Reliability Section */}
                {selectedAppointment.patient_reliability && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        Patient Reliability Assessment
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ReliabilityIndicator
                        reliability={selectedAppointment.patient_reliability}
                      />

                      {/* ✅ Stats Grid */}
                      <div className="grid grid-cols-3 gap-4 text-sm pt-3 border-t">
                        <div>
                          <p className="text-muted-foreground text-xs">
                            Completion Rate
                          </p>
                          <p className="font-semibold text-lg">
                            {
                              selectedAppointment.patient_reliability.statistics
                                ?.completion_rate
                            }
                            %
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">
                            Total Appointments
                          </p>
                          <p className="font-semibold text-lg">
                            {
                              selectedAppointment.patient_reliability.statistics
                                ?.total_appointments
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">
                            No-Shows
                          </p>
                          <p className="font-semibold text-lg text-red-600">
                            {
                              selectedAppointment.patient_reliability.statistics
                                ?.no_show_count
                            }
                          </p>
                        </div>
                      </div>

                      {/* ✅ Completed Appointments Count */}
                      {selectedAppointment.patient_reliability.statistics
                        ?.completed_count > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
                          <p className="text-green-800">
                            <CheckCircle className="w-4 h-4 inline mr-1" />
                            Successfully completed{" "}
                            {
                              selectedAppointment.patient_reliability.statistics
                                .completed_count
                            }{" "}
                            appointment(s)
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Patient Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name:</span>
                        <p className="font-medium">
                          {selectedAppointment.patient?.name}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Email:</span>
                        <p className="font-medium">
                          {selectedAppointment.patient?.email}
                        </p>
                      </div>
                      {selectedAppointment.patient?.phone && (
                        <div>
                          <span className="text-muted-foreground">Phone:</span>
                          <p className="font-medium">
                            {selectedAppointment.patient.phone}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Appointment Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Date:</span>
                        <p className="font-medium">
                          {new Date(
                            selectedAppointment.appointment_date
                          ).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Time:</span>
                        <p className="font-medium">
                          {selectedAppointment.appointment_time}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Doctor:</span>
                        <p className="font-medium">
                          {selectedAppointment.doctor?.name || "Unassigned"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Duration:</span>
                        <p className="font-medium">
                          {selectedAppointment.duration_minutes || 30} minutes
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Services */}
                {selectedAppointment.services &&
                  selectedAppointment.services.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Activity className="w-5 h-5" />
                          Services
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {selectedAppointment.services.map((service, idx) => (
                            <div
                              key={idx}
                              className="bg-muted/50 p-3 rounded-lg border"
                            >
                              <h5 className="font-medium">{service.name}</h5>
                              <div className="flex justify-between text-sm text-muted-foreground mt-1">
                                <span>{service.duration_minutes} min</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                {/* Symptoms */}
                {selectedAppointment.symptoms && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Symptoms & Concerns
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed bg-muted/50 p-4 rounded-lg border">
                        {selectedAppointment.symptoms}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Notes */}
                {selectedAppointment.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Notes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed bg-muted/50 p-4 rounded-lg border">
                        {selectedAppointment.notes}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ManageAppointments;
