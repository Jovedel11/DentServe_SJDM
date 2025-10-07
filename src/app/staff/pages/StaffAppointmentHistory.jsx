import React, { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
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
  Archive,
  Trash2,
  Download,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Heart,
  MapPin,
  Mail,
  Phone,
  FileText,
  AlertTriangle,
} from "lucide-react";

// Charts
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/core/components/ui/chart";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

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
  DialogDescription,
  DialogFooter,
} from "@/core/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/core/components/ui/alert";
import { Separator } from "@/core/components/ui/separator";

// Hooks
import { useAppointmentManagement } from "@/hooks/appointment/useAppointmentManagement";
import { useStaffArchiveManager } from "@/hooks/archived/useStaffArchivedManager";
import { useAuth } from "@/auth/context/AuthProvider";

const StaffAppointmentHistory = () => {
  const { user, isStaff, isAdmin, profile } = useAuth();

  // Hooks
  const appointmentManager = useAppointmentManagement({
    includeHistory: true,
    includeStats: true,
    autoRefresh: false,
  });

  const archiveManager = useStaffArchiveManager();

  // State
  const [viewMode, setViewMode] = useState("active"); // active | archived
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [expandedAppointment, setExpandedAppointment] = useState(null);
  const [detailsModal, setDetailsModal] = useState({
    isOpen: false,
    appointment: null,
  });
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    appointment: null,
  });
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [actionLoading, setActionLoading] = useState({
    archiving: null,
    unarchiving: null,
    deleting: null,
    refreshing: false,
    bulkArchiving: false,
  });

  // Toast helper
  const showToast = useCallback((message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(
      () => setToast({ show: false, message: "", type: "success" }),
      4000
    );
  }, []);

  // Load data on mount and view change
  useEffect(() => {
    if (viewMode === "active") {
      appointmentManager.fetchAppointments({ status: null });
    } else {
      archiveManager.fetchArchivedAppointments();
    }
  }, [viewMode]);

  // Prevent default event behavior
  const preventDefaults = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Archive single
  const handleArchive = async (appointmentId, e = null) => {
    preventDefaults(e);

    if (actionLoading.archiving === appointmentId) return;

    setActionLoading((prev) => ({ ...prev, archiving: appointmentId }));

    try {
      console.log("🔄 Staff: Archiving appointment:", appointmentId);

      const result = await archiveManager.archiveAppointment(appointmentId);

      if (result.success) {
        console.log("✅ Staff: Archive successful");
        showToast("Appointment archived successfully");
        appointmentManager.refreshData();
        archiveManager.fetchStats();
        setExpandedAppointment(null);
      } else {
        console.error("❌ Staff: Archive failed:", result.error);
        showToast(result.error || "Failed to archive appointment", "error");
      }
    } catch (err) {
      console.error("❌ Staff: Archive error:", err);
      showToast("Failed to archive appointment", "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, archiving: null }));
    }
  };

  // Bulk archive
  const handleBulkArchive = async (e = null) => {
    preventDefaults(e);

    if (selectedItems.size === 0 || actionLoading.bulkArchiving) return;

    setActionLoading((prev) => ({ ...prev, bulkArchiving: true }));

    try {
      const itemsArray = Array.from(selectedItems);
      console.log("🔄 Staff: Bulk archiving:", itemsArray);

      const result = await archiveManager.archiveAppointments(itemsArray);

      if (result.success) {
        console.log("✅ Staff: Bulk archive successful");
        showToast(
          `Successfully archived ${
            result.count || itemsArray.length
          } appointment(s)`,
          "success"
        );
        setSelectedItems(new Set());
        appointmentManager.refreshData();
        archiveManager.fetchStats();
      } else {
        console.error("❌ Staff: Bulk archive failed:", result.error);
        showToast(result.error || "Failed to archive appointments", "error");
      }
    } catch (err) {
      console.error("❌ Staff: Bulk archive error:", err);
      showToast("Failed to archive appointments", "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, bulkArchiving: false }));
    }
  };

  // Unarchive
  const handleUnarchive = async (appointmentId, e = null) => {
    preventDefaults(e);

    if (actionLoading.unarchiving === appointmentId) return;

    setActionLoading((prev) => ({ ...prev, unarchiving: appointmentId }));

    try {
      console.log("🔄 Staff: Unarchiving appointment:", appointmentId);

      const result = await archiveManager.unarchiveAppointment(appointmentId);

      if (result.success) {
        console.log("✅ Staff: Unarchive successful");
        showToast("Appointment restored successfully");
        archiveManager.fetchArchivedAppointments();
        archiveManager.fetchStats();
        setExpandedAppointment(null);
      } else {
        console.error("❌ Staff: Unarchive failed:", result.error);
        showToast(result.error || "Failed to restore appointment", "error");
      }
    } catch (err) {
      console.error("❌ Staff: Unarchive error:", err);
      showToast("Failed to restore appointment", "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, unarchiving: null }));
    }
  };

  // Delete modal handler
  const handleDeleteClick = (appointment, e = null) => {
    preventDefaults(e);
    setDeleteModal({ isOpen: true, appointment });
  };

  // Delete confirmation handler
  const handleDeleteConfirm = async () => {
    if (!deleteModal.appointment) return;

    const appointmentId = deleteModal.appointment.id;
    setActionLoading((prev) => ({ ...prev, deleting: appointmentId }));

    try {
      console.log("🔄 Staff: Deleting appointment:", appointmentId);

      const result = await archiveManager.deleteArchivedAppointment(
        appointmentId
      );

      if (result.success) {
        console.log("✅ Staff: Delete successful");
        showToast("Appointment permanently deleted");
        archiveManager.fetchArchivedAppointments();
        archiveManager.fetchStats();
        setExpandedAppointment(null);
      } else {
        console.error("❌ Staff: Delete failed:", result.error);
        showToast(result.error || "Failed to delete appointment", "error");
      }
    } catch (err) {
      console.error("❌ Staff: Delete error:", err);
      showToast("Failed to delete appointment", "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, deleting: null }));
      setDeleteModal({ isOpen: false, appointment: null });
    }
  };

  // Archive view toggle
  const handleToggleArchiveView = async (e = null) => {
    preventDefaults(e);
    console.log("🔄 Staff: Toggling archive view");
    setExpandedAppointment(null);
    setSelectedItems(new Set());
    setViewMode((prev) => (prev === "active" ? "archived" : "active"));
    console.log("✅ Staff: Archive view toggled");
  };

  // Download handler
  const handleDownload = (appointment, e = null) => {
    preventDefaults(e);

    try {
      const details = `
APPOINTMENT DETAILS (STAFF VIEW)
================================
Patient: ${appointment.patient?.name || "N/A"}
Email: ${appointment.patient?.email || "N/A"}
Phone: ${appointment.patient?.phone || "N/A"}

Appointment Information:
-----------------------
Date: ${new Date(appointment.appointment_date).toLocaleDateString()}
Time: ${appointment.appointment_time}
Status: ${appointment.status}
Doctor: ${appointment.doctor?.name || "N/A"}
Duration: ${appointment.duration_minutes || 30} minutes
Booking Type: ${appointment.booking_type || "N/A"}

Services:
---------
${
  appointment.services
    ?.map((s, i) => `${i + 1}. ${s.name} (${s.duration_minutes} min)`)
    .join("\n") || "No services"
}

Symptoms: ${appointment.symptoms || "None"}
Notes: ${appointment.notes || "None"}
${
  appointment.cancellation_reason
    ? `Cancellation Reason: ${appointment.cancellation_reason}`
    : ""
}

Clinic: ${profile?.clinic?.name || "N/A"}
Created: ${new Date(appointment.created_at).toLocaleString()}
      `.trim();

      const blob = new Blob([details], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `staff-appointment-${appointment.id}-details.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast("Appointment details downloaded");
    } catch (err) {
      console.error("Download error:", err);
      showToast("Failed to download appointment details", "error");
    }
  };

  // Download all report
  const handleDownloadAllReport = (e = null) => {
    preventDefaults(e);

    try {
      const allAppointments =
        viewMode === "active"
          ? filteredAppointments
          : archiveManager.archivedAppointments;

      const reportData = `
STAFF APPOINTMENT HISTORY REPORT
================================
Generated: ${new Date().toLocaleString()}
Clinic: ${profile?.clinic?.name || "N/A"}
Staff: ${profile?.first_name} ${profile?.last_name}

SUMMARY
-------
Total Appointments: ${allAppointments.length}
View Mode: ${viewMode === "active" ? "Active History" : "Archived"}

APPOINTMENTS
------------
${allAppointments
  .map(
    (apt, idx) => `
${idx + 1}. Patient: ${apt.patient?.name || "Unknown"}
   Date: ${new Date(apt.appointment_date).toLocaleDateString()}
   Time: ${apt.appointment_time}
   Status: ${apt.status}
   Doctor: ${apt.doctor?.name || "N/A"}
   ${apt.isArchived ? "[ARCHIVED]" : ""}
`
  )
  .join("\n")}
      `.trim();

      const blob = new Blob([reportData], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `staff-appointment-history-${
        new Date().toISOString().split("T")[0]
      }.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast("Complete report downloaded");
    } catch (err) {
      console.error("Download report error:", err);
      showToast("Failed to download report", "error");
    }
  };

  // Manual refresh
  const handleManualRefresh = async (e = null) => {
    preventDefaults(e);

    if (actionLoading.refreshing) return;

    setActionLoading((prev) => ({ ...prev, refreshing: true }));

    try {
      console.log("🔄 Staff: Manual refresh triggered");
      if (viewMode === "active") {
        await appointmentManager.fetchAppointments({ status: null });
      } else {
        await archiveManager.fetchArchivedAppointments();
      }
      showToast("Data refreshed");
    } catch (err) {
      console.error("Refresh error:", err);
      showToast("Failed to refresh data", "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, refreshing: false }));
    }
  };

  // Selection helpers
  const toggleSelectItem = useCallback((id) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const toggleSelectAll = useCallback(
    (appointments) => {
      const archivableIds = appointments
        .filter((apt) =>
          ["completed", "cancelled", "no_show"].includes(apt.status)
        )
        .map((apt) => apt.id);

      const allSelected = archivableIds.every((id) => selectedItems.has(id));

      if (allSelected) {
        setSelectedItems(new Set());
      } else {
        setSelectedItems(new Set(archivableIds));
      }
    },
    [selectedItems]
  );

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    const source =
      viewMode === "active"
        ? appointmentManager.appointments.filter((apt) =>
            ["completed", "cancelled", "no_show"].includes(apt.status)
          )
        : archiveManager.archivedAppointments;

    let filtered = source.filter((apt) => apt !== null && apt !== undefined);

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((apt) => apt.status === statusFilter);
    }

    // Date range filter
    if (dateRange !== "all") {
      const now = new Date();
      const days = parseInt(dateRange);
      const cutoffDate = new Date(now.setDate(now.getDate() - days));

      filtered = filtered.filter(
        (apt) => new Date(apt.appointment_date) >= cutoffDate
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((apt) => {
        const searchable = `${apt.patient?.name || ""} ${
          apt.patient?.email || ""
        } ${apt.doctor?.name || ""} ${apt.symptoms || ""} ${
          apt.notes || ""
        }`.toLowerCase();
        return searchable.includes(query);
      });
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => {
      const dateA = new Date(`${a.appointment_date}T${a.appointment_time}`);
      const dateB = new Date(`${b.appointment_date}T${b.appointment_time}`);
      return dateB - dateA;
    });
  }, [
    viewMode,
    appointmentManager.appointments,
    archiveManager.archivedAppointments,
    statusFilter,
    dateRange,
    searchQuery,
  ]);

  // Computed stats
  const stats = useMemo(() => {
    const completed = appointmentManager.appointments.filter(
      (a) => a.status === "completed"
    ).length;
    const cancelled = appointmentManager.appointments.filter(
      (a) => a.status === "cancelled"
    ).length;
    const noShow = appointmentManager.appointments.filter(
      (a) => a.status === "no_show"
    ).length;
    const archived = archiveManager.stats.appointmentsArchived || 0;
    const totalHistory = completed + cancelled + noShow;
    const canArchive = filteredAppointments.filter((apt) =>
      ["completed", "cancelled", "no_show"].includes(apt.status)
    ).length;

    return {
      completed,
      cancelled,
      noShow,
      archived,
      totalHistory,
      canArchive,
      selected: selectedItems.size,
    };
  }, [
    appointmentManager.appointments,
    archiveManager.stats,
    filteredAppointments,
    selectedItems,
  ]);

  // Chart data
  const chartData = useMemo(() => {
    if (!stats.totalHistory) {
      return { statusData: [], monthlyData: [] };
    }

    try {
      // Status distribution
      const statusData = [
        { name: "Completed", value: stats.completed, color: "#10b981" },
        { name: "Cancelled", value: stats.cancelled, color: "#f59e0b" },
        { name: "No Show", value: stats.noShow, color: "#ef4444" },
      ].filter((item) => item.value > 0);

      // Monthly trends (last 6 months)
      const monthlyData = {};
      const allAppts = [
        ...appointmentManager.appointments,
        ...archiveManager.archivedAppointments,
      ];

      allAppts.forEach((apt) => {
        const month = new Date(apt.appointment_date).toISOString().substr(0, 7);
        if (!monthlyData[month]) {
          monthlyData[month] = { completed: 0, cancelled: 0, noShow: 0 };
        }
        if (apt.status === "completed") monthlyData[month].completed++;
        if (apt.status === "cancelled") monthlyData[month].cancelled++;
        if (apt.status === "no_show") monthlyData[month].noShow++;
      });

      const monthlyTrendsData = Object.entries(monthlyData)
        .slice(-6)
        .map(([month, data]) => ({
          month: new Date(month + "-01").toLocaleDateString("en", {
            month: "short",
            year: "2-digit",
          }),
          ...data,
        }));

      return { statusData, monthlyData: monthlyTrendsData };
    } catch (err) {
      console.error("Chart data error:", err);
      return { statusData: [], monthlyData: [] };
    }
  }, [
    appointmentManager.appointments,
    archiveManager.archivedAppointments,
    stats,
  ]);

  // Status styling helpers
  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-50 border-green-200";
      case "cancelled":
        return "text-amber-600 bg-amber-50 border-amber-200";
      case "no_show":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "cancelled":
        return <XCircle className="w-4 h-4" />;
      case "no_show":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // Appointment Details Modal Content
  const AppointmentDetails = ({ appointment }) => {
    const reliability = appointment.patient_reliability;
    const patientInfo = appointment.patient;

    return (
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        {/* Patient Reliability Warning */}
        {reliability && reliability.risk_level !== "reliable" && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="font-semibold">
              {reliability.risk_level === "high_risk"
                ? "⚠️ High Risk Patient"
                : "⚠️ Moderate Risk Patient"}
            </AlertTitle>
            <AlertDescription className="text-xs mt-2">
              <div className="flex items-center gap-4">
                <span>
                  Completion Rate:{" "}
                  <strong>
                    {reliability.statistics?.completion_rate || 0}%
                  </strong>
                </span>
                <span>
                  No-Shows:{" "}
                  <strong className="text-red-600">
                    {reliability.statistics?.no_show_count || 0}
                  </strong>
                </span>
              </div>
            </AlertDescription>
          </Alert>
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
                Services Provided
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
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {service.duration_minutes} min
                      </span>
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

        {/* Notes */}
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

        {/* Cancellation Reason */}
        {appointment.cancellation_reason && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-red-600">
                <XCircle className="w-4 h-4" />
                Cancellation Reason
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm bg-red-50 p-3 rounded-lg border border-red-200 text-red-700">
                {appointment.cancellation_reason}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Patient Reliability Score */}
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

  // Delete Confirmation Modal
  const DeleteConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    appointment,
    loading,
  }) => (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <Trash2 className="w-5 h-5" />
            Delete Permanently?
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. The appointment will be permanently
            deleted from the system.
          </DialogDescription>
        </DialogHeader>

        {appointment && (
          <div className="py-4 space-y-3">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                You are about to permanently delete this appointment:
                <div className="mt-2 font-semibold">
                  Patient: {appointment.patient?.name}
                  <br />
                  Date:{" "}
                  {new Date(appointment.appointment_date).toLocaleDateString()}
                  <br />
                  Time: {appointment.appointment_time}
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
  );

  // Security check
  if (!user || (!isStaff && !isAdmin)) {
    return (
      <div className="min-h-screen p-6 bg-background flex items-center justify-center">
        <motion.div
          className="text-center max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="p-4 bg-red-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Access Denied
          </h1>
          <p className="text-muted-foreground">
            Only staff members can view this page.
          </p>
        </motion.div>
      </div>
    );
  }

  // Loading state
  if (
    (appointmentManager.loading && !appointmentManager.appointments.length) ||
    (archiveManager.loading &&
      !archiveManager.archivedAppointments.length &&
      viewMode === "archived")
  ) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            Loading appointment history...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row justify-between items-start gap-6"
        >
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              {viewMode === "archived"
                ? "Archived Appointments"
                : "Appointment History"}
            </h1>
            <p className="text-muted-foreground">
              {viewMode === "archived"
                ? `${stats.archived} archived appointment${
                    stats.archived !== 1 ? "s" : ""
                  }`
                : `Manage your ${stats.totalHistory} historical appointment${
                    stats.totalHistory !== 1 ? "s" : ""
                  }`}
            </p>
            {/* Selection info */}
            {selectedItems.size > 0 && viewMode === "active" && (
              <p className="text-sm text-primary font-medium">
                {stats.selected} selected
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Bulk Actions - Only show when items are selected */}
            {selectedItems.size > 0 && viewMode === "active" && (
              <>
                <Button
                  type="button"
                  onClick={handleBulkArchive}
                  disabled={actionLoading.bulkArchiving}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {actionLoading.bulkArchiving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Archiving...
                    </>
                  ) : (
                    <>
                      <Archive className="w-4 h-4 mr-2" />
                      Archive Selected ({stats.selected})
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearSelection}
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              </>
            )}

            {/* Refresh Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleManualRefresh}
              disabled={actionLoading.refreshing}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${
                  actionLoading.refreshing ? "animate-spin" : ""
                }`}
              />
              {actionLoading.refreshing ? "Refreshing..." : "Refresh"}
            </Button>

            {/* Archive Toggle */}
            <Button
              type="button"
              onClick={handleToggleArchiveView}
              className={
                viewMode === "archived"
                  ? "bg-primary"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }
            >
              {viewMode === "archived" ? (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  View Active
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4 mr-2" />
                  Archives ({stats.archived})
                </>
              )}
            </Button>

            {/* Download Button */}
            <Button
              type="button"
              variant="secondary"
              onClick={handleDownloadAllReport}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </Button>
          </div>
        </motion.div>

        {/* Analytics Cards - Only for Active View */}
        {viewMode === "active" && (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {/* Completed Card */}
            <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-foreground">
                  {stats.completed}
                </h3>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>

            {/* Cancelled Card */}
            <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <XCircle className="w-5 h-5 text-amber-600" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-foreground">
                  {stats.cancelled}
                </h3>
                <p className="text-sm text-muted-foreground">Cancelled</p>
              </div>
            </div>

            {/* No Show Card */}
            <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-foreground">
                  {stats.noShow}
                </h3>
                <p className="text-sm text-muted-foreground">No Shows</p>
              </div>
            </div>

            {/* Archived Card */}
            <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Archive className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-foreground">
                  {stats.archived}
                </h3>
                <p className="text-sm text-muted-foreground">Archived</p>
                <p className="text-xs text-muted-foreground">
                  {stats.canArchive} can be archived
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Charts Section - Only for Active View with Data */}
        {viewMode === "active" && chartData.statusData.length > 0 && (
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Status Distribution Chart */}
            <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Appointment Status Distribution
                </h3>
                <p className="text-sm text-muted-foreground">
                  Breakdown of your {stats.totalHistory} total appointments
                </p>
              </div>
              <ChartContainer config={{}} className="h-[300px]">
                <PieChart>
                  <Pie
                    data={chartData.statusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent, value }) =>
                      `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={false}
                  >
                    {chartData.statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0];
                        return (
                          <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                            <p className="font-medium">{data.payload.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {data.value} appointment
                              {data.value !== 1 ? "s" : ""}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ChartContainer>
            </div>

            {/* Monthly Trends Chart */}
            {chartData.monthlyData.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Monthly Appointment Trends
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Appointment volume over the last 6 months
                  </p>
                </div>
                <ChartContainer
                  config={{
                    completed: { label: "Completed", color: "#10b981" },
                    cancelled: { label: "Cancelled", color: "#f59e0b" },
                    noShow: { label: "No Show", color: "#ef4444" },
                  }}
                  className="h-[300px]"
                >
                  <LineChart data={chartData.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: "#10b981", r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cancelled"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ fill: "#f59e0b", r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="noShow"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ fill: "#ef4444", r: 3 }}
                    />
                  </LineChart>
                </ChartContainer>
              </div>
            )}
          </motion.div>
        )}

        {/* Filters and Search Section */}
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
                  placeholder="Search by patient, doctor, or symptoms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Controls */}
            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
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

              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                  <SelectItem value="365">This Year</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters Button */}
              {(searchQuery ||
                statusFilter !== "all" ||
                dateRange !== "all") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setDateRange("all");
                    showToast("Filters cleared");
                  }}
                  size="sm"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Appointments List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold text-foreground">
                  {viewMode === "archived" ? "Archived" : "Historical"}{" "}
                  Appointments
                </h3>
                {/* Select All Checkbox - Only for active completed appointments */}
                {viewMode === "active" && stats.canArchive > 0 && (
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                    <Checkbox
                      checked={
                        filteredAppointments
                          .filter((apt) =>
                            ["completed", "cancelled", "no_show"].includes(
                              apt.status
                            )
                          )
                          .every((apt) => selectedItems.has(apt.id)) &&
                        stats.canArchive > 0
                      }
                      onCheckedChange={() =>
                        toggleSelectAll(
                          filteredAppointments.filter((apt) =>
                            ["completed", "cancelled", "no_show"].includes(
                              apt.status
                            )
                          )
                        )
                      }
                    />
                    Select All Archivable
                  </label>
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                {filteredAppointments.length} of{" "}
                {viewMode === "archived" ? stats.archived : stats.totalHistory}{" "}
                records
                {searchQuery && ` matching "${searchQuery}"`}
              </span>
            </div>

            {/* Empty State */}
            {filteredAppointments.length === 0 ? (
              <motion.div
                className="text-center py-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="p-4 bg-muted/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-muted-foreground" />
                </div>
                <h4 className="text-lg font-medium text-foreground mb-2">
                  {viewMode === "archived"
                    ? "No archived appointments"
                    : searchQuery ||
                      statusFilter !== "all" ||
                      dateRange !== "all"
                    ? "No appointments match your filters"
                    : "No appointment history"}
                </h4>
                <p className="text-muted-foreground mb-4">
                  {viewMode === "archived"
                    ? "Archived appointments will appear here"
                    : searchQuery ||
                      statusFilter !== "all" ||
                      dateRange !== "all"
                    ? "Try adjusting your search criteria or filters"
                    : "Completed appointments will appear here"}
                </p>
                {(searchQuery ||
                  statusFilter !== "all" ||
                  dateRange !== "all") && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                      setDateRange("all");
                    }}
                  >
                    Clear all filters
                  </Button>
                )}
              </motion.div>
            ) : (
              <div className="space-y-4">
                {/* Appointment Cards */}
                {filteredAppointments.map((appointment, index) => (
                  <motion.div
                    key={`${appointment.id}-${viewMode}`}
                    className="border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.05, 0.5) }}
                  >
                    {/* Appointment Header */}
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          {/* Checkbox for bulk selection */}
                          {viewMode === "active" &&
                            ["completed", "cancelled", "no_show"].includes(
                              appointment.status
                            ) && (
                              <Checkbox
                                checked={selectedItems.has(appointment.id)}
                                onCheckedChange={() =>
                                  toggleSelectItem(appointment.id)
                                }
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}

                          {/* Status Badge */}
                          <div
                            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                              appointment.status
                            )} flex-shrink-0`}
                          >
                            {getStatusIcon(appointment.status)}
                            {appointment.status.charAt(0).toUpperCase() +
                              appointment.status.slice(1).replace("_", " ")}
                            {viewMode === "archived" && (
                              <span className="ml-1 opacity-75">
                                [ARCHIVED]
                              </span>
                            )}
                          </div>

                          {/* Appointment Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground truncate">
                              {appointment.patient?.name || "Unknown Patient"}
                            </h4>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1 flex-shrink-0">
                                <Calendar className="w-3 h-3" />
                                {new Date(
                                  appointment.appointment_date
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
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

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Download Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDownload(appointment, e)}
                            title="Download appointment details"
                          >
                            <Download className="w-4 h-4" />
                          </Button>

                          {/* Archive Button - Active view only */}
                          {viewMode === "active" &&
                            ["completed", "cancelled", "no_show"].includes(
                              appointment.status
                            ) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) =>
                                  handleArchive(appointment.id, e)
                                }
                                disabled={
                                  actionLoading.archiving === appointment.id
                                }
                                title="Archive appointment"
                              >
                                {actionLoading.archiving === appointment.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Archive className="w-4 h-4" />
                                )}
                              </Button>
                            )}

                          {/* Unarchive & Delete Buttons - Archived view only */}
                          {viewMode === "archived" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) =>
                                  handleUnarchive(appointment.id, e)
                                }
                                disabled={
                                  actionLoading.unarchiving === appointment.id
                                }
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="Restore from archive"
                              >
                                {actionLoading.unarchiving ===
                                appointment.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) =>
                                  handleDeleteClick(appointment, e)
                                }
                                disabled={
                                  actionLoading.deleting === appointment.id
                                }
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Delete permanently"
                              >
                                {actionLoading.deleting === appointment.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </>
                          )}

                          {/* View Details Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDetailsModal({ isOpen: true, appointment })
                            }
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {/* Expand Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setExpandedAppointment(
                                expandedAppointment === appointment.id
                                  ? null
                                  : appointment.id
                              )
                            }
                            title={
                              expandedAppointment === appointment.id
                                ? "Collapse details"
                                : "Expand details"
                            }
                          >
                            {expandedAppointment === appointment.id ? (
                              <ChevronDown className="w-5 h-5" />
                            ) : (
                              <ChevronRight className="w-5 h-5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
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
                            {/* Patient Details */}
                            <div>
                              <h5 className="font-medium text-foreground mb-3 flex items-center gap-2">
                                <User className="w-4 h-4" />
                                Patient Information
                              </h5>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">
                                    Email:{" "}
                                  </span>
                                  <span className="text-foreground font-medium">
                                    {appointment.patient?.email}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">
                                    Phone:{" "}
                                  </span>
                                  <span className="text-foreground">
                                    {appointment.patient?.phone || "N/A"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Services */}
                            <div>
                              <h5 className="font-medium text-foreground mb-3 flex items-center gap-2">
                                <Stethoscope className="w-4 h-4" />
                                Services
                              </h5>
                              <div className="space-y-2">
                                {appointment.services &&
                                appointment.services.length > 0 ? (
                                  appointment.services.map((service, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center gap-2 text-sm"
                                    >
                                      <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                                      <span className="text-foreground">
                                        {service.name}
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm text-muted-foreground italic">
                                    No services recorded
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Notes */}
                            <div>
                              <h5 className="font-medium text-foreground mb-3 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Notes
                              </h5>
                              <div className="space-y-2 text-sm">
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
                                    <p className="text-red-600 mt-1 p-2 bg-red-50 rounded border border-red-200">
                                      {appointment.cancellation_reason}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick Actions in Expanded View */}
                          <div className="mt-6 pt-4 border-t border-border">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={(e) => handleDownload(appointment, e)}
                              >
                                <Download className="w-3 h-3 mr-2" />
                                Download Details
                              </Button>

                              {viewMode === "active" &&
                                ["completed", "cancelled", "no_show"].includes(
                                  appointment.status
                                ) && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) =>
                                      handleArchive(appointment.id, e)
                                    }
                                    disabled={
                                      actionLoading.archiving === appointment.id
                                    }
                                    className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200"
                                  >
                                    {actionLoading.archiving ===
                                    appointment.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin mr-2" />
                                    ) : (
                                      <Archive className="w-3 h-3 mr-2" />
                                    )}
                                    Archive Appointment
                                  </Button>
                                )}

                              {viewMode === "archived" && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) =>
                                      handleUnarchive(appointment.id, e)
                                    }
                                    disabled={
                                      actionLoading.unarchiving ===
                                      appointment.id
                                    }
                                    className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200"
                                  >
                                    {actionLoading.unarchiving ===
                                    appointment.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin mr-2" />
                                    ) : (
                                      <RotateCcw className="w-3 h-3 mr-2" />
                                    )}
                                    Restore from Archive
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) =>
                                      handleDeleteClick(appointment, e)
                                    }
                                    disabled={
                                      actionLoading.deleting === appointment.id
                                    }
                                    className="bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
                                  >
                                    {actionLoading.deleting ===
                                    appointment.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin mr-2" />
                                    ) : (
                                      <Trash2 className="w-3 h-3 mr-2" />
                                    )}
                                    Delete Permanently
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        <DeleteConfirmationModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, appointment: null })}
          onConfirm={handleDeleteConfirm}
          appointment={deleteModal.appointment}
          loading={actionLoading.deleting === deleteModal.appointment?.id}
        />
      </AnimatePresence>

      {/* Toast Notifications */}
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
    </div>
  );
};

export default StaffAppointmentHistory;
