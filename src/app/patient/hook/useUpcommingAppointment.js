import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { usePatientAppointments } from "@/hooks/appointment/usePatientAppointment";
import { useAppointmentCancellation } from "@/hooks/appointment/useAppointmentCancellation";
import { useAppointmentRealtime } from "@/hooks/appointment/useAppointmentRealtime";
import { supabase } from "@/lib/supabaseClient";

export const useAppointmentManagement = () => {
  const { user, profile, isPatient } = useAuth();
  
  // Hook integrations
  const appointmentHook = usePatientAppointments();
  const cancellationHook = useAppointmentCancellation();
  
  // Local state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // NEW: Filter by status
  const [bookingTypeFilter, setBookingTypeFilter] = useState("all"); // NEW: Filter by booking type
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [selectedTreatment, setSelectedTreatment] = useState(null); // NEW: For treatment modal
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
          // ✅ NEW: Refresh treatments when appointment updates
          fetchOngoingTreatments();
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

  // ✅ NEW: Fetch detailed treatment plan
  const fetchTreatmentDetails = useCallback(async (treatmentId) => {
    try {
      const { data, error } = await supabase
        .from('treatment_plans')
        .select(`
          *,
          clinic:clinics(*),
          created_by:users!treatment_plans_created_by_staff_id_fkey(
            id,
            email,
            user_profiles(first_name, last_name)
          ),
          treatment_plan_appointments(
            *,
            appointment:appointments(
              *,
              doctor:doctors(*),
              services:appointment_services(service:services(*))
            )
          )
        `)
        .eq('id', treatmentId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('Error fetching treatment details:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Computed values
  const upcomingAppointments = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    
    const filtered = appointmentHook.appointments.filter((apt) => {
      // Include pending and confirmed statuses
      const hasValidStatus = ["pending", "confirmed"].includes(apt.status);
      
      // Include appointments from today onwards
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

  // ✅ ENHANCED: Filter with status and booking type
  const filteredAppointments = useMemo(() => {
    let filtered = upcomingAppointments;
  
    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(apt => apt.status === statusFilter);
    }

    // Filter by booking type
    if (bookingTypeFilter !== "all") {
      filtered = filtered.filter(apt => apt.booking_type === bookingTypeFilter);
    }

    // Search filter
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
  
    // Sort by date (earliest first)
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

  // ✅ ENHANCED: Stats with more details
  const stats = useMemo(() => {
    // Count by booking type
    const consultationOnly = upcomingAppointments.filter(
      a => a.booking_type === 'consultation_only'
    ).length;

    const withTreatment = upcomingAppointments.filter(
      a => ['consultation_with_service', 'service_only', 'treatment_plan_follow_up'].includes(a.booking_type)
    ).length;

    const treatmentPlanLinked = upcomingAppointments.filter(
      a => a.treatment_plan != null  // ✅ Has treatment plan from DB
    ).length;

    // Overdue treatments
    const overduetreatments = ongoingTreatments.filter(t => {
      if (!t.next_visit_date) return false;
      return new Date(t.next_visit_date) < new Date();
    }).length;

    const result = {
      total: upcomingAppointments.length,
      pending: upcomingAppointments.filter((a) => a.status === "pending").length,
      confirmed: upcomingAppointments.filter((a) => a.status === "confirmed").length,
      ongoingTreatments: ongoingTreatments.length,
      consultationOnly,
      withTreatment,
      treatmentPlanLinked,
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
          fetchOngoingTreatments(); // ✅ Refresh treatments
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
          fetchOngoingTreatments(); // ✅ Refresh treatments
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

  // ✅ NEW: View treatment plan details
  const handleViewTreatmentPlan = useCallback(async (treatment) => {
    const details = await fetchTreatmentDetails(treatment.id);
    if (details.success) {
      setSelectedTreatment(details.data);
    } else {
      showToast("Failed to load treatment details", "error");
    }
  }, [fetchTreatmentDetails, showToast]);

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