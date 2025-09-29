import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Search,
  Filter,
  Archive,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  ArrowUpDown,
  Eye,
  ChevronLeft,
  ChevronRight,
  Download,
  MoreVertical,
  Trash2,
  RotateCcw,
  EyeOff,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Phone,
  Mail,
  FileText,
  Stethoscope,
  Shield,
  Star,
  AlertTriangle,
  Info,
  Settings,
  X,
  Loader2,
  Database,
  Activity,
  Users,
  Plus,
  Minus,
  Grid,
  List,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";

// ✅ Enhanced Shadcn UI imports
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/core/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/core/components/ui/dialog";
import { AlertMessage } from "@/core/components/ui/alert-message";
import { Separator } from "@/core/components/ui/separator";
import { Checkbox } from "@/core/components/ui/checkbox";
import { Progress } from "@/core/components/ui/progress";

// ✅ Enhanced hooks integration
import { useAppointmentManagement } from "@/hooks/appointment/useAppointmentManagement";
import { useStaffArchive } from "@/hooks/archived/useStaffArchive";
import { useAppointmentRealtime } from "@/hooks/appointment/useAppointmentRealtime";
import { useAuth } from "@/auth/context/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

const StaffAppointmentHistory = () => {
  const { isStaff, isAdmin, profile } = useAuth();

  // ✅ Enhanced hooks integration with proper database alignment
  const appointmentManager = useAppointmentManagement({
    includeHistory: true,
    includeStats: true,
    autoRefresh: true,
    defaultFilters: {
      status: null,
      dateFrom: null,
      dateTo: null,
    },
  });

  const staffArchive = useStaffArchive();

  // ✅ Real-time updates for staff operations
  const realtimeUpdates = useAppointmentRealtime({
    onAppointmentUpdate: (payload) => {
      appointmentManager.refreshData();
    },
    onAppointmentStatusChange: (payload) => {
      appointmentManager.refreshData();
    },
    enableAppointments: true,
    enableNotifications: true,
  });

  // ✅ Enhanced state management with better UX (similar to patient version)
  const [viewConfig, setViewConfig] = useState({
    mode: "table", // table | card
    showArchived: false,
    showFilters: true,
    density: "comfortable", // compact | comfortable | spacious
  });

  const [filters, setFilters] = useState({
    status: "all",
    dateFrom: "",
    dateTo: "",
    patientSearch: "",
    doctorFilter: "all",
    serviceFilter: "all",
    reliabilityFilter: "all",
    sortBy: "appointment_date",
    sortOrder: "desc",
  });

  const [pagination, setPagination] = useState({
    currentPage: 1,
    itemsPerPage: 25,
    totalPages: 1,
  });

  // ✅ FIXED: Simplified modal state (similar to patient version)
  const [expandedAppointment, setExpandedAppointment] = useState(null);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    appointment: null,
  });

  // ✅ FIXED: Action loading state (similar to patient version)
  const [actionLoading, setActionLoading] = useState({
    archiving: null,
    unarchiving: null,
    deleting: null,
    refreshing: false,
  });

  // ✅ FIXED: Toast system (similar to patient version)
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const [selectedItems, setSelectedItems] = useState(new Set());

  // Show toast helper
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 3000);
  };

  // Prevent default event behavior
  const preventDefaults = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // ✅ Enhanced clinic context
  const clinicId = useMemo(() => {
    return profile?.role_specific_data?.clinic_id;
  }, [profile]);

  // ✅ Enhanced filter handling with database alignment
  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "" || value === "all" ? null : value,
    }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  }, []);

  // ✅ Enhanced data fetching with proper RPC integration
  const loadAppointments = useCallback(
    async (options = {}) => {
      const filterParams = {
        status: filters.status === "all" ? null : filters.status,
        dateFrom: filters.dateFrom || null,
        dateTo: filters.dateTo || null,
        patientSearch: filters.patientSearch || null,
        limit: pagination.itemsPerPage,
        offset: (pagination.currentPage - 1) * pagination.itemsPerPage,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        ...options,
      };

      try {
        const result = await appointmentManager.fetchAppointments(filterParams);
        if (result.success) {
          setPagination((prev) => ({
            ...prev,
            totalPages: Math.ceil(
              (result.totalCount || 0) / pagination.itemsPerPage
            ),
          }));
        }
        return result;
      } catch (err) {
        console.error("Failed to load appointments:", err);
        return { success: false, error: err.message };
      }
    },
    [
      filters,
      pagination.currentPage,
      pagination.itemsPerPage,
      appointmentManager,
    ]
  );

  // ✅ FIXED: Archive single appointment (similar to patient version)
  const handleArchive = async (appointmentId, e = null) => {
    preventDefaults(e);

    if (actionLoading.archiving === appointmentId) return false;

    setActionLoading((prev) => ({ ...prev, archiving: appointmentId }));

    try {
      console.log("🔄 UI: Starting archive for appointment:", appointmentId);

      // Use the manage_user_archives RPC directly
      const { data, error } = await supabase.rpc("manage_user_archives", {
        p_action: "archive",
        p_item_type: "clinic_appointment",
        p_item_id: appointmentId,
        p_item_ids: null,
        p_scope_override: "clinic",
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || "Archive operation failed");
      }

      console.log("✅ UI: Archive successful");
      showToast("Appointment archived successfully");
      setExpandedAppointment(null); // Collapse expanded view

      // Refresh the appointments list
      await loadAppointments({ refresh: true });
    } catch (err) {
      console.error("❌ UI: Archive error:", err);
      showToast(err.message || "Failed to archive appointment", "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, archiving: null }));
    }

    return false;
  };

  // ✅ FIXED: Bulk archive (similar to patient version logic)
  const handleBulkArchive = async (e = null) => {
    preventDefaults(e);

    if (selectedItems.size === 0) {
      showToast("No appointments selected", "error");
      return false;
    }

    if (actionLoading.archiving) return false;

    setActionLoading((prev) => ({ ...prev, archiving: "bulk" }));

    try {
      console.log(
        "🔄 UI: Starting bulk archive for appointments:",
        Array.from(selectedItems)
      );

      // Use the manage_user_archives RPC for bulk operation
      const { data, error } = await supabase.rpc("manage_user_archives", {
        p_action: "archive",
        p_item_type: "clinic_appointment",
        p_item_id: null,
        p_item_ids: Array.from(selectedItems),
        p_scope_override: "clinic",
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || "Bulk archive operation failed");
      }

      console.log("✅ UI: Bulk archive successful");
      showToast(`Successfully archived ${selectedItems.size} appointments`);
      setSelectedItems(new Set()); // Clear selection
      setExpandedAppointment(null);

      // Refresh the appointments list
      await loadAppointments({ refresh: true });
    } catch (err) {
      console.error("❌ UI: Bulk archive error:", err);
      showToast(
        err.message || "Failed to archive selected appointments",
        "error"
      );
    } finally {
      setActionLoading((prev) => ({ ...prev, archiving: null }));
    }

    return false;
  };

  // ✅ FIXED: Unarchive handler (similar to patient version)
  const handleUnarchive = async (appointmentId, e = null) => {
    preventDefaults(e);

    if (actionLoading.unarchiving === appointmentId) return false;

    setActionLoading((prev) => ({ ...prev, unarchiving: appointmentId }));

    try {
      console.log("🔄 UI: Starting unarchive for appointment:", appointmentId);

      const { data, error } = await supabase.rpc("manage_user_archives", {
        p_action: "unarchive",
        p_item_type: "clinic_appointment",
        p_item_id: appointmentId,
        p_item_ids: null,
        p_scope_override: "clinic",
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || "Unarchive operation failed");
      }

      console.log("✅ UI: Unarchive successful");
      showToast("Appointment restored successfully");
      setExpandedAppointment(null);

      // Refresh the appointments list
      await loadAppointments({ refresh: true });
    } catch (err) {
      console.error("❌ UI: Unarchive error:", err);
      showToast(err.message || "Failed to restore appointment", "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, unarchiving: null }));
    }

    return false;
  };

  // ✅ FIXED: Delete modal handler (similar to patient version)
  const handleDeleteClick = (appointment, e = null) => {
    preventDefaults(e);
    setDeleteModal({ isOpen: true, appointment });
    return false;
  };

  // ✅ FIXED: Delete confirmation handler (similar to patient version)
  const handleDeleteConfirm = async () => {
    if (!deleteModal.appointment) return;

    const appointmentId = deleteModal.appointment.id;
    setActionLoading((prev) => ({ ...prev, deleting: appointmentId }));

    try {
      console.log("🔄 UI: Starting delete for appointment:", appointmentId);

      // For permanent deletion, use Supabase direct delete
      const { error: deleteError } = await supabase
        .from("appointments")
        .delete()
        .eq("id", appointmentId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      console.log("✅ UI: Delete successful");
      showToast("Appointment permanently deleted");
      setExpandedAppointment(null);

      // Refresh the appointments list
      await loadAppointments({ refresh: true });
    } catch (err) {
      console.error("❌ UI: Delete error:", err);
      showToast(err.message || "Failed to delete appointment", "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, deleting: null }));
      setDeleteModal({ isOpen: false, appointment: null });
    }
  };

  // ✅ FIXED: Archive view toggle (similar to patient version)
  const handleToggleArchiveView = async (e = null) => {
    preventDefaults(e);

    console.log("🔄 UI: Toggling archive view");
    setExpandedAppointment(null); // Collapse any expanded items
    setSelectedItems(new Set()); // Clear selection
    setViewConfig((prev) => ({ ...prev, showArchived: !prev.showArchived }));

    // Refresh data for the new view
    await loadAppointments({ refresh: true });
    console.log("✅ UI: Archive view toggled");

    return false;
  };

  // ✅ Manual refresh handler (similar to patient version)
  const handleManualRefresh = async (e = null) => {
    preventDefaults(e);

    if (actionLoading.refreshing) return false;

    setActionLoading((prev) => ({ ...prev, refreshing: true }));

    try {
      console.log("🔄 UI: Manual refresh triggered");
      await loadAppointments({ refresh: true });
      showToast("Data refreshed");
    } catch (err) {
      console.error("Refresh error:", err);
      showToast("Failed to refresh data", "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, refreshing: false }));
    }

    return false;
  };

  // ✅ Enhanced appointment status badge with database status alignment
  const StatusBadge = React.memo(({ status }) => {
    const statusConfig = {
      pending: {
        variant: "secondary",
        className: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: Clock,
      },
      confirmed: {
        variant: "default",
        className: "bg-blue-100 text-blue-800 border-blue-200",
        icon: CheckCircle,
      },
      completed: {
        variant: "default",
        className: "bg-green-100 text-green-800 border-green-200",
        icon: CheckCircle,
      },
      cancelled: {
        variant: "destructive",
        className: "bg-red-100 text-red-800 border-red-200",
        icon: XCircle,
      },
      no_show: {
        variant: "secondary",
        className: "bg-gray-100 text-gray-800 border-gray-200",
        icon: AlertCircle,
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
      </Badge>
    );
  });

  // ✅ Enhanced patient reliability component using database reliability data
  const PatientReliabilityIndicator = React.memo(({ reliability }) => {
    if (!reliability) return null;

    const riskLevel = reliability.risk_level;
    const completionRate = reliability.statistics?.completion_rate || 0;

    const riskConfig = {
      reliable: {
        variant: "default",
        className: "bg-green-100 text-green-800 border-green-200",
        icon: Shield,
        label: "Reliable",
      },
      low_risk: {
        variant: "secondary",
        className: "bg-blue-100 text-blue-800 border-blue-200",
        icon: CheckCircle,
        label: "Low Risk",
      },
      moderate_risk: {
        variant: "secondary",
        className: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: AlertTriangle,
        label: "Moderate Risk",
      },
      high_risk: {
        variant: "destructive",
        className: "bg-red-100 text-red-800 border-red-200",
        icon: AlertCircle,
        label: "High Risk",
      },
      new_patient: {
        variant: "secondary",
        className: "bg-purple-100 text-purple-800 border-purple-200",
        icon: Star,
        label: "New Patient",
      },
    };

    const config = riskConfig[riskLevel] || riskConfig.reliable;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label} ({completionRate}%)
      </Badge>
    );
  });

  // ✅ Enhanced appointment card with better shadcn integration (similar to patient version style)
  const AppointmentCard = React.memo(({ appointment }) => {
    const isSelected = selectedItems.has(appointment.id);

    return (
      <div className="border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
        {/* ✅ Appointment Header */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleSelection(appointment.id)}
              />

              {/* Status Badge */}
              <StatusBadge status={appointment.status} />

              {/* Appointment Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground truncate">
                  {appointment.patient?.name}
                </h4>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1 flex-shrink-0">
                    <Calendar className="w-3 h-3" />
                    {new Date(appointment.appointment_date).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }
                    )}
                  </span>
                  <span className="flex items-center gap-1 flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {appointment.appointment_time}
                  </span>
                  <span className="flex items-center gap-1 truncate">
                    <User className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">
                      {appointment.doctor?.name || "Unassigned"}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* ✅ Action Buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Archive Button - Active view only for completed appointments */}
              {!viewConfig.showArchived &&
                appointment.status === "completed" && (
                  <button
                    onClick={(e) => handleArchive(appointment.id, e)}
                    disabled={actionLoading.archiving === appointment.id}
                    className="p-2 text-muted-foreground hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50 dark:hover:bg-orange-900/20"
                    title="Archive appointment"
                  >
                    {actionLoading.archiving === appointment.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Archive className="w-4 h-4" />
                    )}
                  </button>
                )}

              {/* Unarchive & Delete Buttons - Archived view only */}
              {viewConfig.showArchived && (
                <>
                  <button
                    onClick={(e) => handleUnarchive(appointment.id, e)}
                    disabled={actionLoading.unarchiving === appointment.id}
                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                    title="Restore from archive"
                  >
                    {actionLoading.unarchiving === appointment.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RotateCcw className="w-4 h-4" />
                    )}
                  </button>
                  {isAdmin && (
                    <button
                      onClick={(e) => handleDeleteClick(appointment, e)}
                      disabled={actionLoading.deleting === appointment.id}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      title="Delete permanently"
                    >
                      {actionLoading.deleting === appointment.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </>
              )}

              {/* Expand Button */}
              <button
                onClick={() =>
                  setExpandedAppointment(
                    expandedAppointment === appointment.id
                      ? null
                      : appointment.id
                  )
                }
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                title={
                  expandedAppointment === appointment.id
                    ? "Collapse details"
                    : "Expand details"
                }
              >
                {expandedAppointment === appointment.id ? (
                  <ChevronDown className="w-5 h-5" />
                ) : (
                  <ChevronRightIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ✅ Expanded Details (similar to patient version) */}
        <AnimatePresence>
          {expandedAppointment === appointment.id && (
            <motion.div
              className="border-t border-border bg-muted/20 p-6"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Patient Details Section */}
                <div>
                  <h5 className="font-medium text-foreground mb-3 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Patient Information
                  </h5>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name: </span>
                      <span className="text-foreground font-medium">
                        {appointment.patient?.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email: </span>
                      <span className="text-foreground">
                        {appointment.patient?.email}
                      </span>
                    </div>
                    {appointment.patient?.phone && (
                      <div>
                        <span className="text-muted-foreground">Phone: </span>
                        <a
                          href={`tel:${appointment.patient.phone}`}
                          className="text-primary hover:text-primary/80 transition-colors"
                        >
                          {appointment.patient.phone}
                        </a>
                      </div>
                    )}
                    {appointment.patient_reliability && (
                      <div className="mt-3">
                        <PatientReliabilityIndicator
                          reliability={appointment.patient_reliability}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Appointment Details Section */}
                <div>
                  <h5 className="font-medium text-foreground mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Appointment Details
                  </h5>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Date: </span>
                      <span className="text-foreground font-medium">
                        {new Date(
                          appointment.appointment_date
                        ).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Time: </span>
                      <span className="text-foreground font-medium">
                        {appointment.appointment_time}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Doctor: </span>
                      <span className="text-foreground">
                        {appointment.doctor?.name || "Unassigned"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Duration: </span>
                      <span className="text-foreground">
                        {appointment.duration_minutes || 30} minutes
                      </span>
                    </div>
                  </div>
                </div>

                {/* Services & Notes Section */}
                <div>
                  <h5 className="font-medium text-foreground mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Services & Notes
                  </h5>
                  <div className="space-y-3 text-sm">
                    {appointment.services &&
                      appointment.services.length > 0 && (
                        <div>
                          <span className="text-muted-foreground font-medium">
                            Services:
                          </span>
                          <div className="mt-1 space-y-1">
                            {appointment.services.map((service, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2"
                              >
                                <span className="text-foreground">
                                  {service.name}
                                </span>
                                {service.duration_minutes && (
                                  <span className="text-xs text-muted-foreground">
                                    ({service.duration_minutes}min)
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {appointment.symptoms && (
                      <div>
                        <span className="text-muted-foreground font-medium">
                          Symptoms:
                        </span>
                        <p className="text-foreground mt-1 p-2 bg-background rounded border">
                          {appointment.symptoms}
                        </p>
                      </div>
                    )}

                    {appointment.notes && (
                      <div>
                        <span className="text-muted-foreground font-medium">
                          Notes:
                        </span>
                        <p className="text-foreground mt-1 p-2 bg-background rounded border">
                          {appointment.notes}
                        </p>
                      </div>
                    )}

                    {appointment.cancellation_reason && (
                      <div>
                        <span className="text-muted-foreground font-medium">
                          Cancellation Reason:
                        </span>
                        <p className="text-red-600 dark:text-red-400 mt-1 p-2 bg-red-50 dark:bg-red-900/10 rounded border border-red-200 dark:border-red-800">
                          {appointment.cancellation_reason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ✅ Quick Actions in Expanded View */}
              <div className="mt-6 pt-4 border-t border-border">
                <div className="flex flex-wrap gap-2">
                  {!viewConfig.showArchived &&
                    appointment.status === "completed" && (
                      <button
                        onClick={(e) => handleArchive(appointment.id, e)}
                        disabled={actionLoading.archiving === appointment.id}
                        className="flex items-center gap-2 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm disabled:opacity-50 dark:bg-orange-900/20 dark:text-orange-300"
                      >
                        {actionLoading.archiving === appointment.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Archive className="w-3 h-3" />
                        )}
                        Archive Appointment
                      </button>
                    )}

                  {viewConfig.showArchived && (
                    <>
                      <button
                        onClick={(e) => handleUnarchive(appointment.id, e)}
                        disabled={actionLoading.unarchiving === appointment.id}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm disabled:opacity-50 dark:bg-blue-900/20 dark:text-blue-300"
                      >
                        {actionLoading.unarchiving === appointment.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3 h-3" />
                        )}
                        Restore from Archive
                      </button>
                      {isAdmin && (
                        <button
                          onClick={(e) => handleDeleteClick(appointment, e)}
                          disabled={actionLoading.deleting === appointment.id}
                          className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm disabled:opacity-50 dark:bg-red-900/20 dark:text-red-300"
                        >
                          {actionLoading.deleting === appointment.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                          Delete Permanently
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  });

  // ✅ Selection management
  const toggleSelection = useCallback((appointmentId) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(appointmentId)) {
        newSet.delete(appointmentId);
      } else {
        newSet.add(appointmentId);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedItems(
      new Set(appointmentManager.appointments.map((apt) => apt.id))
    );
  }, [appointmentManager.appointments]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  // ✅ Load data on mount and filter changes
  useEffect(() => {
    if (isStaff || isAdmin) {
      loadAppointments();
    }
  }, [filters, pagination.currentPage, isStaff, isAdmin, loadAppointments]);

  // ✅ Security check
  if (!isStaff && !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <CardTitle className="mb-2">Access Denied</CardTitle>
              <CardDescription>
                This page is only accessible to staff members.
              </CardDescription>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* ✅ Enhanced Header Section (similar to patient version style) */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row justify-between items-start gap-6"
        >
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              {viewConfig.showArchived
                ? "Archived Appointments"
                : "Appointment History"}
            </h1>
            <p className="text-muted-foreground">
              {viewConfig.showArchived
                ? `${
                    staffArchive.stats?.archived_counts?.appointments || 0
                  } archived appointment${
                    (staffArchive.stats?.archived_counts?.appointments || 0) !==
                    1
                      ? "s"
                      : ""
                  }`
                : `Complete overview of your clinic's ${
                    appointmentManager.stats.total
                  } appointment${
                    appointmentManager.stats.total !== 1 ? "s" : ""
                  } and management tools`}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={actionLoading.refreshing}
              className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  actionLoading.refreshing ? "animate-spin" : ""
                }`}
              />
              {actionLoading.refreshing && (
                <span className="text-xs">Refreshing...</span>
              )}
            </button>

            {/* Archive Toggle */}
            <button
              type="button"
              onClick={handleToggleArchiveView}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                viewConfig.showArchived
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {viewConfig.showArchived ? (
                <>
                  <Eye className="w-4 h-4" />
                  <span>View Active</span>
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4" />
                  <span>
                    Archives (
                    {staffArchive.stats?.archived_counts?.appointments || 0})
                  </span>
                </>
              )}
            </button>

            {/* View Mode Toggle */}
            <button
              type="button"
              onClick={() =>
                setViewConfig((prev) => ({
                  ...prev,
                  mode: prev.mode === "table" ? "card" : "table",
                }))
              }
              className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
            >
              {viewConfig.mode === "table" ? (
                <Grid className="w-4 h-4" />
              ) : (
                <List className="w-4 h-4" />
              )}
              <span>
                {viewConfig.mode === "table" ? "Card View" : "Table View"}
              </span>
            </button>
          </div>
        </motion.div>

        {/* ✅ Enhanced Stats Overview with shadcn cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Appointments
                  </p>
                  <p className="text-2xl font-bold">
                    {appointmentManager.stats.total}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-primary" />
              </div>
              <div className="mt-2 flex items-center">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">
                  This month: {appointmentManager.stats.thisMonth}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Completed
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {appointmentManager.stats.byStatus?.completed || 0}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="mt-2">
                <span className="text-sm text-muted-foreground">
                  {appointmentManager.stats.total > 0
                    ? Math.round(
                        ((appointmentManager.stats.byStatus?.completed || 0) /
                          appointmentManager.stats.total) *
                          100
                      )
                    : 0}
                  % completion rate
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Selected
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {selectedItems.size}
                  </p>
                </div>
                <Users className="w-8 h-8 text-primary" />
              </div>
              <div className="mt-2">
                <span className="text-sm text-muted-foreground">
                  {selectedItems.size > 0
                    ? `${selectedItems.size} items selected`
                    : "No items selected"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Archive Stats
                  </p>
                  <p className="text-2xl font-bold text-purple-600">
                    {staffArchive.stats?.archived_counts?.appointments || 0}
                  </p>
                </div>
                <Archive className="w-8 h-8 text-purple-600" />
              </div>
              <div className="mt-2">
                <span className="text-sm text-muted-foreground">
                  Archived items
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ✅ Enhanced Success/Error Messages with Toast */}
        <AnimatePresence>
          {toast.show && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.95 }}
              className="fixed top-4 right-4 z-50"
            >
              <div
                className={`rounded-lg p-4 shadow-lg border max-w-md ${
                  toast.type === "error"
                    ? "bg-red-50 border-red-200 text-red-800"
                    : "bg-green-50 border-green-200 text-green-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  {toast.type === "error" ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                  <span className="font-medium">{toast.message}</span>
                  <button
                    onClick={() =>
                      setToast({ show: false, message: "", type: "success" })
                    }
                    className="ml-auto hover:opacity-70"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ✅ Enhanced Filters Panel with shadcn components */}
        <motion.div
          className="bg-card border border-border rounded-lg p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Search Input */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search appointments, patients, or symptoms..."
                  value={filters.patientSearch || ""}
                  onChange={(e) =>
                    handleFilterChange("patientSearch", e.target.value)
                  }
                  className="pl-10"
                />
                {filters.patientSearch && (
                  <button
                    onClick={() => handleFilterChange("patientSearch", "")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Controls */}
            <div className="flex gap-2 flex-wrap">
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange("status", value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no_show">No Show</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                value={filters.dateFrom || ""}
                onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                className="w-40"
                placeholder="From Date"
              />

              <Input
                type="date"
                value={filters.dateTo || ""}
                onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                className="w-40"
                placeholder="To Date"
              />

              {/* Clear Filters Button */}
              {(filters.patientSearch ||
                filters.status !== "all" ||
                filters.dateFrom ||
                filters.dateTo) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters({
                      status: "all",
                      dateFrom: "",
                      dateTo: "",
                      patientSearch: "",
                      doctorFilter: "all",
                      serviceFilter: "all",
                      reliabilityFilter: "all",
                      sortBy: "appointment_date",
                      sortOrder: "desc",
                    });
                    showToast("Filters cleared");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          <Separator className="my-6" />

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleManualRefresh}
                disabled={appointmentManager.loading}
              >
                {appointmentManager.loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>

            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Activity className="w-4 h-4" />
              <span>
                Showing {appointmentManager.appointments.length} of{" "}
                {appointmentManager.stats.total} appointments
              </span>
            </div>
          </div>
        </motion.div>

        {/* ✅ Bulk Actions with enhanced shadcn integration */}
        {selectedItems.size > 0 && !viewConfig.showArchived && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-primary">
                      {selectedItems.size} appointment
                      {selectedItems.size !== 1 ? "s" : ""} selected
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSelection}
                    >
                      Clear Selection
                    </Button>
                    <Button
                      onClick={handleBulkArchive}
                      disabled={actionLoading.archiving === "bulk"}
                    >
                      {actionLoading.archiving === "bulk" ? (
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
          </motion.div>
        )}

        {/* ✅ Main Content */}
        <Card>
          {appointmentManager.loading &&
          appointmentManager.appointments.length === 0 ? (
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                <span className="text-muted-foreground">
                  Loading appointments...
                </span>
              </div>
            </CardContent>
          ) : appointmentManager.error ? (
            <CardContent className="flex flex-col items-center justify-center h-64 text-destructive">
              <AlertCircle className="w-8 h-8 mb-3" />
              <span className="text-lg font-medium mb-2">
                Error Loading Appointments
              </span>
              <span className="text-sm">{appointmentManager.error}</span>
            </CardContent>
          ) : !appointmentManager.hasAppointments ? (
            <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Calendar className="w-12 h-12 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                No Appointments Found
              </h3>
              <p className="text-center text-sm">
                {Object.values(filters).some((v) => v && v !== "all")
                  ? "Try adjusting your filters to see more results."
                  : "No appointment history available yet."}
              </p>
            </CardContent>
          ) : (
            <>
              {/* Selection Controls */}
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={
                        selectedItems.size ===
                          appointmentManager.appointments.length &&
                        appointmentManager.appointments.length > 0
                      }
                      onCheckedChange={
                        selectedItems.size ===
                        appointmentManager.appointments.length
                          ? clearSelection
                          : selectAll
                      }
                    />
                    <span className="text-sm">
                      {selectedItems.size ===
                        appointmentManager.appointments.length &&
                      appointmentManager.appointments.length > 0
                        ? "Deselect All"
                        : "Select All"}
                    </span>
                  </div>

                  <div className="flex items-center space-x-4">
                    <Select
                      value={filters.sortBy}
                      onValueChange={(value) =>
                        handleFilterChange("sortBy", value)
                      }
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="appointment_date">
                          Sort by Date
                        </SelectItem>
                        <SelectItem value="patient_name">
                          Sort by Patient
                        </SelectItem>
                        <SelectItem value="status">Sort by Status</SelectItem>
                        <SelectItem value="created_at">
                          Sort by Created
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleFilterChange(
                          "sortOrder",
                          filters.sortOrder === "desc" ? "asc" : "desc"
                        )
                      }
                    >
                      {filters.sortOrder === "desc" ? (
                        <TrendingDown className="w-4 h-4" />
                      ) : (
                        <TrendingUp className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Appointments List */}
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-foreground">
                      {viewConfig.showArchived ? "Archived" : "Active"}{" "}
                      Appointments
                    </h3>
                    <span className="text-sm text-muted-foreground">
                      {appointmentManager.appointments.length} of{" "}
                      {viewConfig.showArchived
                        ? staffArchive.stats?.archived_counts?.appointments || 0
                        : appointmentManager.stats.total}{" "}
                      records
                      {filters.patientSearch &&
                        ` matching "${filters.patientSearch}"`}
                    </span>
                  </div>

                  {/* Appointment Cards */}
                  {appointmentManager.appointments.length === 0 ? (
                    <motion.div
                      className="text-center py-12"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="p-4 bg-muted/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <Calendar className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h4 className="text-lg font-medium text-foreground mb-2">
                        {viewConfig.showArchived
                          ? "No archived appointments"
                          : filters.patientSearch ||
                            filters.status !== "all" ||
                            filters.dateFrom ||
                            filters.dateTo
                          ? "No appointments match your filters"
                          : "No appointments found"}
                      </h4>
                      <p className="text-muted-foreground mb-4">
                        {viewConfig.showArchived
                          ? "Completed appointments you archive will appear here"
                          : filters.patientSearch ||
                            filters.status !== "all" ||
                            filters.dateFrom ||
                            filters.dateTo
                          ? "Try adjusting your search criteria or filters"
                          : "Your appointment history will appear here once you have appointments"}
                      </p>
                    </motion.div>
                  ) : (
                    <div className="space-y-4">
                      {appointmentManager.appointments.map(
                        (appointment, index) => (
                          <motion.div
                            key={`${appointment.id}-${
                              viewConfig.showArchived ? "archived" : "active"
                            }`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(index * 0.05, 0.5) }}
                          >
                            <AppointmentCard appointment={appointment} />
                          </motion.div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>

      {/* ✅ FIXED: Delete Confirmation Modal with proper Dialog */}
      <Dialog
        open={deleteModal.isOpen}
        onOpenChange={(open) =>
          !open && setDeleteModal({ isOpen: false, appointment: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Delete Appointment Permanently
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this appointment? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteModal.appointment && (
            <div className="py-4">
              <div className="text-sm space-y-2">
                <p>
                  <strong>Patient:</strong>{" "}
                  {deleteModal.appointment.patient?.name}
                </p>
                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(
                    deleteModal.appointment.appointment_date
                  ).toLocaleDateString()}
                </p>
                <p>
                  <strong>Time:</strong>{" "}
                  {deleteModal.appointment.appointment_time}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setDeleteModal({ isOpen: false, appointment: null })
              }
              disabled={actionLoading.deleting === deleteModal.appointment?.id}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={actionLoading.deleting === deleteModal.appointment?.id}
            >
              {actionLoading.deleting === deleteModal.appointment?.id ? (
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
  );
};

export default StaffAppointmentHistory;
