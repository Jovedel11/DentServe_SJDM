import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { useStaffHistory } from "@/core/hooks/useStaffHistory";
import { useAuth } from "@/auth/context/AuthProvider";

const StaffAppointmentHistory = () => {
  const { isStaff } = useAuth();
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
    hasAppointments,
    canArchive,
  } = useStaffHistory();

  const [filters, setFilters] = useState({
    status: "all",
    dateFrom: null,
    dateTo: null,
    patientSearch: "",
    sortBy: "appointment_date",
    sortOrder: "desc",
  });

  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState("table");
  const [confirmingArchive, setConfirmingArchive] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  useEffect(() => {
    if (isStaff()) {
      const filterParams = {
        ...filters,
        status: filters.status === "all" ? null : filters.status,
        dateFrom: filters.dateFrom || null,
        dateTo: filters.dateTo || null,
        limit: itemsPerPage * currentPage,
        offset: (currentPage - 1) * itemsPerPage,
      };
      fetchHistory(filterParams);
    }
  }, [filters, currentPage, isStaff, fetchHistory, itemsPerPage]);

  const refreshParams = {
    ...filters,
    status: filters.status === "all" ? null : filters.status,
    dateFrom: filters.dateFrom || null,
    dateTo: filters.dateTo || null,
    limit: itemsPerPage * currentPage,
    offset: (currentPage - 1) * itemsPerPage,
  };
  fetchHistory(refreshParams);

  // Status options for filtering
  const statusOptions = [
    { value: "all", label: "All Status", color: "text-gray-600" },
    { value: "pending", label: "Pending", color: "text-yellow-600" },
    { value: "confirmed", label: "Confirmed", color: "text-blue-600" },
    { value: "completed", label: "Completed", color: "text-green-600" },
    { value: "cancelled", label: "Cancelled", color: "text-red-600" },
  ];

  // Load appointments on component mount and filter changes
  useEffect(() => {
    if (isStaff()) {
      const filterParams = {
        ...filters,
        status: filters.status === "all" ? null : filters.status,
        limit: itemsPerPage * currentPage,
        offset: (currentPage - 1) * itemsPerPage,
      };
      fetchHistory(filterParams);
    }
  }, [filters, currentPage, isStaff, fetchHistory, itemsPerPage]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "" ? null : value,
    }));
    setCurrentPage(1);
  };

  // ✅ FIXED: Staff-only archive handling (removed delete functionality)
  const handleArchiveAction = async (appointmentId = null) => {
    if (!canArchive) return;

    setActionLoading(true);
    try {
      let result;
      if (appointmentId) {
        result = await archiveAppointment(appointmentId);
      } else {
        result = await archiveSelectedAppointments();
      }

      if (result.success) {
        setConfirmingArchive(null);
        // Refresh the list
        fetchHistory({
          ...filters,
          status: filters.status === "all" ? null : filters.status,
          limit: itemsPerPage * currentPage,
          offset: (currentPage - 1) * itemsPerPage,
        });
      }
    } catch (error) {
      console.error("Archive error:", error);
    } finally {
      setActionLoading(false);
    }
  };

  // Status badge component
  const StatusBadge = ({ status }) => {
    const statusConfig = {
      pending: { bg: "bg-yellow-100", text: "text-yellow-800", icon: Clock },
      confirmed: {
        bg: "bg-blue-100",
        text: "text-blue-800",
        icon: CheckCircle,
      },
      completed: {
        bg: "bg-green-100",
        text: "text-green-800",
        icon: CheckCircle,
      },
      cancelled: { bg: "bg-red-100", text: "text-red-800", icon: XCircle },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
      >
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Appointment card component for mobile view
  const AppointmentCard = ({ appointment }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => toggleSelection(appointment.id)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            {selectedItems.has(appointment.id) ? (
              <CheckSquare className="w-5 h-5 text-blue-600" />
            ) : (
              <Square className="w-5 h-5" />
            )}
          </button>
          <StatusBadge status={appointment.status} />
        </div>
        <div className="flex items-center space-x-2">
          {canArchive && (
            <button
              onClick={() =>
                setConfirmingArchive({ type: "single", id: appointment.id })
              }
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Archive appointment"
            >
              <Archive className="w-4 h-4" />
            </button>
          )}
          <button
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            title="View details"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center text-sm">
          <User className="w-4 h-4 text-gray-400 mr-3 flex-shrink-0" />
          <div>
            <span className="font-medium text-gray-900">
              {appointment.patient?.name}
            </span>
            <div className="text-gray-500">{appointment.patient?.email}</div>
          </div>
        </div>

        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="w-4 h-4 text-gray-400 mr-3 flex-shrink-0" />
          <span>
            {new Date(appointment.appointment_date).toLocaleDateString(
              "en-US",
              {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              }
            )}
          </span>
          <Clock className="w-4 h-4 text-gray-400 ml-6 mr-2 flex-shrink-0" />
          <span>{appointment.appointment_time}</span>
        </div>

        {appointment.services && appointment.services.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {appointment.services.map((service, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-indigo-50 text-indigo-700 border border-indigo-200"
              >
                {service.name}
              </span>
            ))}
          </div>
        )}

        {appointment.notes && (
          <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 mt-3">
            <div className="font-medium text-gray-700 mb-1">Notes:</div>
            {appointment.notes}
          </div>
        )}
      </div>
    </div>
  );

  // Pagination component
  const Pagination = () => {
    const totalPages = Math.ceil(stats.total / itemsPerPage);

    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-gray-200">
        <div className="text-sm text-gray-600">
          Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
          {Math.min(currentPage * itemsPerPage, stats.total)} of {stats.total}{" "}
          appointments
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
            disabled={currentPage === totalPages}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // ✅ SECURITY: Return access denied for non-staff
  if (!isStaff()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600">
            This page is only accessible to staff members.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Appointment History
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage and archive your clinic's appointment history
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                  showFilters
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </button>

              <button
                onClick={() =>
                  setViewMode(viewMode === "table" ? "card" : "table")
                }
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <ArrowUpDown className="w-4 h-4 mr-2" />
                {viewMode === "table" ? "Card View" : "Table View"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Appointments
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.byStatus?.completed || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.thisMonth}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <Archive className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Selected</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.selectedCount}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Date
                </label>
                <input
                  type="date"
                  value={filters.dateFrom || ""}
                  onChange={(e) =>
                    handleFilterChange("dateFrom", e.target.value)
                  }
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
                    onChange={(e) =>
                      handleFilterChange("patientSearch", e.target.value)
                    }
                    placeholder="Name or email..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Actions */}
        {stats.hasSelection && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-sm font-medium text-blue-900">
                  {stats.selectedCount} appointment
                  {stats.selectedCount !== 1 ? "s" : ""} selected
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
                    onClick={() => setConfirmingArchive({ type: "bulk" })}
                    className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    disabled={actionLoading}
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    Archive Selected
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-3" />
              <span className="text-gray-600">Loading appointments...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-red-600">
              <AlertCircle className="w-8 h-8 mb-3" />
              <span className="text-lg font-medium mb-2">
                Error Loading Appointments
              </span>
              <span className="text-sm">{error}</span>
            </div>
          ) : !hasAppointments ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Calendar className="w-12 h-12 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                No Appointments Found
              </h3>
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
                  <span>
                    {stats.allSelected ? "Deselect All" : "Select All"}
                  </span>
                </button>
              </div>

              {/* Appointments List */}
              {viewMode === "table" ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="w-12 px-6 py-3 text-left">
                          <button
                            onClick={
                              stats.allSelected ? clearSelection : selectAll
                            }
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
                          Services
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {appointments.map((appointment) => (
                        <tr
                          key={appointment.id}
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
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div>
                              <div className="font-medium">
                                {new Date(
                                  appointment.appointment_date
                                ).toLocaleDateString("en-US", {
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
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {appointment.services
                                ?.slice(0, 2)
                                .map((service, index) => (
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
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                title="View details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {canArchive && (
                                <button
                                  onClick={() =>
                                    setConfirmingArchive({
                                      type: "single",
                                      id: appointment.id,
                                    })
                                  }
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="Archive appointment"
                                >
                                  <Archive className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {appointments.map((appointment) => (
                      <AppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Pagination */}
              <Pagination />
            </>
          )}
        </div>
      </div>

      {/* Archive Confirmation Modal */}
      {confirmingArchive && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                  <Archive className="h-6 w-6 text-blue-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Archive{" "}
                    {confirmingArchive.type === "bulk" ? "Selected " : ""}
                    Appointment{confirmingArchive.type === "bulk" ? "s" : ""}
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      {confirmingArchive.type === "bulk"
                        ? `Archive ${stats.selectedCount} selected appointments? They will be moved to your archive where you can restore them later if needed.`
                        : "Archive this appointment? It will be moved to your archive where you can restore it later if needed."}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => handleArchiveAction(confirmingArchive.id)}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Archive className="w-4 h-4 mr-2" />
                  )}
                  Archive
                </button>
                <button
                  onClick={() => setConfirmingArchive(null)}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm transition-colors"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffAppointmentHistory;
