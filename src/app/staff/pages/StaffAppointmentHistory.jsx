import React, { useState, useEffect, useMemo } from "react";
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
  Trash2,
  Loader2,
  X,
  Info,
  Activity,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/core/components/ui/dialog";
import { Checkbox } from "@/core/components/ui/checkbox";

// Hooks
import { useAppointmentManagement } from "@/hooks/appointment/useAppointmentManagement";
import { useStaffArchiveManager } from "@/hooks/archived/useStaffArchivedManager";
import { useAuth } from "@/auth/context/AuthProvider";

const StaffAppointmentHistory = () => {
  const { isStaff, isAdmin } = useAuth();

  // ✅ Hooks - Load ALL appointments including history
  const appointmentManager = useAppointmentManagement({
    includeHistory: true, // Critical: Load completed/cancelled/no_show
    includeStats: true,
    autoRefresh: false, // Don't auto-refresh on history page
  });

  const archiveManager = useStaffArchiveManager();

  // ✅ State
  const [viewMode, setViewMode] = useState("active"); // active | archived
  const [filters, setFilters] = useState({
    status: "all",
    search: "",
  });

  const [selectedItems, setSelectedItems] = useState(new Set());
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });

  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // ✅ Toast helper
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 3000);
  };

  // ✅ Load archived appointments when switching to archived view
  useEffect(() => {
    if (viewMode === "archived") {
      console.log("📦 Loading archived appointments...");
      archiveManager.fetchArchivedAppointments();
    }
  }, [viewMode]);

  // ✅ Load appointments on mount
  useEffect(() => {
    console.log("🔄 Loading appointment history...");
    appointmentManager.fetchAppointments();
  }, []);

  // ✅ Archive single appointment
  const handleArchive = async (appointmentId) => {
    const result = await archiveManager.archiveAppointment(appointmentId);

    if (result.success) {
      showToast("Appointment archived successfully");
      appointmentManager.refreshData();
      archiveManager.fetchStats();
    } else {
      showToast(result.error || "Failed to archive", "error");
    }
  };

  // ✅ Bulk archive
  const handleBulkArchive = async () => {
    if (selectedItems.size === 0) {
      showToast("No items selected", "error");
      return;
    }

    const result = await archiveManager.archiveAppointments(
      Array.from(selectedItems)
    );

    if (result.success) {
      showToast(`Archived ${result.count} appointments`);
      setSelectedItems(new Set());
      appointmentManager.refreshData();
      archiveManager.fetchStats();
    } else {
      showToast(result.error || "Failed to archive", "error");
    }
  };

  // ✅ Unarchive
  const handleUnarchive = async (appointmentId) => {
    const result = await archiveManager.unarchiveAppointment(appointmentId);

    if (result.success) {
      showToast("Appointment restored successfully");
    } else {
      showToast(result.error || "Failed to restore", "error");
    }
  };

  // ✅ Delete (admin only)
  const handleDelete = async () => {
    if (!deleteModal.item) return;

    const result = await archiveManager.deleteAppointment(deleteModal.item.id);

    if (result.success) {
      showToast("Appointment permanently deleted");
      setDeleteModal({ isOpen: false, item: null });
    } else {
      showToast(result.error || "Failed to delete", "error");
    }
  };

  // ✅ Status badge component
  const StatusBadge = ({ status }) => {
    if (!status) return <Badge variant="secondary">Unknown</Badge>;

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

  // ✅ Appointment card with services
  const AppointmentCard = ({ appointment, isArchived }) => {
    if (!appointment) return null;

    const canBeArchived = ["completed", "cancelled", "no_show"].includes(
      appointment.status
    );

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                {!isArchived && canBeArchived && (
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
                  <CardTitle className="text-base">
                    {appointment.patient?.name || "Unknown Patient"}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {appointment.patient?.email}
                  </p>
                </div>
              </div>
              <StatusBadge status={appointment.status} />
            </div>

            <div className="flex items-center gap-1">
              {!isArchived && canBeArchived && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleArchive(appointment.id)}
                  disabled={archiveManager.loading}
                  title="Archive appointment"
                >
                  {archiveManager.loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Archive className="w-4 h-4" />
                  )}
                </Button>
              )}

              {isArchived && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnarchive(appointment.id)}
                    disabled={archiveManager.loading}
                    title="Restore"
                  >
                    {archiveManager.loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RotateCcw className="w-4 h-4" />
                    )}
                  </Button>
                  {archiveManager.canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setDeleteModal({ isOpen: true, item: appointment })
                      }
                      disabled={archiveManager.loading}
                      title="Delete permanently"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Appointment details */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {appointment.appointment_date
                ? new Date(appointment.appointment_date).toLocaleDateString()
                : "N/A"}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              {appointment.appointment_time || "N/A"}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground col-span-2">
              <User className="w-4 h-4" />
              <span className="truncate">
                {appointment.doctor?.name || "Unassigned"}
              </span>
            </div>
          </div>

          {/* ✅ Services section */}
          {appointment.services && appointment.services.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Activity className="w-3 h-3" />
                <span>Services:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {appointment.services.map((service, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {service.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Symptoms preview */}
          {appointment.symptoms && (
            <div className="text-xs bg-muted/50 rounded p-2 line-clamp-2">
              <strong>Symptoms:</strong> {appointment.symptoms}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ✅ Filtered appointments - ONLY show completed/cancelled/no_show
  const displayedAppointments = useMemo(() => {
    const source =
      viewMode === "active"
        ? appointmentManager.appointments.filter((apt) =>
            ["completed", "cancelled", "no_show"].includes(apt.status)
          )
        : archiveManager.archivedAppointments;

    console.log("📊 Source appointments:", source.length);

    return source.filter((apt) => {
      if (!apt) return false;

      // Status filter
      if (filters.status !== "all" && apt.status !== filters.status) {
        return false;
      }

      // Search filter
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const searchable = `${apt.patient?.name || ""} ${apt.doctor?.name || ""} ${apt.symptoms || ""}`.toLowerCase();
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

  // ✅ Count archivable appointments
  const archivableCount = useMemo(() => {
    return appointmentManager.appointments.filter((apt) =>
      ["completed", "cancelled", "no_show"].includes(apt.status)
    ).length;
  }, [appointmentManager.appointments]);

  // ✅ Security check
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
            <h1 className="text-3xl font-bold">
              {viewMode === "active"
                ? "Appointment History"
                : "Archived Appointments"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {viewMode === "active"
                ? `${archivableCount} archivable appointments`
                : `${archiveManager.stats.appointmentsArchived} archived`}
            </p>
          </div>

          <div className="flex items-center gap-2">
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
              onClick={() => {
                setViewMode(viewMode === "active" ? "archived" : "active");
                setSelectedItems(new Set());
              }}
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

        {/* Info Banner */}
        {viewMode === "active" && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Archivable Appointments</p>
                  <p>
                    Only <strong>Completed</strong>, <strong>Cancelled</strong>,
                    or <strong>No Show</strong> appointments can be archived.
                    Pending and Confirmed are in Manage Appointments.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">
                    {appointmentManager.stats?.completed || 0}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cancelled</p>
                  <p className="text-2xl font-bold">
                    {appointmentManager.stats?.cancelled || 0}
                  </p>
                </div>
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Archived</p>
                  <p className="text-2xl font-bold">
                    {archiveManager.stats.appointmentsArchived}
                  </p>
                </div>
                <Archive className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Selected</p>
                  <p className="text-2xl font-bold">{selectedItems.size}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toast Notification */}
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
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
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
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by patient, doctor, or symptoms..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                  icon={<Search className="w-4 h-4" />}
                />
              </div>

              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters({ ...filters, status: value })
                }
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
          </CardContent>
        </Card>

        {/* Bulk Actions Bar */}
        {selectedItems.size > 0 && viewMode === "active" && (
          <Card className="border-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {selectedItems.size} item{selectedItems.size !== 1 ? "s" : ""}{" "}
                  selected
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedItems(new Set())}
                  >
                    Clear
                  </Button>
                  <Button
                    onClick={handleBulkArchive}
                    disabled={archiveManager.loading}
                  >
                    {archiveManager.loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Archiving...
                      </>
                    ) : (
                      <>
                        <Archive className="w-4 h-4 mr-2" />
                        Archive Selected
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
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading appointments...</p>
              </div>
            </CardContent>
          </Card>
        ) : displayedAppointments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Appointments Found</h3>
              <p className="text-muted-foreground text-sm text-center">
                {viewMode === "active"
                  ? "No history appointments match your filters"
                  : "No archived appointments found"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedAppointments.map((appointment) => (
              <motion.div
                key={appointment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AppointmentCard
                  appointment={appointment}
                  isArchived={viewMode === "archived"}
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <Dialog
          open={deleteModal.isOpen}
          onOpenChange={() => setDeleteModal({ isOpen: false, item: null })}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Appointment Permanently</DialogTitle>
              <DialogDescription>
                This action cannot be undone. The appointment will be permanently
                deleted from the database.
              </DialogDescription>
            </DialogHeader>

            {deleteModal.item && (
              <div className="py-4 text-sm space-y-2">
                <p>
                  <strong>Patient:</strong>{" "}
                  {deleteModal.item.patient?.name || "Unknown"}
                </p>
                <p>
                  <strong>Date:</strong>{" "}
                  {deleteModal.item.appointment_date
                    ? new Date(
                        deleteModal.item.appointment_date
                      ).toLocaleDateString()
                    : "N/A"}
                </p>
                <p>
                  <strong>Time:</strong>{" "}
                  {deleteModal.item.appointment_time || "N/A"}
                </p>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteModal({ isOpen: false, item: null })}
                disabled={archiveManager.loading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={archiveManager.loading}
              >
                {archiveManager.loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Permanently
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

export default StaffAppointmentHistory;