import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Search,
  Filter,
  Archive,
  CheckSquare,
  Square,
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
} from "lucide-react";

import { useStaffHistory } from "@/core/hooks/useStaffHistory";
import { useAuth } from "@/auth/context/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

const StaffAppointmentHistory = () => {
  const { isStaff, isAdmin, profile } = useAuth();
  
  const {
    appointments,
    loading,
    error,
    stats,
    selectedItems,
    toggleSelection,
    selectAll,
    clearSelection,
    fetchHistory,
    archiveAppointment,
    archiveSelectedAppointments,
    deleteAppointment,
    hasAppointments,
    canDelete,
    canArchive,
    clinicId,
  } = useStaffHistory();

  // ✅ Enhanced state management
  const [filters, setFilters] = useState({
    status: "all",
    dateFrom: "",
    dateTo: "",
    patientSearch: "",
    sortBy: "appointment_date",
    sortOrder: "desc",
  });

  const [viewMode, setViewMode] = useState("table");
  const [showArchived, setShowArchived] = useState(false);
  const [archivedItems, setArchivedItems] = useState([]);
  const [archiveStats, setArchiveStats] = useState(null);
  
  const [modals, setModals] = useState({
    confirmArchive: null,
    confirmDelete: null,
    appointmentDetails: null,
    archiveManager: false,
    exportData: false,
  });

  const [actionState, setActionState] = useState({
    processing: false,
    error: null,
    success: null,
    type: null,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [totalPages, setTotalPages] = useState(1);

  // ✅ Enhanced filter handling
  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "" ? null : value,
    }));
    setCurrentPage(1);
  }, []);

  // ✅ Fetch appointments with comprehensive error handling
  const loadAppointments = useCallback(async (options = {}) => {
    const filterParams = {
      ...filters,
      status: filters.status === "all" ? null : filters.status,
      dateFrom: filters.dateFrom || null,
      dateTo: filters.dateTo || null,
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage,
      ...options,
    };

    try {
      const result = await fetchHistory(filterParams);
      if (result.success) {
        setTotalPages(Math.ceil((result.totalCount || 0) / itemsPerPage));
      }
      return result;
    } catch (err) {
      console.error("Failed to load appointments:", err);
      return { success: false, error: err.message };
    }
  }, [filters, currentPage, itemsPerPage, fetchHistory]);

  // ✅ Archive management functions
  const loadArchivedItems = useCallback(async () => {
    try {
      setActionState(prev => ({ ...prev, processing: true }));
      
      // This would use your archive manager to get archived appointments
      // The exact implementation depends on your archive RPC structure
      const { data, error } = await supabase.rpc('manage_user_archives', {
        p_action: 'list_archived',
        p_item_type: 'clinic_appointment',
        p_item_id: null,
        p_item_ids: null,
        p_scope_override: null
      });

      if (error) throw new Error(error.message);

      if (data?.success) {
        setArchivedItems(data.data || []);
      }
    } catch (err) {
      setActionState(prev => ({ ...prev, error: err.message }));
    } finally {
      setActionState(prev => ({ ...prev, processing: false }));
    }
  }, []);

  const loadArchiveStats = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('manage_user_archives', {
        p_action: 'get_stats',
        p_item_type: 'clinic_appointment',
        p_item_id: null,
        p_item_ids: null,
        p_scope_override: null
      });

      if (error) throw new Error(error.message);

      if (data?.success) {
        setArchiveStats(data.data);
      }
    } catch (err) {
      console.error("Failed to load archive stats:", err);
    }
  }, []);

  // ✅ Enhanced action handlers
  const handleArchiveAction = useCallback(async (appointmentId = null) => {
    if (!canArchive) return;

    setActionState({ processing: true, error: null, success: null, type: "archive" });

    try {
      let result;
      if (appointmentId) {
        result = await archiveAppointment(appointmentId);
      } else {
        result = await archiveSelectedAppointments();
      }

      if (result.success) {
        setActionState({
          processing: false,
          error: null,
          success: `Successfully archived ${appointmentId ? "appointment" : `${selectedItems.size} appointments`}`,
          type: null,
        });
        
        setModals(prev => ({ ...prev, confirmArchive: null }));
        await loadAppointments({ refresh: true });
        
        // Auto-clear success message
        setTimeout(() => {
          setActionState(prev => ({ ...prev, success: null }));
        }, 3000);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setActionState({
        processing: false,
        error: error.message || "Archive operation failed",
        success: null,
        type: null,
      });
    }
  }, [canArchive, archiveAppointment, archiveSelectedAppointments, selectedItems.size, loadAppointments]);


  const handleDeleteAction = useCallback(async (appointmentId) => {
    if (!canDelete) return;

    setActionState({ processing: true, error: null, success: null, type: "delete" });

    try {
      const result = await deleteAppointment(appointmentId);
      
      if (result.success) {
        setActionState({
          processing: false,
          error: null,
          success: "Appointment permanently deleted",
          type: null,
        });
        
        setModals(prev => ({ ...prev, confirmDelete: null }));
        await loadAppointments({ refresh: true });
        
        setTimeout(() => {
          setActionState(prev => ({ ...prev, success: null }));
        }, 3000);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setActionState({
        processing: false,
        error: error.message || "Delete operation failed",
        success: null,
        type: null,
      });
    }
  }, [canDelete, deleteAppointment, loadAppointments]);

  // ✅ Enhanced status badge with better styling
  const StatusBadge = React.memo(({ status }) => {
    const statusConfig = {
      pending: { 
        bg: "bg-yellow-100", 
        text: "text-yellow-800", 
        border: "border-yellow-200",
        icon: Clock 
      },
      confirmed: {
        bg: "bg-blue-100",
        text: "text-blue-800",
        border: "border-blue-200",
        icon: CheckCircle,
      },
      completed: {
        bg: "bg-green-100",
        text: "text-green-800",
        border: "border-green-200",
        icon: CheckCircle,
      },
      cancelled: { 
        bg: "bg-red-100", 
        text: "text-red-800", 
        border: "border-red-200",
        icon: XCircle 
      },
      no_show: {
        bg: "bg-gray-100",
        text: "text-gray-800",
        border: "border-gray-200",
        icon: AlertCircle,
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}
      >
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  });

  // ✅ Patient reliability badge
  const PatientReliabilityBadge = React.memo(({ reliability }) => {
    if (!reliability) return null;

    const riskLevel = reliability.risk_level;
    const completionRate = reliability.statistics?.completion_rate || 0;

    const riskConfig = {
      reliable: {
        color: "bg-green-100 text-green-800 border-green-200",
        icon: Shield,
        label: "Reliable",
      },
      low_risk: {
        color: "bg-blue-100 text-blue-800 border-blue-200",
        icon: CheckCircle,
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
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label} ({completionRate}%)
      </span>
    );
  });

  // ✅ Enhanced appointment card for mobile/card view
  const AppointmentCard = React.memo(({ appointment }) => {
    const isSelected = selectedItems.has(appointment.id);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-all duration-200 ${
          isSelected ? "border-blue-300 bg-blue-50" : "border-gray-200"
        }`}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => toggleSelection(appointment.id)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              {isSelected ? (
                <CheckSquare className="w-5 h-5 text-blue-600" />
              ) : (
                <Square className="w-5 h-5" />
              )}
            </button>
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                {appointment.patient?.name}
              </h3>
              <StatusBadge status={appointment.status} />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setModals(prev => ({ ...prev, appointmentDetails: appointment }))}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="View details"
            >
              <Eye className="w-4 h-4" />
            </button>
            
            {canArchive && (
              <button
                onClick={() => setModals(prev => ({ ...prev, confirmArchive: { type: "single", id: appointment.id } }))}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Archive appointment"
              >
                <Archive className="w-4 h-4" />
              </button>
            )}
            
            {canDelete && (
              <button
                onClick={() => setModals(prev => ({ ...prev, confirmDelete: appointment.id }))}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete permanently"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">
                {new Date(appointment.appointment_date).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{appointment.appointment_time}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Stethoscope className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">
              {appointment.doctor?.name || "Unassigned"}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{appointment.patient?.email}</span>
          </div>

          {appointment.patient_reliability && (
            <PatientReliabilityBadge reliability={appointment.patient_reliability} />
          )}

          {appointment.services && appointment.services.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {appointment.services.map((service, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-indigo-50 text-indigo-700 border border-indigo-200"
                >
                  {service.name}
                </span>
              ))}
            </div>
          )}

          {appointment.symptoms && (
            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 mt-3">
              <div className="font-medium text-gray-700 mb-1">Symptoms:</div>
              <p className="line-clamp-2">{appointment.symptoms}</p>
            </div>
          )}

          {appointment.notes && (
            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
              <div className="font-medium text-gray-700 mb-1">Notes:</div>
              <p className="line-clamp-2">{appointment.notes}</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  });

  // ✅ Pagination component
  const Pagination = React.memo(() => {
    if (totalPages <= 1) return null;

    const pages = [];
    const showPages = 5;
    const startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
    const endPage = Math.min(totalPages, startPage + showPages - 1);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-gray-200">
        <div className="text-sm text-gray-600">
          Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
          {Math.min(currentPage * itemsPerPage, stats.total)} of {stats.total}{" "}
          appointments
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          {pages.map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                currentPage === page
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {page}
            </button>
          ))}
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  });

  // ✅ Load data on mount and filter changes
  useEffect(() => {
    if (isStaff || isAdmin) {
      loadAppointments();
    }
  }, [filters, currentPage, isStaff, isAdmin, loadAppointments]);

  // ✅ Load archive data when needed
  useEffect(() => {
    if (showArchived && (isStaff || isAdmin)) {
      loadArchivedItems();
      loadArchiveStats();
    }
  }, [showArchived, isStaff, isAdmin, loadArchivedItems, loadArchiveStats]);

  // ✅ Security check
  if (!isStaff && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">This page is only accessible to staff members.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ✅ Enhanced Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Database className="w-8 h-8 text-blue-600" />
                Appointment History
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage and archive your clinic's appointment history
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                  showArchived
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Archive className="w-4 h-4 mr-2" />
                {showArchived ? "Show Active" : "Show Archived"}
              </button>

              <button
                onClick={() => setViewMode(viewMode === "table" ? "card" : "table")}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <ArrowUpDown className="w-4 h-4 mr-2" />
                {viewMode === "table" ? "Card View" : "Table View"}
              </button>

              <button
                onClick={() => setModals(prev => ({ ...prev, archiveManager: true }))}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage Archives
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Enhanced Stats Overview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Appointments</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
            <div className="mt-2 flex items-center">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-sm text-green-600">This month: {stats.thisMonth}</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.byStatus?.completed || 0}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div className="mt-2">
              <span className="text-sm text-gray-500">
                {stats.total > 0 ? Math.round(((stats.byStatus?.completed || 0) / stats.total) * 100) : 0}% completion rate
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Selected</p>
                <p className="text-2xl font-bold text-blue-600">{stats.selectedCount}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <div className="mt-2">
              <span className="text-sm text-gray-500">
                {stats.hasSelection ? `${stats.selectedCount} items selected` : "No items selected"}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Archive Stats</p>
                <p className="text-2xl font-bold text-purple-600">
                  {archiveStats?.total_archived || 0}
                </p>
              </div>
              <Archive className="w-8 h-8 text-purple-600" />
            </div>
            <div className="mt-2">
              <span className="text-sm text-gray-500">Archived items</span>
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
              className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mb-6"
            >
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-700 font-medium">
                  {error || actionState.error}
                </p>
              </div>
              <button
                onClick={() => {
                  setError?.(null);
                  setActionState(prev => ({ ...prev, error: null }));
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
              className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3 mb-6"
            >
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-green-700 font-medium">
                  {actionState.success}
                </p>
              </div>
              <button
                onClick={() => setActionState(prev => ({ ...prev, success: null }))}
                className="text-green-400 hover:text-green-600"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ✅ Enhanced Filters Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={filters.dateFrom || ""}
                onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={filters.dateTo || ""}
                onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Patient Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.patientSearch}
                  onChange={(e) => handleFilterChange("patientSearch", e.target.value)}
                  placeholder="Name or email..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => loadAppointments({ refresh: true })}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Refresh
              </button>

              <button
                onClick={() => setFilters({
                  status: "all",
                  dateFrom: "",
                  dateTo: "",
                  patientSearch: "",
                  sortBy: "appointment_date",
                  sortOrder: "desc",
                })}
                className="text-sm text-gray-600 hover:text-gray-800 font-medium"
              >
                Clear Filters
              </button>
            </div>

            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Activity className="w-4 h-4" />
              <span>Showing {appointments.length} of {stats.total} appointments</span>
            </div>
          </div>
        </div>

        {/* ✅ Bulk Actions */}
        {stats.hasSelection && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-sm font-medium text-blue-900">
                  {stats.selectedCount} appointment{stats.selectedCount !== 1 ? "s" : ""} selected
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={clearSelection}
                  className="text-sm text-blue-700 hover:text-blue-800 font-medium"
                >
                  Clear Selection
                </button>
                {canArchive && (
                  <button
                    onClick={() => setModals(prev => ({ ...prev, confirmArchive: { type: "bulk" } }))}
                    className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    disabled={actionState.processing}
                  >
                    {actionState.processing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Archive className="w-4 h-4 mr-2" />
                    )}
                    Archive Selected
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ✅ Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading && appointments.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                <span className="text-gray-600">Loading appointments...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-red-600">
              <AlertCircle className="w-8 h-8 mb-3" />
              <span className="text-lg font-medium mb-2">Error Loading Appointments</span>
              <span className="text-sm">{error}</span>
            </div>
          ) : !hasAppointments ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Calendar className="w-12 h-12 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Appointments Found</h3>
              <p className="text-center text-sm">
                {Object.values(filters).some((v) => v && v !== "all")
                  ? "Try adjusting your filters to see more results."
                  : "No appointment history available yet."}
              </p>
            </div>
          ) : (
            <>
              {/* Selection Controls */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <button
                  onClick={stats.allSelected ? clearSelection : selectAll}
                  className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  {stats.allSelected ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  <span>{stats.allSelected ? "Deselect All" : "Select All"}</span>
                </button>

                <div className="flex items-center space-x-4">
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange("sortBy", e.target.value)}
                    className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="appointment_date">Sort by Date</option>
                    <option value="patient_name">Sort by Patient</option>
                    <option value="status">Sort by Status</option>
                    <option value="created_at">Sort by Created</option>
                  </select>

                  <button
                    onClick={() => handleFilterChange("sortOrder", filters.sortOrder === "desc" ? "asc" : "desc")}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {filters.sortOrder === "desc" ? (
                      <TrendingDown className="w-4 h-4" />
                    ) : (
                      <TrendingUp className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Appointments List */}
              {viewMode === "table" ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="w-12 px-6 py-3 text-left">
                          <button
                            onClick={stats.allSelected ? clearSelection : selectAll}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {stats.allSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Patient
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date & Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Doctor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Services
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <AnimatePresence>
                        {appointments.map((appointment) => (
                          <motion.tr
                            key={appointment.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <button
                                onClick={() => toggleSelection(appointment.id)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                {selectedItems.has(appointment.id) ? (
                                  <CheckSquare className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {appointment.patient?.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {appointment.patient?.email}
                                </div>
                                {appointment.patient_reliability && (
                                  <div className="mt-1">
                                    <PatientReliabilityBadge reliability={appointment.patient_reliability} />
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <div>
                                <div className="font-medium">
                                  {new Date(appointment.appointment_date).toLocaleDateString("en-US", {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </div>
                                <div className="text-gray-500">
                                  {appointment.appointment_time}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <StatusBadge status={appointment.status} />
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {appointment.doctor?.name || "Unassigned"}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {appointment.services?.slice(0, 2).map((service, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center px-2 py-1 rounded text-xs bg-indigo-50 text-indigo-700 border border-indigo-200"
                                  >
                                    {service.name}
                                  </span>
                                ))}
                                {appointment.services?.length > 2 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                                    +{appointment.services.length - 2} more
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => setModals(prev => ({ ...prev, appointmentDetails: appointment }))}
                                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                  title="View details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {canArchive && (
                                  <button
                                    onClick={() => setModals(prev => ({ ...prev, confirmArchive: { type: "single", id: appointment.id } }))}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="Archive appointment"
                                  >
                                    <Archive className="w-4 h-4" />
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    onClick={() => setModals(prev => ({ ...prev, confirmDelete: appointment.id }))}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Delete permanently"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    <AnimatePresence>
                      {appointments.map((appointment) => (
                        <AppointmentCard key={appointment.id} appointment={appointment} />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Pagination */}
              <Pagination />
            </>
          )}
        </div>
      </div>

      {/* ✅ Archive Confirmation Modal */}
      {modals.confirmArchive && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6"
            >
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                  <Archive className="h-6 w-6 text-blue-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Archive {modals.confirmArchive.type === "bulk" ? "Selected " : ""}
                    Appointment{modals.confirmArchive.type === "bulk" ? "s" : ""}
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      {modals.confirmArchive.type === "bulk"
                        ? `Archive ${stats.selectedCount} selected appointments? They will be moved to your archive where you can restore them later if needed.`
                        : "Archive this appointment? It will be moved to your archive where you can restore it later if needed."}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => handleArchiveAction(modals.confirmArchive.id)}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                  disabled={actionState.processing}
                >
                  {actionState.processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Archiving...
                    </>
                  ) : (
                    <>
                      <Archive className="w-4 h-4 mr-2" />
                      Archive
                    </>
                  )}
                </button>
                <button
                  onClick={() => setModals(prev => ({ ...prev, confirmArchive: null }))}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm transition-colors"
                  disabled={actionState.processing}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* ✅ Delete Confirmation Modal */}
      {modals.confirmDelete && canDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6"
            >
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Delete Appointment Permanently
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to permanently delete this appointment? This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => handleDeleteAction(modals.confirmDelete)}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                  disabled={actionState.processing}
                >
                  {actionState.processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </>
                  )}
                </button>
                <button
                  onClick={() => setModals(prev => ({ ...prev, confirmDelete: null }))}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm transition-colors"
                  disabled={actionState.processing}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* ✅ Appointment Details Modal */}
      {modals.appointmentDetails && (
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
                  ID: {modals.appointmentDetails.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => setModals(prev => ({ ...prev, appointmentDetails: null }))}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold text-gray-900">
                  {modals.appointmentDetails.patient?.name || "Unknown Patient"}
                </h3>
                <StatusBadge status={modals.appointmentDetails.status} />
              </div>

              {/* Patient Reliability Section */}
              {modals.appointmentDetails.patient_reliability && (
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-bold text-gray-900 mb-4 flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-blue-600" />
                    Patient Reliability Assessment
                  </h4>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div>
                      <PatientReliabilityBadge reliability={modals.appointmentDetails.patient_reliability} />
                      <div className="mt-3 text-sm space-y-2">
                        <p><strong>Completion Rate:</strong> {modals.appointmentDetails.patient_reliability.statistics?.completion_rate}%</p>
                        <p><strong>Total Appointments:</strong> {modals.appointmentDetails.patient_reliability.statistics?.total_appointments}</p>
                        <p><strong>No-Shows:</strong> {modals.appointmentDetails.patient_reliability.statistics?.no_show_count}</p>
                      </div>
                    </div>
                    {modals.appointmentDetails.patient_reliability.recommendations && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Staff Recommendations:</h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {modals.appointmentDetails.patient_reliability.recommendations.map((rec, idx) => (
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
                        {modals.appointmentDetails.patient?.name || "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Email:</span>
                      <p className="font-semibold text-gray-900 mt-1 flex items-center">
                        <Mail className="w-4 h-4 mr-2 text-gray-400" />
                        {modals.appointmentDetails.patient?.email || "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Phone:</span>
                      <p className="font-semibold text-gray-900 mt-1 flex items-center">
                        <Phone className="w-4 h-4 mr-2 text-gray-400" />
                        {modals.appointmentDetails.patient?.phone || "N/A"}
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
                          {new Date(modals.appointmentDetails.appointment_date).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                        <p className="font-semibold text-blue-600">
                          {modals.appointmentDetails.appointment_time}
                        </p>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Doctor:</span>
                      <p className="font-semibold text-gray-900 mt-1 flex items-center">
                        <Stethoscope className="w-4 h-4 mr-2 text-gray-400" />
                        {modals.appointmentDetails.doctor?.name || "Unassigned"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Duration:</span>
                      <p className="font-semibold text-gray-900 mt-1">
                        {modals.appointmentDetails.duration_minutes || 30} minutes
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Services */}
              {modals.appointmentDetails.services && modals.appointmentDetails.services.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-bold text-gray-900 mb-4 flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-blue-600" />
                    Services
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {modals.appointmentDetails.services.map((service, idx) => (
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
              {modals.appointmentDetails.symptoms && (
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-bold text-gray-900 mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-blue-600" />
                    Symptoms & Concerns
                  </h4>
                  <p className="text-sm text-gray-700 leading-relaxed bg-white p-4 rounded-lg border border-gray-200">
                    {modals.appointmentDetails.symptoms}
                  </p>
                </div>
              )}

              {/* Notes */}
              {modals.appointmentDetails.notes && (
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-bold text-gray-900 mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-blue-600" />
                    Notes
                  </h4>
                  <p className="text-sm text-gray-700 leading-relaxed bg-white p-4 rounded-lg border border-gray-200">
                    {modals.appointmentDetails.notes}
                  </p>
                </div>
              )}

              {/* Cancellation Details */}
              {modals.appointmentDetails.cancellation_reason && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                  <h4 className="font-bold text-red-900 mb-4 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
                    Cancellation Details
                  </h4>
                  <p className="text-sm text-red-700 leading-relaxed">
                    {modals.appointmentDetails.cancellation_reason}
                  </p>
                  {modals.appointmentDetails.cancelled_at && (
                    <p className="text-xs text-red-600 mt-2">
                      Cancelled: {new Date(modals.appointmentDetails.cancelled_at).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setModals(prev => ({ ...prev, appointmentDetails: null }))}
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

export default StaffAppointmentHistory;