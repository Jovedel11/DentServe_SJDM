import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { usePatientAppointments } from "@/core/hooks/usePatientAppointment";
import { useAppointmentCancellation } from "@/core/hooks/useAppointmentCancellation";
import { useAppointmentRealtime } from "@/core/hooks/useAppointmentRealtime";
import { supabase } from "@/lib/supabaseClient";

const UpcomingAppointments = () => {
  const { user, profile, isPatient } = useAuth();

  // ✅ FIXED: Use proper hooks for upcoming appointments only
  const {
    appointments,
    loading: appointmentsLoading,
    error: appointmentsError,
    stats,
    refresh: refreshAppointments,
    getAppointmentDetails,
    cancelAppointment: hookCancelAppointment,
    canCancelAppointment: hookCheckCanCancel,
  } = usePatientAppointments();

  // ✅ FIXED: Use cancellation hook properly
  const {
    loading: cancelLoading,
    error: cancelError,
    cancelAppointment: cancellationHookCancel,
    checkCancellationEligibility,
  } = useAppointmentCancellation();

  const { enableRealtimeUpdates, disableRealtimeUpdates, isConnected } =
    useAppointmentRealtime({
      onAppointmentUpdate: useCallback(
        (update) => {
          console.log("Real-time appointment update:", update);
          refreshAppointments();
        },
        [refreshAppointments]
      ),
      onAppointmentStatusChange: useCallback(
        (statusUpdate) => {
          console.log("Appointment status changed:", statusUpdate);
          showToast(`Appointment status changed to ${statusUpdate.newStatus}`);
          refreshAppointments();
        },
        [refreshAppointments]
      ),
      enableAppointments: true,
      enableNotifications: true,
    });

  // ✅ STATE MANAGEMENT
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [ongoingTreatments, setOngoingTreatments] = useState([]);
  const [treatmentsLoading, setTreatmentsLoading] = useState(false);
  const [treatmentsError, setTreatmentsError] = useState(null);
  const [cancelModal, setCancelModal] = useState({
    isOpen: false,
    appointment: null,
    canCancel: true,
    reason: "",
    eligibilityChecked: false,
  });
  const [toastMessage, setToastMessage] = useState("");

  // ✅ FIXED: Fetch ongoing treatments with proper error handling
  const fetchOngoingTreatments = useCallback(async () => {
    if (!isPatient()) return;

    try {
      setTreatmentsLoading(true);
      setTreatmentsError(null);

      const { data, error } = await supabase.rpc("get_ongoing_treatments");

      if (error) {
        console.error("RPC Error:", error);
        throw new Error(error.message);
      }

      if (data?.authenticated === false) {
        throw new Error("Authentication required");
      }

      if (!data?.success) {
        throw new Error(data?.error || "Failed to fetch treatments");
      }

      console.log("Ongoing treatments data:", data.data);
      setOngoingTreatments(data.data?.treatments || []);
    } catch (err) {
      console.error("Error fetching ongoing treatments:", err);
      setTreatmentsError(err.message);
    } finally {
      setTreatmentsLoading(false);
    }
  }, [isPatient]);

  // ✅ INITIALIZATION
  useEffect(() => {
    if (!user || !isPatient()) {
      console.warn("Access denied: Not a patient or not authenticated");
      return;
    }

    fetchOngoingTreatments();
    enableRealtimeUpdates();

    return () => disableRealtimeUpdates();
  }, [
    user,
    isPatient,
    fetchOngoingTreatments,
    enableRealtimeUpdates,
    disableRealtimeUpdates,
  ]);

  // ✅ FILTER ONLY UPCOMING APPOINTMENTS (remove past appointments)
  const upcomingAppointments = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];

    return appointments.filter((apt) => {
      // Only upcoming appointments (pending or confirmed, and future dates)
      const isUpcoming =
        ["pending", "confirmed"].includes(apt.status) &&
        apt.appointment_date >= today;
      return isUpcoming;
    });
  }, [appointments]);

  // ✅ SEARCH FILTERING
  const filteredAppointments = useMemo(() => {
    let filtered = upcomingAppointments;

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (apt) =>
          apt.services?.some((service) =>
            service.name?.toLowerCase().includes(query)
          ) ||
          apt.doctor?.name?.toLowerCase().includes(query) ||
          apt.clinic?.name?.toLowerCase().includes(query) ||
          apt.symptoms?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [upcomingAppointments, searchTerm]);

  // ✅ URGENT APPOINTMENTS (today and tomorrow)
  const urgentAppointments = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    return upcomingAppointments.filter(
      (apt) =>
        apt.appointment_date === today || apt.appointment_date === tomorrowStr
    );
  }, [upcomingAppointments]);

  // ✅ UTILITY FUNCTIONS
  const showToast = useCallback((message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(""), 3000);
  }, []);

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

  // ✅ FIXED: Cancellation logic with proper eligibility checking
  const handleCancelAppointment = useCallback(
    async (appointment) => {
      try {
        console.log(
          "Checking cancellation eligibility for appointment:",
          appointment.id
        );

        // Check eligibility using cancellation hook
        const eligibility = await checkCancellationEligibility(appointment.id);
        console.log("Eligibility result:", eligibility);

        setCancelModal({
          isOpen: true,
          appointment,
          canCancel: eligibility.canCancel,
          reason: "", // Start with empty reason for input
          eligibilityMessage: eligibility.canCancel ? null : eligibility.reason,
          eligibilityChecked: true,
        });
      } catch (err) {
        console.error("Error checking cancellation eligibility:", err);
        showToast("Failed to check cancellation eligibility");
      }
    },
    [checkCancellationEligibility, showToast]
  );

  // ✅ FIXED: Actual cancellation with reason validation
  const confirmCancelAppointment = useCallback(
    async (appointmentId, cancellationReason) => {
      if (!cancellationReason || cancellationReason.trim() === "") {
        showToast("Please provide a cancellation reason");
        return;
      }

      try {
        console.log(
          "Attempting to cancel appointment:",
          appointmentId,
          "with reason:",
          cancellationReason
        );

        // Try the cancellation hook first
        const hookResult = await hookCancelAppointment(
          appointmentId,
          cancellationReason.trim()
        );
        console.log("Hook cancellation result:", hookResult);

        if (hookResult?.success) {
          setCancelModal({
            isOpen: false,
            appointment: null,
            canCancel: true,
            reason: "",
            eligibilityChecked: false,
          });
          showToast("Appointment cancelled successfully");
          refreshAppointments();
          return;
        }

        // Fallback to cancellation hook
        const fallbackResult = await cancellationHookCancel(
          appointmentId,
          cancellationReason.trim()
        );
        console.log("Fallback cancellation result:", fallbackResult);

        if (fallbackResult?.success) {
          setCancelModal({
            isOpen: false,
            appointment: null,
            canCancel: true,
            reason: "",
            eligibilityChecked: false,
          });
          showToast("Appointment cancelled successfully");
          refreshAppointments();
        } else {
          showToast(fallbackResult?.error || "Failed to cancel appointment");
        }
      } catch (error) {
        console.error("Error cancelling appointment:", error);
        showToast("An error occurred while cancelling");
      }
    },
    [
      hookCancelAppointment,
      cancellationHookCancel,
      showToast,
      refreshAppointments,
    ]
  );

  const handleViewDetails = useCallback(
    (appointment) => {
      const detailedAppointment = getAppointmentDetails(appointment.id);
      setSelectedAppointment(detailedAppointment || appointment);
    },
    [getAppointmentDetails]
  );

  const handleDownloadDetails = useCallback(
    (appointment) => {
      const details = `
APPOINTMENT DETAILS
==================
Service: ${appointment.services?.map((s) => s.name).join(", ") || "N/A"}
Doctor: ${appointment.doctor?.name || "N/A"}
Clinic: ${appointment.clinic?.name || "N/A"}
Address: ${appointment.clinic?.address || "N/A"}
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
Phone: ${appointment.clinic?.phone || "N/A"}
Email: ${appointment.clinic?.email || "N/A"}
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
      <div>
        <h1>Access Denied</h1>
        <p>You need to be a verified patient to view appointments.</p>
      </div>
    );
  }

  // ✅ ERROR STATE
  if (appointmentsError) {
    return (
      <div>
        <h1>Error Loading Appointments</h1>
        <p>Error: {appointmentsError}</p>
        <button onClick={refreshAppointments}>Try Again</button>
      </div>
    );
  }

  // ✅ LOADING STATE
  if (appointmentsLoading) {
    return <div>Loading appointments...</div>;
  }

  // ✅ EMPTY STATE
  if (
    filteredAppointments.length === 0 &&
    ongoingTreatments.length === 0 &&
    !appointmentsLoading
  ) {
    return (
      <div>
        <h3>No Upcoming Appointments</h3>
        <p>
          {searchTerm
            ? "Try adjusting your search terms."
            : "You don't have any upcoming appointments scheduled."}
        </p>
        <button>Book New Appointment</button>
      </div>
    );
  }

  // ✅ MAIN RENDER
  return (
    <div>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            zIndex: 1000,
            backgroundColor: "green",
            color: "white",
            padding: "10px 20px",
            borderRadius: "5px",
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div>
        <h1>Upcoming Appointments</h1>
        <p>
          Manage your scheduled appointments and ongoing treatments •{" "}
          {upcomingAppointments.length} upcoming
        </p>
        <button onClick={refreshAppointments} disabled={appointmentsLoading}>
          {appointmentsLoading ? "Refreshing..." : "Refresh"}
        </button>
        {isConnected && <span>Live Updates Active</span>}
      </div>

      {/* Stats */}
      <div>
        <div>
          <h3>Total Upcoming</h3>
          <p>{upcomingAppointments.length}</p>
        </div>
        <div>
          <h3>Pending</h3>
          <p>
            {upcomingAppointments.filter((a) => a.status === "pending").length}
          </p>
        </div>
        <div>
          <h3>Confirmed</h3>
          <p>
            {
              upcomingAppointments.filter((a) => a.status === "confirmed")
                .length
            }
          </p>
        </div>
        <div>
          <h3>Ongoing Treatments</h3>
          <p>{ongoingTreatments.length}</p>
        </div>
      </div>

      {/* ✅ ONGOING TREATMENTS SECTION */}
      {treatmentsLoading && <div>Loading treatments...</div>}
      {treatmentsError && (
        <div>Error loading treatments: {treatmentsError}</div>
      )}

      {ongoingTreatments.length > 0 && (
        <div>
          <h2>Ongoing Treatments</h2>
          {ongoingTreatments.map((treatment) => (
            <div
              key={treatment.id}
              style={{
                border: "1px solid #ccc",
                padding: "15px",
                margin: "10px 0",
              }}
            >
              <h3>{treatment.treatment_type}</h3>
              <p>Doctor: {treatment.doctor_name}</p>
              <p>Clinic: {treatment.clinic_name}</p>
              <p>
                Progress: {treatment.completed_sessions}/
                {treatment.total_sessions} sessions ({treatment.progress}%)
              </p>

              {treatment.next_appointment && (
                <div
                  style={{
                    backgroundColor: "#f0f0f0",
                    padding: "10px",
                    marginTop: "10px",
                  }}
                >
                  <strong>Next Session:</strong>
                  <p>
                    {formatDate(treatment.next_appointment.date)} at{" "}
                    {formatTime(treatment.next_appointment.time)}
                  </p>
                  <p>Service: {treatment.next_appointment.service_name}</p>
                  <p>Duration: {treatment.next_appointment.duration}</p>
                  {treatment.next_appointment.cancellable && (
                    <button>Cancel Next Session</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search appointments, doctors, or clinics..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm("")}>Clear search</button>
        )}
      </div>

      {/* Urgent Reminders */}
      {urgentAppointments.length > 0 && (
        <div
          style={{
            backgroundColor: "#fff3cd",
            padding: "15px",
            border: "1px solid #ffeaa7",
          }}
        >
          <h3>🔔 Appointment Reminders</h3>
          {urgentAppointments.map((appointment) => {
            const reminder = getReminderMessage(appointment);
            return (
              <div key={appointment.id}>
                <span>{reminder.message}</span> - {appointment.clinic?.name}
                {reminder.urgent && (
                  <span style={{ color: "red" }}> [URGENT]</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Appointments List */}
      <div>
        {filteredAppointments.map((appointment) => {
          const reminder = getReminderMessage(appointment);

          return (
            <div
              key={appointment.id}
              style={{
                border: "1px solid #ddd",
                padding: "20px",
                margin: "10px 0",
                backgroundColor: reminder.urgent ? "#fff5f5" : "#fff",
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <h3>
                    {appointment.services?.map((s) => s.name).join(", ") ||
                      "Appointment"}
                  </h3>
                  {reminder.urgent && (
                    <span
                      style={{
                        backgroundColor:
                          reminder.type === "today" ? "#ff6b6b" : "#ffa500",
                        color: "white",
                        padding: "2px 8px",
                        borderRadius: "10px",
                        fontSize: "12px",
                      }}
                    >
                      {reminder.type === "today" ? "TODAY" : "TOMORROW"}
                    </span>
                  )}
                  <p>{reminder.message}</p>
                </div>
                <span
                  style={{
                    backgroundColor:
                      appointment.status === "confirmed"
                        ? "#d4edda"
                        : appointment.status === "pending"
                        ? "#fff3cd"
                        : "#f8f9fa",
                    color:
                      appointment.status === "confirmed"
                        ? "#155724"
                        : appointment.status === "pending"
                        ? "#856404"
                        : "#495057",
                    padding: "4px 12px",
                    borderRadius: "15px",
                    fontSize: "12px",
                  }}
                >
                  {appointment.status.toUpperCase()}
                </span>
              </div>

              {/* Details */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "20px",
                  marginTop: "15px",
                }}
              >
                <div>
                  <p>
                    <strong>Doctor:</strong> {appointment.doctor?.name || "N/A"}
                  </p>
                  <p>
                    <strong>Clinic:</strong> {appointment.clinic?.name || "N/A"}
                  </p>
                  <p>
                    <strong>Address:</strong>{" "}
                    {appointment.clinic?.address || "N/A"}
                  </p>
                </div>
                <div>
                  <p>
                    <strong>Date:</strong>{" "}
                    {formatDate(appointment.appointment_date)}
                  </p>
                  <p>
                    <strong>Time:</strong>{" "}
                    {formatTime(appointment.appointment_time)}
                    {appointment.duration_minutes &&
                      ` (${appointment.duration_minutes} min)`}
                  </p>
                  <p>
                    <strong>Phone:</strong> {appointment.clinic?.phone || "N/A"}
                  </p>
                </div>
              </div>

              {/* Notes */}
              {appointment.notes && (
                <div
                  style={{
                    marginTop: "15px",
                    padding: "10px",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "5px",
                  }}
                >
                  <h4>Notes:</h4>
                  <p>{appointment.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div
                style={{
                  marginTop: "15px",
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <button onClick={() => handleViewDetails(appointment)}>
                  View Details
                </button>
                <button onClick={() => handleDownloadDetails(appointment)}>
                  Download
                </button>
                {["confirmed", "pending"].includes(appointment.status) && (
                  <button
                    onClick={() => handleCancelAppointment(appointment)}
                    style={{ color: "red", borderColor: "red" }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ✅ FIXED: Cancel Modal with proper reason handling */}
      {cancelModal.isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "8px",
              minWidth: "400px",
              maxWidth: "500px",
            }}
          >
            <h3>Cancel Appointment</h3>

            {!cancelModal.canCancel ? (
              <div>
                <div style={{ color: "red", marginBottom: "15px" }}>
                  {cancelModal.eligibilityMessage ||
                    "Outside cancellation window"}
                </div>
                <p>
                  Please contact the clinic directly to discuss cancellation
                  options.
                </p>
                <div style={{ textAlign: "right", marginTop: "20px" }}>
                  <button
                    onClick={() =>
                      setCancelModal({
                        isOpen: false,
                        appointment: null,
                        canCancel: true,
                        reason: "",
                        eligibilityChecked: false,
                      })
                    }
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p>
                  Are you sure you want to cancel your appointment with{" "}
                  <strong>{cancelModal.appointment?.clinic?.name}</strong>?
                </p>

                <div style={{ margin: "20px 0" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "bold",
                    }}
                  >
                    Reason for cancellation: *
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
                    rows="4"
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      resize: "vertical",
                    }}
                    required
                  />
                  {!cancelModal.reason.trim() && (
                    <small style={{ color: "red" }}>
                      Cancellation reason is required
                    </small>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    onClick={() =>
                      setCancelModal({
                        isOpen: false,
                        appointment: null,
                        canCancel: true,
                        reason: "",
                        eligibilityChecked: false,
                      })
                    }
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
                    style={{
                      backgroundColor: "red",
                      color: "white",
                      opacity:
                        !cancelModal.reason.trim() || cancelLoading ? 0.5 : 1,
                    }}
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
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "8px",
              maxWidth: "600px",
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h2>Appointment Details</h2>
              <button
                onClick={() => setSelectedAppointment(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "30px",
              }}
            >
              <div>
                <h4>Service Information</h4>
                <p>
                  <strong>Services:</strong>{" "}
                  {selectedAppointment.services
                    ?.map((s) => s.name)
                    .join(", ") || "N/A"}
                </p>
                <p>
                  <strong>Status:</strong> {selectedAppointment.status}
                </p>

                <h4 style={{ marginTop: "20px" }}>Healthcare Provider</h4>
                <p>
                  <strong>Doctor:</strong>{" "}
                  {selectedAppointment.doctor?.name || "N/A"}
                </p>
                <p>
                  <strong>Clinic:</strong>{" "}
                  {selectedAppointment.clinic?.name || "N/A"}
                </p>
                <p>
                  <strong>Address:</strong>{" "}
                  {selectedAppointment.clinic?.address || "N/A"}
                </p>
              </div>

              <div>
                <h4>Schedule</h4>
                <p>
                  <strong>Date:</strong>{" "}
                  {formatDate(selectedAppointment.appointment_date)}
                </p>
                <p>
                  <strong>Time:</strong>{" "}
                  {formatTime(selectedAppointment.appointment_time)}
                  {selectedAppointment.duration_minutes &&
                    ` (${selectedAppointment.duration_minutes} min)`}
                </p>

                <h4 style={{ marginTop: "20px" }}>Contact Information</h4>
                <p>
                  <strong>Phone:</strong>{" "}
                  {selectedAppointment.clinic?.phone || "N/A"}
                </p>
                <p>
                  <strong>Email:</strong>{" "}
                  {selectedAppointment.clinic?.email || "N/A"}
                </p>
              </div>
            </div>

            {selectedAppointment.notes && (
              <div style={{ marginTop: "20px" }}>
                <h4>Notes</h4>
                <p>{selectedAppointment.notes}</p>
              </div>
            )}

            <div style={{ marginTop: "30px", textAlign: "right" }}>
              <button
                onClick={() => handleDownloadDetails(selectedAppointment)}
                style={{ marginRight: "10px" }}
              >
                Download Details
              </button>
              <button onClick={() => setSelectedAppointment(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpcomingAppointments;
