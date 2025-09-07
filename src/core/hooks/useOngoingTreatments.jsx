import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useAppointmentRealtime } from "@/core/hooks/useAppointmentRealtime";
import { useAppointmentCancellation } from "@/core/hooks/useAppointmentCancellation";
import { supabase } from "@/lib/supabaseClient";

const UpcomingAppointments = () => {
  const { user, profile, isPatient } = useAuth();

  // ✅ VALIDATED HOOKS INTEGRATION
  const {
    loading: cancelLoading,
    error: cancelError,
    cancelAppointment,
    checkCancellationEligibility,
  } = useAppointmentCancellation();

  const { enableRealtimeUpdates, disableRealtimeUpdates, isConnected } =
    useAppointmentRealtime({
      onAppointmentUpdate: useCallback((update) => {
        console.log("Real-time appointment update:", update);
        fetchUserAppointments();
      }, []),
      onAppointmentStatusChange: useCallback((statusUpdate) => {
        console.log("Appointment status changed:", statusUpdate);
        showToast(`Appointment status changed to ${statusUpdate.newStatus}`);
        fetchUserAppointments();
      }, []),
      enableAppointments: true,
      enableNotifications: true,
    });

  // ✅ STATE MANAGEMENT
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("upcoming");
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [cancelModal, setCancelModal] = useState({
    isOpen: false,
    appointment: null,
    canCancel: true,
    reason: "",
  });
  const [toastMessage, setToastMessage] = useState("");

  // ✅ FIXED: Correct RPC response handling
  const fetchUserAppointments = useCallback(async () => {
    if (!isPatient()) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "get_user_appointments",
        {
          p_status: null, // Get all statuses
          p_date_from: null,
          p_date_to: null,
          p_limit: 100,
          p_offset: 0,
        }
      );

      if (rpcError) throw new Error(rpcError.message);

      // FIX: Check if data exists and has the expected structure
      if (data && data.authenticated === false) {
        throw new Error("Authentication required");
      }

      if (!data?.success) {
        throw new Error(data?.error || "Failed to fetch appointments");
      }

      // FIX: Handle the response structure correctly
      // The appointments might be in data.data or directly in data
      const appointmentData = data.data || data;
      setAppointments(appointmentData.appointments || appointmentData || []);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching user appointments:", err);
    } finally {
      setLoading(false);
    }
  }, [isPatient]);

  // ✅ INITIALIZATION
  useEffect(() => {
    if (!user || !isPatient()) {
      console.warn("Access denied: Not a patient or not authenticated");
      return;
    }

    fetchUserAppointments();
    enableRealtimeUpdates();

    return () => disableRealtimeUpdates();
  }, [
    user,
    isPatient,
    fetchUserAppointments,
    enableRealtimeUpdates,
    disableRealtimeUpdates,
  ]);

  // ✅ FIXED: Add missing dependency to useMemo
  const formatDate = useCallback((dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  const formatTime = useCallback((timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }, []);

  // ✅ FIXED: Move getReminderMessage inside useCallback
  const getReminderMessage = useCallback(
    (appointment) => {
      const today = new Date().toISOString().split("T")[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      if (appointment.appointment_date === today) {
        return {
          message: `Today at ${formatTime(appointment.appointment_time)}`,
          type: "today",
          urgent: true,
        };
      } else if (appointment.appointment_date === tomorrowStr) {
        return {
          message: `Tomorrow at ${formatTime(appointment.appointment_time)}`,
          type: "tomorrow",
          urgent: true,
        };
      } else {
        return {
          message: `${formatDate(appointment.appointment_date)} at ${formatTime(
            appointment.appointment_time
          )}`,
          type: "upcoming",
          urgent: false,
        };
      }
    },
    [formatDate, formatTime]
  );

  // ✅ OPTIMIZED FILTERING
  const filteredAppointments = useMemo(() => {
    let filtered = appointments;

    // Search filter
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (apt) =>
          (apt.services &&
            apt.services.some((service) =>
              service.name?.toLowerCase().includes(query)
            )) ||
          apt.doctor_name?.toLowerCase().includes(query) ||
          apt.clinic_name?.toLowerCase().includes(query) ||
          apt.symptoms?.toLowerCase().includes(query)
      );
    }

    // Date/status filter
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    switch (filterType) {
      case "upcoming":
        filtered = filtered.filter(
          (apt) =>
            ["pending", "confirmed"].includes(apt.status) &&
            apt.appointment_date >= today
        );
        break;
      case "today":
        filtered = filtered.filter((apt) => apt.appointment_date === today);
        break;
      case "tomorrow":
        filtered = filtered.filter(
          (apt) => apt.appointment_date === tomorrowStr
        );
        break;
      case "thisWeek":
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextWeekStr = nextWeek.toISOString().split("T")[0];
        filtered = filtered.filter(
          (apt) =>
            apt.appointment_date >= today && apt.appointment_date <= nextWeekStr
        );
        break;
      case "all":
      default:
        break;
    }

    return filtered;
  }, [appointments, searchTerm, filterType]);

  // ✅ COMPUTED DATA
  const urgentAppointments = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    return appointments.filter(
      (apt) =>
        (apt.appointment_date === today ||
          apt.appointment_date === tomorrowStr) &&
        ["pending", "confirmed"].includes(apt.status)
    );
  }, [appointments]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return {
      total: appointments.length,
      upcoming: appointments.filter(
        (apt) =>
          ["pending", "confirmed"].includes(apt.status) &&
          apt.appointment_date >= today
      ).length,
      completed: appointments.filter((apt) => apt.status === "completed")
        .length,
      cancelled: appointments.filter((apt) => apt.status === "cancelled")
        .length,
    };
  }, [appointments]);

  // ✅ UTILITY FUNCTIONS
  const showToast = useCallback((message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(""), 3000);
  }, []);

  const handleCancelAppointment = useCallback(
    async (appointment) => {
      try {
        const eligibility = await checkCancellationEligibility(appointment.id);
        setCancelModal({
          isOpen: true,
          appointment,
          canCancel: eligibility.canCancel,
          reason: eligibility.canCancel ? "" : eligibility.reason,
        });
      } catch (err) {
        console.error("Error checking cancellation eligibility:", err);
        showToast("Failed to check cancellation eligibility");
      }
    },
    [checkCancellationEligibility, showToast]
  );

  const confirmCancelAppointment = useCallback(
    async (appointmentId, cancellationReason) => {
      try {
        const result = await cancelAppointment(
          appointmentId,
          cancellationReason
        );

        if (result.success) {
          setCancelModal({
            isOpen: false,
            appointment: null,
            canCancel: true,
            reason: "",
          });
          showToast("Appointment cancelled successfully");
          fetchUserAppointments();
        } else {
          showToast(result.error || "Failed to cancel appointment");
        }
      } catch (error) {
        console.error("Error cancelling appointment:", error);
        showToast("An error occurred while cancelling");
      }
    },
    [cancelAppointment, showToast, fetchUserAppointments]
  );

  const handleViewDetails = useCallback((appointment) => {
    setSelectedAppointment(appointment);
  }, []);

  const handleDownloadDetails = useCallback(
    (appointment) => {
      const details = `
APPOINTMENT DETAILS
==================
Service: ${appointment.services?.map((s) => s.name).join(", ") || "N/A"}
Doctor: ${appointment.doctor_name || "N/A"}
Clinic: ${appointment.clinic_name || "N/A"}
Address: ${appointment.clinic_address || "N/A"}
Date: ${formatDate(appointment.appointment_date)}
Time: ${formatTime(appointment.appointment_time)}
Duration: ${
        appointment.duration_minutes
          ? `${appointment.duration_minutes} minutes`
          : "N/A"
      }
Status: ${appointment.status}
Notes: ${appointment.notes || "None"}

CONTACT INFORMATION
==================
Phone: ${appointment.clinic_phone || "N/A"}
Email: ${appointment.clinic_email || "N/A"}
    `;

      const blob = new Blob([details], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `appointment-${appointment.id}-details.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [formatDate, formatTime]
  );

  // ✅ ACCESS CONTROL
  if (!user || !isPatient()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6 bg-red-50 border border-red-200 rounded-lg">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You need to be a verified patient to view appointments.
          </p>
        </div>
      </div>
    );
  }

  // ✅ ERROR STATE
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6 bg-red-50 border border-red-200 rounded-lg">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Error Loading Appointments
          </h1>
          <p className="text-gray-600 mb-4">Error: {error}</p>
          <button
            onClick={fetchUserAppointments}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ✅ LOADING STATE
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded mb-6 w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-300 rounded"></div>
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-300 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ EMPTY STATE
  if (filteredAppointments.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Appointments Found
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || filterType !== "all"
                ? "Try adjusting your filters."
                : "You don't have any appointments scheduled."}
            </p>
            <button className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Book New Appointment
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ MAIN RENDER
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg">
            {toastMessage}
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Upcoming Appointments
            </h1>
            <p className="text-gray-600 mt-2">
              Manage your scheduled appointments • {stats.upcoming} upcoming
            </p>
            <button
              onClick={fetchUserAppointments}
              disabled={loading}
              className="mt-4 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
            {isConnected && (
              <span className="ml-4 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                Live Updates Active
              </span>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow mb-8 p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search appointments, doctors, or clinics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 bg-white rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="upcoming">Upcoming</option>
                <option value="all">All Appointments</option>
                <option value="today">Today</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="thisWeek">This Week</option>
              </select>
            </div>
          </div>
        </div>

        {/* Urgent Reminders */}
        {urgentAppointments.length > 0 && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
            <h3 className="text-sm font-medium text-blue-800">
              🔔 Appointment Reminders
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              {urgentAppointments.map((appointment) => {
                const reminder = getReminderMessage(appointment);
                return (
                  <div key={appointment.id} className="mb-1">
                    <span className="font-medium">{reminder.message}</span> -{" "}
                    {appointment.clinic_name}
                    {reminder.urgent && (
                      <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                        URGENT
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Appointments List */}
        <div className="space-y-6">
          {filteredAppointments.map((appointment) => {
            const reminder = getReminderMessage(appointment);

            return (
              <div
                key={appointment.id}
                className={`bg-white rounded-lg shadow border p-6 ${
                  reminder.urgent
                    ? "border-orange-200 bg-orange-50"
                    : "border-gray-200"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {appointment.services?.map((s) => s.name).join(", ") ||
                          "Appointment"}
                      </h3>
                      {reminder.urgent && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            reminder.type === "today"
                              ? "bg-red-100 text-red-800"
                              : "bg-orange-100 text-orange-800"
                          }`}
                        >
                          {reminder.type === "today" ? "TODAY" : "TOMORROW"}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 font-medium">
                      {reminder.message}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      appointment.status === "confirmed"
                        ? "bg-green-100 text-green-800"
                        : appointment.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {appointment.status.toUpperCase()}
                  </span>
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-3">
                    <div className="text-gray-600">
                      <strong>Doctor:</strong>{" "}
                      {appointment.doctor_name || "N/A"}
                    </div>
                    <div className="text-gray-600">
                      <strong>Clinic:</strong>{" "}
                      {appointment.clinic_name || "N/A"}
                    </div>
                    <div className="text-gray-600">
                      <strong>Address:</strong>{" "}
                      {appointment.clinic_address || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="text-gray-600">
                      <strong>Date:</strong>{" "}
                      {formatDate(appointment.appointment_date)}
                    </div>
                    <div className="text-gray-600">
                      <strong>Time:</strong>{" "}
                      {formatTime(appointment.appointment_time)}
                      {appointment.duration_minutes &&
                        ` (${appointment.duration_minutes} min)`}
                    </div>
                    <div className="text-gray-600">
                      <strong>Phone:</strong>{" "}
                      {appointment.clinic_phone || "N/A"}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {appointment.notes && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Notes:</h4>
                    <p className="text-gray-600">{appointment.notes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleViewDetails(appointment)}
                    className="px-4 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => handleDownloadDetails(appointment)}
                    className="px-4 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Download
                  </button>
                  {(appointment.status === "confirmed" ||
                    appointment.status === "pending") && (
                    <button
                      onClick={() => handleCancelAppointment(appointment)}
                      className="px-4 py-2 border border-red-300 rounded-md bg-white text-sm font-medium text-red-700 hover:bg-red-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Cancel Modal */}
        {cancelModal.isOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-md p-6 w-96 max-w-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Cancel Appointment
              </h3>

              {!cancelModal.canCancel ? (
                <div>
                  <div className="text-red-700 mb-4">{cancelModal.reason}</div>
                  <p className="text-gray-600 mb-6">
                    Please contact the clinic directly to discuss cancellation
                    options.
                  </p>
                  <div className="flex justify-end">
                    <button
                      onClick={() =>
                        setCancelModal({
                          isOpen: false,
                          appointment: null,
                          canCancel: true,
                          reason: "",
                        })
                      }
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-700 mb-4">
                    Are you sure you want to cancel your appointment with{" "}
                    <span className="font-medium">
                      {cancelModal.appointment?.clinic_name}
                    </span>
                    ?
                  </p>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for cancellation:
                    </label>
                    <textarea
                      value={cancelModal.reason}
                      onChange={(e) =>
                        setCancelModal((prev) => ({
                          ...prev,
                          reason: e.target.value,
                        }))
                      }
                      placeholder="Please provide a reason for cancellation..."
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() =>
                        setCancelModal({
                          isOpen: false,
                          appointment: null,
                          canCancel: true,
                          reason: "",
                        })
                      }
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Keep Appointment
                    </button>
                    <button
                      onClick={() =>
                        confirmCancelAppointment(
                          cancelModal.appointment?.id,
                          cancelModal.reason
                        )
                      }
                      disabled={!cancelModal.reason.trim() || cancelLoading}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      {cancelLoading ? "Cancelling..." : "Confirm Cancel"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Details Modal */}
        {selectedAppointment && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-md p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Appointment Details
                </h2>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service
                    </label>
                    <div className="text-gray-900">
                      {selectedAppointment.services
                        ?.map((s) => s.name)
                        .join(", ") || "N/A"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Doctor
                    </label>
                    <div className="text-gray-900">
                      {selectedAppointment.doctor_name || "N/A"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Clinic
                    </label>
                    <div className="text-gray-900">
                      {selectedAppointment.clinic_name || "N/A"}
                    </div>
                    <div className="text-sm text-gray-600">
                      {selectedAppointment.clinic_address || "N/A"}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date & Time
                    </label>
                    <div className="text-gray-900">
                      {formatDate(selectedAppointment.appointment_date)}
                    </div>
                    <div className="text-gray-900">
                      {formatTime(selectedAppointment.appointment_time)}
                      {selectedAppointment.duration_minutes &&
                        ` (${selectedAppointment.duration_minutes} min)`}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <div className="text-gray-900 capitalize">
                      {selectedAppointment.status}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact
                    </label>
                    <div className="text-gray-900">
                      📞 {selectedAppointment.clinic_phone || "N/A"}
                    </div>
                    <div className="text-gray-900">
                      ✉️ {selectedAppointment.clinic_email || "N/A"}
                    </div>
                  </div>
                </div>
              </div>

              {selectedAppointment.notes && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <div className="text-gray-900">
                    {selectedAppointment.notes}
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => handleDownloadDetails(selectedAppointment)}
                  className="px-4 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Download Details
                </button>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpcomingAppointments;
