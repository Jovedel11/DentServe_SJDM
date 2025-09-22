import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { usePatientAppointments } from "@/core/hooks/usePatientAppointment";
import { useAppointmentCancellation } from "@/core/hooks/useAppointmentCancellation";
import { useAppointmentRealtime } from "@/core/hooks/useAppointmentRealtime";
import { supabase } from "@/lib/supabaseClient";

export const useAppointmentManagement = () => {
  const { user, profile, isPatient } = useAuth();
  
  // Hook integrations
  const appointmentHook = usePatientAppointments();
  const cancellationHook = useAppointmentCancellation();
  
  // Local state
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

  // Toast helpers
  const showToast = useCallback((message, type = "info") => {
    setToastMessage({ message, type });
  }, []);

  const closeToast = useCallback(() => {
    setToastMessage("");
  }, []);

  // Real-time updates
  const { enableRealtimeUpdates, disableRealtimeUpdates, isConnected } =
    useAppointmentRealtime({
      onAppointmentUpdate: useCallback(
        (update) => {
          console.log("Real-time appointment update:", update);
          appointmentHook.refresh();
        },
        [appointmentHook]
      ),
      onAppointmentStatusChange: useCallback(
        (statusUpdate) => {
          console.log("Appointment status changed:", statusUpdate);
          showToast(
            `Appointment status changed to ${statusUpdate.newStatus}`,
            "info"
          );
          appointmentHook.refresh();
        },
        [appointmentHook, showToast]
      ),
      enableAppointments: true,
      enableNotifications: true,
    });

  // Fetch ongoing treatments
  const fetchOngoingTreatments = useCallback(async () => {
    if (!isPatient()) return;

    try {
      setTreatmentsLoading(true);
      setTreatmentsError(null);

      const { data, error } = await supabase.rpc("get_ongoing_treatments");

      if (error) throw new Error(error.message);
      if (data?.authenticated === false) throw new Error("Authentication required");
      if (!data?.success) throw new Error(data?.error || "Failed to fetch treatments");

      setOngoingTreatments(data.data?.treatments || []);
    } catch (err) {
      console.error("Error fetching ongoing treatments:", err);
      setTreatmentsError(err.message);
    } finally {
      setTreatmentsLoading(false);
    }
  }, [isPatient]);

  // Computed values
  const upcomingAppointments = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return appointmentHook.appointments.filter((apt) => {
      return ["pending", "confirmed"].includes(apt.status) && 
            apt.appointment_date >= today;
    });
  }, [appointmentHook.appointments]);

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

  const stats = useMemo(() => ({
    total: upcomingAppointments.length,
    pending: upcomingAppointments.filter((a) => a.status === "pending").length,
    confirmed: upcomingAppointments.filter((a) => a.status === "confirmed").length,
    ongoingTreatments: ongoingTreatments.length,
  }), [upcomingAppointments, ongoingTreatments]);

  // Event handlers
  const handleCancelAppointment = useCallback(
    async (appointment) => {
      try {
        const eligibility = await cancellationHook.checkCancellationEligibility(appointment.id);
        
        setCancelModal({
          isOpen: true,
          appointment,
          canCancel: eligibility.canCancel,
          reason: "",
          eligibilityMessage: eligibility.canCancel ? null : eligibility.reason,
          eligibilityChecked: true,
        });
      } catch (err) {
        console.error("Error checking cancellation eligibility:", err);
        showToast("Failed to check cancellation eligibility", "error");
      }
    },
    [cancellationHook, showToast]
  );

  const confirmCancelAppointment = useCallback(
    async (appointmentId, cancellationReason) => {
      if (!cancellationReason || cancellationReason.trim() === "") {
        showToast("Please provide a cancellation reason", "warning");
        return;
      }

      try {
        const hookResult = await appointmentHook.cancelAppointment(
          appointmentId,
          cancellationReason.trim()
        );

        if (hookResult?.success) {
          setCancelModal({
            isOpen: false,
            appointment: null,
            canCancel: true,
            reason: "",
            eligibilityChecked: false,
          });
          showToast("Appointment cancelled successfully", "success");
          appointmentHook.refresh();
          return;
        }

        const fallbackResult = await cancellationHook.cancelAppointment(
          appointmentId,
          cancellationReason.trim()
        );

        if (fallbackResult?.success) {
          setCancelModal({
            isOpen: false,
            appointment: null,
            canCancel: true,
            reason: "",
            eligibilityChecked: false,
          });
          showToast("Appointment cancelled successfully", "success");
          appointmentHook.refresh();
        } else {
          showToast(
            fallbackResult?.error || "Failed to cancel appointment",
            "error"
          );
        }
      } catch (error) {
        console.error("Error cancelling appointment:", error);
        showToast("An error occurred while cancelling", "error");
      }
    },
    [appointmentHook, cancellationHook, showToast]
  );

  const handleViewDetails = useCallback(
    (appointment) => {
      const detailedAppointment = appointmentHook.getAppointmentDetails(appointment.id);
      setSelectedAppointment(detailedAppointment || appointment);
    },
    [appointmentHook]
  );

  const closeCancelModal = useCallback(() => {
    setCancelModal({
      isOpen: false,
      appointment: null,
      canCancel: true,
      reason: "",
      eligibilityChecked: false,
    });
  }, []);

  // Effects
  useEffect(() => {
    if (!user || !isPatient()) return;

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

  return {
    // Auth
    user,
    profile,
    isPatient,
    
    // Appointment data
    ...appointmentHook,
    upcomingAppointments,
    filteredAppointments,
    urgentAppointments,
    stats,
    
    // Treatments
    ongoingTreatments,
    treatmentsLoading,
    treatmentsError,
    fetchOngoingTreatments,
    
    // Search
    searchTerm,
    setSearchTerm,
    
    // Modals
    selectedAppointment,
    setSelectedAppointment,
    cancelModal,
    setCancelModal,
    
    // Real-time
    isConnected,
    
    // Toast
    toastMessage,
    showToast,
    closeToast,
    
    // Actions
    handleCancelAppointment,
    confirmCancelAppointment,
    handleViewDetails,
    closeCancelModal,
  };
};