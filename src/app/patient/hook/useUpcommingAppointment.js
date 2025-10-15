import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { usePatientAppointments } from "@/hooks/appointment/usePatientAppointment";
import { useAppointmentCancellation } from "@/hooks/appointment/useAppointmentCancellation";
import { useAppointmentRealtime } from "@/hooks/appointment/useAppointmentRealtime";
import { useTreatmentPlans } from "@/hooks/appointment/useTreatmentPlans";  // ✅ ADD THIS
import { supabase } from "@/lib/supabaseClient";

export const useAppointmentManagement = () => {
  const { user, profile, isPatient } = useAuth();
  
  // Hook integrations
  const appointmentHook = usePatientAppointments();
  const cancellationHook = useAppointmentCancellation();
  const { followUpBooking, startFollowUpBooking } = useTreatmentPlans();  // ✅ ADD THIS
  
  // Local state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bookingTypeFilter, setBookingTypeFilter] = useState("all");
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [selectedTreatment, setSelectedTreatment] = useState(null);
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
  const fetchOngoingTreatments = useCallback(async () => {
    if (!isPatient || !profile?.user_id) return;
  
    try {
      setTreatmentsLoading(true);
      setTreatmentsError(null);
  
      const { data, error } = await supabase.rpc("get_ongoing_treatments", {
        p_patient_id: profile.user_id,
        p_include_paused: false
      });
  
      if (error) throw new Error(error.message);
      if (data?.authenticated === false) throw new Error("Authentication required");
      if (!data?.success) throw new Error(data?.error || "Failed to fetch treatments");
  
      const treatments = data.data?.ongoing_treatments || [];
      setOngoingTreatments(treatments);
    } catch (err) {
      console.error("Error fetching ongoing treatments:", err);
      setTreatmentsError(err.message);
    } finally {
      setTreatmentsLoading(false);
    }
  }, [isPatient, profile?.user_id]);

  // ✅ NOW: Real-time updates can reference fetchOngoingTreatments
  const { enableRealtimeUpdates, disableRealtimeUpdates, isConnected } =
  useAppointmentRealtime({
    onAppointmentUpdate: useCallback(
      (update) => {
        console.log("Real-time appointment update:", update);
        
        // ✅ ENHANCED: Check if the update affects ongoing treatments
        const affectsOngoingTreatments = 
          update.new?.status !== update.old?.status || // Status changed
          update.new?.treatment_plan_id != null;        // Has treatment plan
        
        if (affectsOngoingTreatments) {
          console.log("🔄 Treatment-related update detected, refreshing...");
          fetchOngoingTreatments(); // ✅ Refresh treatments
        }
        
        appointmentHook.refresh(); // ✅ Always refresh appointments
      },
      [appointmentHook, fetchOngoingTreatments]
    ),
    onAppointmentStatusChange: useCallback(
      (statusUpdate) => {
        console.log("Appointment status changed:", statusUpdate);
        
        // ✅ ENHANCED: Show appropriate message
        const messageMap = {
          pending: "Your appointment is pending approval",
          confirmed: "Your appointment has been confirmed!",
          cancelled: "Your appointment has been cancelled",
          completed: "Your appointment has been completed"
        };
        
        showToast(
          messageMap[statusUpdate.newStatus] || `Appointment status: ${statusUpdate.newStatus}`,
          statusUpdate.newStatus === 'confirmed' ? "success" : 
          statusUpdate.newStatus === 'cancelled' ? "warning" : "info"
        );
        
        // ✅ Refresh both appointments and treatments
        appointmentHook.refresh();
        fetchOngoingTreatments();
      },
      [appointmentHook, showToast, fetchOngoingTreatments]
    ),
    enableAppointments: true,
    enableNotifications: true,
  });

  // Fetch detailed treatment plan
  const fetchTreatmentDetails = useCallback(async (treatmentId) => {
    try {
      const { data, error } = await supabase.rpc('get_treatment_plan_details', {
        p_treatment_plan_id: treatmentId
      });
  
      if (error) throw error;
      
      // ✅ FIX: Extract actual data from nested response
      if (data?.success && data?.data) {
        return { success: true, data: data.data };
      }
      
      // ✅ Handle case where data is already unwrapped
      if (data && !data.success && !data.error) {
        return { success: true, data };
      }
      
      return { success: false, error: data?.error || 'Invalid response format' };
    } catch (err) {
      console.error('Error fetching treatment details:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Computed values
  const upcomingAppointments = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    
    const filtered = appointmentHook.appointments.filter((apt) => {
      const hasValidStatus = ["pending", "confirmed"].includes(apt.status);
      const isFutureOrToday = apt.appointment_date >= today;
      
      return hasValidStatus && isFutureOrToday;
    });

    console.log('📋 Upcoming Appointments Filter:', {
      totalAppointments: appointmentHook.appointments.length,
      filteredCount: filtered.length,
      pending: filtered.filter(a => a.status === 'pending').length,
      confirmed: filtered.filter(a => a.status === 'confirmed').length,
      withTreatmentPlan: filtered.filter(a => a.treatment_plan).length,
      today
    });

    return filtered;
  }, [appointmentHook.appointments]);

  // Enhanced filter
  const filteredAppointments = useMemo(() => {
    let filtered = upcomingAppointments;
  
    if (statusFilter !== "all") {
      filtered = filtered.filter(apt => apt.status === statusFilter);
    }

    if (bookingTypeFilter !== "all") {
      if (bookingTypeFilter === "with_services") {
        filtered = filtered.filter(apt => 
          ['consultation_with_service', 'service_only'].includes(apt.booking_type)
        );
      } else {
        filtered = filtered.filter(apt => apt.booking_type === bookingTypeFilter);
      }
    }

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (apt) =>
          (apt.services && apt.services.length > 0 && apt.services.some((service) =>
            service.name?.toLowerCase().includes(query)
          )) ||
          apt.doctor?.name?.toLowerCase().includes(query) ||
          apt.clinic?.name?.toLowerCase().includes(query) ||
          apt.symptoms?.toLowerCase().includes(query) ||
          apt.booking_type?.toLowerCase().includes(query)
      );
    }
  
    return filtered.sort((a, b) => {
      const dateA = new Date(`${a.appointment_date}T${a.appointment_time}`);
      const dateB = new Date(`${b.appointment_date}T${b.appointment_time}`);
      return dateA - dateB;
    });
  }, [upcomingAppointments, searchTerm, statusFilter, bookingTypeFilter]);

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

  const stats = useMemo(() => {
    const consultationOnly = upcomingAppointments.filter(
      a => a.booking_type === 'consultation_only'
    ).length;

    const withServices = upcomingAppointments.filter(
      a => ['consultation_with_service', 'service_only'].includes(a.booking_type)
    ).length;

    const treatmentFollowUps = upcomingAppointments.filter(
      a => a.booking_type === 'treatment_plan_follow_up'
    ).length;

    const linkedToTreatmentPlan = upcomingAppointments.filter(
      a => a.treatment_plan != null
    ).length;

    const overduetreatments = ongoingTreatments.filter(t => {
      // Use timeline.is_overdue from database
      if (t.timeline?.is_overdue) return true;
      
      // Fallback: Check if next_visit_date is in the past
      if (t.next_visit_date) {
        return new Date(t.next_visit_date) < new Date();
      }

      const hasActiveNextAppointment = t.next_appointment && 
      ['pending', 'confirmed'].includes(t.next_appointment.status);
      
      // Check if no next appointment and requires scheduling
      return t.requires_scheduling && !hasActiveNextAppointment;
    }).length;

    const result = {
      total: upcomingAppointments.length,
      pending: upcomingAppointments.filter((a) => a.status === "pending").length,
      confirmed: upcomingAppointments.filter((a) => a.status === "confirmed").length,
      ongoingTreatments: ongoingTreatments.length,
      consultationOnly,
      withServices,
      treatmentFollowUps,
      linkedToTreatmentPlan,
      urgentCount: urgentAppointments.length,
      overduetreatments,
    };

    console.log('📊 Appointment Stats:', result);
    
    return result;
  }, [upcomingAppointments, ongoingTreatments, urgentAppointments]);

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
          fetchOngoingTreatments();
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
          fetchOngoingTreatments();
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
    [appointmentHook, cancellationHook, showToast, fetchOngoingTreatments]
  );

  const handleViewDetails = useCallback(
    (appointment) => {
      const detailedAppointment = appointmentHook.getAppointmentDetails(appointment.id);
      setSelectedAppointment(detailedAppointment || appointment);
    },
    [appointmentHook]
  );

  const handleViewTreatmentPlan = useCallback(async (treatment) => {
    const details = await fetchTreatmentDetails(treatment.id);
    if (details.success) {
      setSelectedTreatment(details.data);
    } else {
      showToast("Failed to load treatment details", "error");
    }
  }, [fetchTreatmentDetails, showToast]);

  // ✅ NEW: Handle follow-up booking
  const handleBookFollowUp = useCallback(async (treatmentId) => {
    try {
      setTreatmentsLoading(true);
      const result = await startFollowUpBooking(treatmentId);
      
      if (!result.success) {
        showToast(result.error || "Failed to load booking information", "error");
        setTreatmentsLoading(false);
        return { success: false, error: result.error };
      }
      
      setTreatmentsLoading(false);
      return { success: true, bookingInfo: result.info };
    } catch (err) {
      console.error("Error starting follow-up booking:", err);
      showToast("Failed to start booking process", "error");
      setTreatmentsLoading(false);
      return { success: false, error: err.message };
    }
  }, [startFollowUpBooking, showToast]);

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
    if (!user || !isPatient) return;

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

  useEffect(() => {
    let refreshTimeout = null;
    
    const handleVisibilityChange = () => {
      if (!document.hidden && isPatient) {
        // Debounce rapid fires
        if (refreshTimeout) clearTimeout(refreshTimeout);
        refreshTimeout = setTimeout(() => {
          fetchOngoingTreatments();
          appointmentHook.refresh();
        }, 300);
      }
    };
  
    const handleFocus = () => {
      if (isPatient) {
        if (refreshTimeout) clearTimeout(refreshTimeout);
        refreshTimeout = setTimeout(() => {
          fetchOngoingTreatments();
          appointmentHook.refresh();
        }, 300);
      }
    };
  
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
  
    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isPatient, fetchOngoingTreatments, appointmentHook]);

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
    selectedTreatment,
    setSelectedTreatment,
    handleViewTreatmentPlan,
    handleBookFollowUp,   
    followUpBooking,      
    
    // Search & Filters
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    bookingTypeFilter,
    setBookingTypeFilter,
    
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