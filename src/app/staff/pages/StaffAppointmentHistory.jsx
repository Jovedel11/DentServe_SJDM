import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Search,
  Archive,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  RotateCcw,
  Loader2,
  X,
  Activity,
  Eye,
  MessageSquare,
  Stethoscope,
  Shield,
} from "lucide-react";

// UI Components
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
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
import { Checkbox } from "@/core/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";

// Hooks
import { useAppointmentManagement } from "@/hooks/appointment/useAppointmentManagement";
import { useStaffArchiveManager } from "@/hooks/archived/useStaffArchivedManager";
import { useAuth } from "@/auth/context/AuthProvider";

const StaffAppointmentHistory = () => {
  const { isStaff, isAdmin } = useAuth();

  // Hooks
  const appointmentManager = useAppointmentManagement({
    includeHistory: true,
    includeStats: true,
    autoRefresh: false,
  });

  const archiveManager = useStaffArchiveManager();

  // State
  const [viewMode, setViewMode] = useState("active");
  const [filters, setFilters] = useState({ status: "all", search: "" });
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [detailsModal, setDetailsModal] = useState({
    isOpen: false,
    appointment: null,
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

  // Load archived appointments when switching view
  useEffect(() => {
    if (viewMode === "archived") {
      archiveManager.fetchArchivedAppointments();
    }
  }, [viewMode]);

  // Load appointments on mount
  useEffect(() => {
    appointmentManager.fetchAppointments();
  }, []);

  // ✅ Archive single
  const handleArchive = async (appointmentId) => {
    const result = await archiveManager.archiveAppointment(appointmentId);
    if (result.success) {
      showToast("Archived successfully");
      appointmentManager.refreshData();
      archiveManager.fetchStats();
    } else {
      showToast(result.error || "Failed to archive", "error");
    }
  };

  // ✅ Bulk archive - FIXED
  const handleBulkArchive = async () => {
    if (selectedItems.size === 0) {
      showToast("No items selected", "error");
      return;
    }

    const itemsArray = Array.from(selectedItems);
    console.log("🔄 Bulk archiving:", itemsArray);

    const result = await archiveManager.archiveAppointments(itemsArray);

    if (result.success) {
      showToast(`Archived ${itemsArray.length} appointment(s)`);
      setSelectedItems(new Set()); // Clear selection
      appointmentManager.refreshData();
      archiveManager.fetchStats();
    } else {
      showToast(result.error || "Failed to bulk archive", "error");
    }
  };

  // ✅ Unarchive
  const handleUnarchive = async (appointmentId) => {
    const result = await archiveManager.unarchiveAppointment(appointmentId);
    if (result.success) {
      showToast("Restored successfully");
      archiveManager.fetchArchivedAppointments();
      archiveManager.fetchStats();
    } else {
      showToast(result.error || "Failed to restore", "error");
    }
  };

  // Status Badge
  const StatusBadge = ({ status }) => {
    const config = {
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

    const { className, icon: Icon, label } = config[status] || config.completed;

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

        {/* Appointment Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Appointment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <strong>Date:</strong>{" "}
              {new Date(appointment.appointment_date).toLocaleDateString()}
            </div>
            <div>
              <strong>Time:</strong> {appointment.appointment_time}
            </div>
            <div>
              <strong>Doctor:</strong>{" "}
              {appointment.doctor?.name || "Unassigned"}
            </div>
            <div>
              <strong>Status:</strong>{" "}
              <StatusBadge status={appointment.status} />
            </div>
          </CardContent>
        </Card>

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

        {/* Notes */}
        {appointment.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{appointment.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Appointment Card
  const AppointmentCard = ({ appointment, isArchived }) => {
    if (!appointment) return null;

    const canArchive = ["completed", "cancelled", "no_show"].includes(
      appointment.status
    );

    return (
      <Card className="hover:shadow transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                {!isArchived && canArchive && (
                  <Checkbox
                    checked={selectedItems.has(appointment.id)}
                    onCheckedChange={() => {
                      const newSet = new Set(selectedItems);
                      if (newSet.has(appointment.id)) {
                        newSet.delete(appointment.id);
                      } else {
                        newSet.add(appointment.id);
                      }
                      setSelectedItems(newSet);
                    }}
                  />
                )}
                <div>
                  <h3 className="font-semibold">
                    {appointment.patient?.name || "Unknown"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {appointment.patient?.email}
                  </p>
                </div>
              </div>
              <StatusBadge status={appointment.status} />
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDetailsModal({ isOpen: true, appointment })}
              >
                <Eye className="w-4 h-4" />
              </Button>

              {!isArchived && canArchive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleArchive(appointment.id)}
                  disabled={archiveManager.loading}
                >
                  {archiveManager.loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Archive className="w-4 h-4" />
                  )}
                </Button>
              )}

              {isArchived && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUnarchive(appointment.id)}
                  disabled={archiveManager.loading}
                >
                  {archiveManager.loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Details */}
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {appointment.appointment_date
                ? new Date(appointment.appointment_date).toLocaleDateString()
                : "N/A"}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {appointment.appointment_time || "N/A"}
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <User className="w-4 h-4" />
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
            <div className="text-xs bg-muted/50 rounded p-2 line-clamp-2">
              <strong>Symptoms:</strong> {appointment.symptoms}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Filtered appointments
  const displayedAppointments = useMemo(() => {
    const source =
      viewMode === "active"
        ? appointmentManager.appointments.filter((apt) =>
            ["completed", "cancelled", "no_show"].includes(apt.status)
          )
        : archiveManager.archivedAppointments;

    return source.filter((apt) => {
      if (!apt) return false;
      if (filters.status !== "all" && apt.status !== filters.status)
        return false;
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const searchable = `${apt.patient?.name || ""} ${
          apt.doctor?.name || ""
        } ${apt.symptoms || ""}`.toLowerCase();
        if (!searchable.includes(search)) return false;
      }
      return true;
    });
  }, [
    viewMode,
    appointmentManager.appointments,
    archiveManager.archivedAppointments,
    filters,
  ]);

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
            <h1 className="text-3xl font-bold">
              {viewMode === "active"
                ? "Appointment History"
                : "Archived Appointments"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {viewMode === "active"
                ? `${displayedAppointments.length} archivable appointments`
                : `${archiveManager.stats.appointmentsArchived} archived`}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (viewMode === "active") {
                  appointmentManager.refreshData();
                } else {
                  archiveManager.fetchArchivedAppointments();
                }
              }}
              disabled={appointmentManager.loading || archiveManager.loading}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${
                  appointmentManager.loading || archiveManager.loading
                    ? "animate-spin"
                    : ""
                }`}
              />
              Refresh
            </Button>

            <Button
              onClick={() =>
                setViewMode(viewMode === "active" ? "archived" : "active")
              }
            >
              {viewMode === "active" ? (
                <>
                  <Archive className="w-4 h-4 mr-2" />
                  View Archives ({archiveManager.stats.appointmentsArchived})
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4 mr-2" />
                  View History
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <p className="text-sm text-muted-foreground">Cancelled</p>
              <p className="text-2xl font-bold">
                {appointmentManager.stats?.cancelled || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">Archived</p>
              <p className="text-2xl font-bold">
                {archiveManager.stats.appointmentsArchived}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">Selected</p>
              <p className="text-2xl font-bold">{selectedItems.size}</p>
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

        {/* Filters */}
        <div className="flex gap-4">
          <Input
            className="flex-1"
            placeholder="Search by patient, doctor, or symptoms..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters({ ...filters, status: value })}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="no_show">No Show</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ✅ Bulk Actions - FIXED */}
        {selectedItems.size > 0 && viewMode === "active" && (
          <Card className="border-blue-500 bg-blue-50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {selectedItems.size} item(s) selected
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedItems(new Set())}
                    size="sm"
                  >
                    Clear Selection
                  </Button>
                  <Button
                    onClick={handleBulkArchive}
                    disabled={archiveManager.loading}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {archiveManager.loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Archiving...
                      </>
                    ) : (
                      <>
                        <Archive className="w-4 h-4 mr-2" />
                        Archive Selected ({selectedItems.size})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Appointments Grid */}
        {appointmentManager.loading || archiveManager.loading ? (
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : displayedAppointments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Appointments</h3>
              <p className="text-muted-foreground text-sm">
                {viewMode === "active"
                  ? "No history appointments found"
                  : "No archived appointments found"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                isArchived={viewMode === "archived"}
              />
            ))}
          </div>
        )}

        {/* ✅ Details Modal */}
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
      </div>
    </div>
  );
};

export default StaffAppointmentHistory;
