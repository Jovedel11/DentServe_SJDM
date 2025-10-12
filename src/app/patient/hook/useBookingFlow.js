import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useAppointmentBooking } from "@/hooks/appointment/useAppointmentBooking";
import { supabase } from "@/lib/supabaseClient";

export const useBookingFlow = () => {
  const { profile, isPatient } = useAuth();
  
  // Hook integration
  const appointmentHook = useAppointmentBooking();
  
  //Extract stable references to prevent infinite loops
  const {
    bookingData,
    updateBookingData,
    getAvailableDoctors,
    getServices,
    bookAppointment,
    checkAppointmentLimits,
    appointmentLimitCheck,
    sameDayConflict,
    checkConsultationRequirement,
  } = appointmentHook;
  
  // Local state
  const [clinics, setClinics] = useState([]);
  const [clinicsLoading, setClinicsLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [services, setServices] = useState([]);
  const [toastMessage, setToastMessage] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const [bookingLimitsInfo, setBookingLimitsInfo] = useState(null);
  const [sameDayConflictDetails, setSameDayConflictDetails] = useState(null);

  const [consultationCheckResult, setConsultationCheckResult] = useState(null);
  const [skipConsultation, setSkipConsultation] = useState(false);
  
  // Enhanced booking validation state
  const [crossClinicWarnings, setCrossClinicWarnings] = useState([]);
  const [validationLoading, setValidationLoading] = useState(false);
  const [patientReliability, setPatientReliability] = useState(null);

  // Use refs to prevent infinite loops
  const lastValidationRef = useRef({ clinicId: null, date: null });
  const isInitializedRef = useRef(false);
  const clinicIdRef = useRef(null);

  // Toast helpers
  const showToast = useCallback((message, type = "info") => {
    setToastMessage({ message, type });
  }, []);

  const closeToast = useCallback(() => {
    setToastMessage("");
  }, []);

  // Fetch clinics with enhanced location support
  const fetchClinics = useCallback(async (userLocation = null) => {
    if (!isPatient) return;

    setClinicsLoading(true);
    try {
      const { data, error } = await supabase.rpc("find_nearest_clinics", {
        user_location: userLocation,
        max_distance_km: 50,
        limit_count: 20,
      });

      if (error) throw error;
      if (data.success) {
        setClinics(data.data.clinics || []);
      } else {
        showToast(data.error || "Failed to load clinics", "error");
      }
    } catch (err) {
      console.error("Error fetching clinics:", err);
      showToast("Failed to load clinics", "error");
    } finally {
      setClinicsLoading(false);
    }
  }, [isPatient, showToast]);

  // ✅ FIX: Fetch doctors with stable dependencies
  const fetchDoctors = useCallback(async (clinicId) => {
    if (!clinicId) {
      setDoctors([]);
      return;
    }

    try {
      const result = await getAvailableDoctors(clinicId);
      if (result.success) {
        setDoctors(result.doctors);
      } else {
        showToast(result.error, "error");
        setDoctors([]);
      }
    } catch (err) {
      console.error("Error fetching doctors:", err);
      showToast("Failed to load doctors", "error");
      setDoctors([]);
    }
  }, [getAvailableDoctors, showToast]);

  // ✅ FIX: Fetch services with stable dependencies
  const fetchServices = useCallback(async (clinicId) => {
    if (!clinicId) {
      setServices([]);
      return;
    }

    try {
      const result = await getServices(clinicId);
      if (result.success) {
        setServices(result.services);
      } else {
        showToast(result.error, "error");
        setServices([]);
      }
    } catch (err) {
      console.error("Error fetching services:", err);
      showToast("Failed to load services", "error");
      setServices([]);
    }
  }, [getServices, showToast]);

  // ✅ Check booking eligibility with same-day conflict detection
  const checkBookingEligibility = useCallback(async (clinicId, appointmentDate = null) => {
    if (!clinicId || !isPatient || !profile?.user_id) {
      return;
    }

    const validationKey = `${clinicId}-${appointmentDate || 'null'}`;
    if (lastValidationRef.current.key === validationKey && lastValidationRef.current.loading) {
      return;
    }

    lastValidationRef.current = { key: validationKey, loading: true };
    setValidationLoading(true);
    
    try {
      // ✅ Check appointment limits (includes same-day check)
      const limitData = await checkAppointmentLimits(clinicId, appointmentDate);

      if (limitData?.data) {
        const totalPending = limitData.data.total_pending_appointments || 0;
        const maxTotalPending = limitData.data.max_total_pending || 3;
        const clinicPending = limitData.data.clinic_pending_count || 0;
        const maxClinicPending = limitData.data.max_pending_per_clinic || 2;
        
        // ✅ FIX: Account for same-day conflict in remaining calculation
        const hasSameDayConflict = !limitData.allowed && limitData.reason === 'daily_appointment_exists';
        
        setBookingLimitsInfo({
          // Total pending limits
          totalPending,
          maxTotalPending,
      // ✅ FIXED: Correct calculation - if at limit, show 0
      totalRemaining: Math.max(0, maxTotalPending - totalPending),
          
          // Per-clinic pending limits
          clinicPending,
          maxClinicPending,
          clinicRemaining: Math.max(0, maxClinicPending - clinicPending),
          
          // Booking window
          maxAdvanceDays: limitData.data.max_advance_days || 60,
          latestBookableDate: limitData.data.latest_bookable_date,
          
          // Historical limits
          clinicHistoricalCount: limitData.data.clinic_current_count || 0,
          clinicHistoricalLimit: limitData.data.clinic_limit || 0,
          clinicHistoricalRemaining: limitData.data.clinic_remaining || 0,
          
          // ✅ NEW: Same-day conflict flag
          hasSameDayConflict,
        });
      }

      if (!limitData.allowed && limitData.reason === 'daily_appointment_exists') {
        const conflictInfo = limitData.data?.existing_appointment || null;
        if (conflictInfo) {
          setSameDayConflictDetails({
            id: conflictInfo.id,
            time: conflictInfo.time,
            status: conflictInfo.status,
            clinicName: conflictInfo.clinic_name,
            doctorName: conflictInfo.doctor_name,
            canCancel: conflictInfo.can_cancel,
            isSameClinic: conflictInfo.is_same_clinic,
            date: appointmentDate,
          });
        }
      } else {
        setSameDayConflictDetails(null);
      }
      
      // Extract cross-clinic data (role-based)
      const crossClinicData = limitData?.data?.cross_clinic_appointments || [];
      const crossClinicMinimal = limitData?.data?.cross_clinic_minimal || [];
      const crossClinicInfo = crossClinicData.length > 0 ? crossClinicData : crossClinicMinimal;
      setCrossClinicWarnings(Array.isArray(crossClinicInfo) ? crossClinicInfo : []);
      
      // ✅ Check patient reliability
      const { data: reliabilityData, error: reliabilityError } = await supabase.rpc('check_patient_reliability', {
        p_patient_id: profile.user_id,
        p_clinic_id: clinicId
      });

      if (!reliabilityError && reliabilityData) {
        setPatientReliability(reliabilityData);
      }
      
    } catch (err) {
      console.error("Error checking booking eligibility:", err);
      showToast("Failed to check appointment availability", "error");
    } finally {
      setValidationLoading(false);
      lastValidationRef.current.loading = false;
    }
  }, [isPatient, profile?.user_id, checkAppointmentLimits, showToast]);

  // ✅ FIX: Event handlers with stable dependencies
  const handleClinicSelect = useCallback((clinic) => {
    updateBookingData({
      clinic,
      doctor: null,
      services: [],
      date: null,
      time: null,
    });
    
    checkBookingEligibility(clinic.id);
  }, [updateBookingData, checkBookingEligibility]);

  const handleServiceToggle = useCallback((serviceId) => {
    const currentServices = bookingData.services || [];
    const service = services.find(s => s.id === serviceId);

    if (currentServices.includes(serviceId)) {
      updateBookingData({
        services: currentServices.filter((id) => id !== serviceId),
      });
    } else if (currentServices.length < 3) {
      updateBookingData({
        services: [...currentServices, serviceId],
      });

      // Show treatment plan info if needed
      if (service && (service.requires_multiple_visits || service.typical_visit_count > 1)) {
        showToast(
          `${service.name} requires approximately ${service.typical_visit_count || 2} visits.`,
          'info'
        );
      }
    } else {
      showToast("Maximum 3 services allowed", "warning");
    }
  }, [bookingData.services, services, updateBookingData, showToast]);

  const handleDoctorSelect = useCallback((doctor) => {
    updateBookingData({
      doctor,
      date: null,
      time: null,
    });
  }, [updateBookingData]);

  const handleDateSelect = useCallback((date) => {
    updateBookingData({ date, time: null });
    
    if (bookingData.clinic?.id) {
      // ✅ This will trigger same-day conflict check
      checkBookingEligibility(bookingData.clinic.id, date);
    }
  }, [bookingData.clinic?.id, updateBookingData, checkBookingEligibility]);

  // ✅ FIX: Submit handler with same-day conflict handling
  const handleSubmit = useCallback(async () => {
    if (!isPatient) {
      showToast("Only patients can book appointments", "error");
      return;
    }

    // ✅ NEW: Check if booking limit reached (accounting for this booking)
    if (bookingLimitsInfo && bookingLimitsInfo.totalRemaining === 0) {
      showToast(
        `You have reached your pending appointment limit (${bookingLimitsInfo.totalPending}/${bookingLimitsInfo.maxTotalPending}). Please wait for confirmations before booking more.`,
        "error"
      );
      return;
    }

    // ✅ NEW: Validate consultation requirement
    if (bookingData.services?.length > 0 && consultationCheckResult) {
      if (!consultationCheckResult.canSkipConsultation && !bookingData.doctor) {
        showToast(
          "Please select a doctor for consultation as selected services require it.",
          "error"
        );
        return;
      }
    }

    // ✅ Check for same-day conflict
    if (sameDayConflict) {
      showToast(
        "You already have an appointment on this date. Please cancel it first or choose another date.",
        "error"
      );
      return;
    }

    // ✅ Check appointment limits
    if (!appointmentLimitCheck?.allowed) {
      const message = appointmentLimitCheck?.message || "Booking not allowed";
      showToast(`Cannot book appointment: ${message}`, "error");
      return;
    }

    // ✅ High-risk reliability confirmation
    if (patientReliability?.risk_level === 'high_risk') {
      const confirmed = window.confirm(
        "Your appointment history shows some missed appointments. Are you sure you can attend this appointment? Continued no-shows may affect your booking privileges."
      );
      if (!confirmed) return;
    }

    try {
      // ✅ FIXED: Pass skipConsultation flag to booking function
      const result = await bookAppointment(skipConsultation);  // ✅ PASS THE FLAG

      if (result.success) {
        setBookingSuccess(true);
        showToast("Appointment booked successfully!", "success");
        
        setTimeout(() => {
          window.location.href = "/patient/appointments/upcoming";
        }, 3000);
      } else {
        showToast(result.error || "Booking failed. Please try again.", "error");
      }
    } catch (err) {
      console.error("Error submitting booking:", err);
      showToast("An error occurred. Please try again.", "error");
    }
  }, [
    isPatient,
    bookingData,
    bookingLimitsInfo,
    consultationCheckResult,
    skipConsultation, 
    sameDayConflict,
    appointmentLimitCheck,
    patientReliability,
    bookAppointment,
    showToast,
  ]);

    const handleClearDate = useCallback(() => {
    updateBookingData({ date: null, time: null });
    setSameDayConflictDetails(null);
    
    // Re-check booking eligibility without date
    if (bookingData.clinic?.id) {
      checkBookingEligibility(bookingData.clinic.id, null);
    }
  }, [bookingData.clinic?.id, updateBookingData, checkBookingEligibility]);

  const handleTreatmentPlanSelect = useCallback((treatmentId) => {
    if (!treatmentId) return;
    
    // When a treatment is selected, link it to the booking
    const treatment = appointmentHook.ongoingTreatments?.find(t => t.id === treatmentId);
    if (treatment) {
      appointmentHook.selectTreatmentPlan(treatmentId);
      showToast(`Linked to treatment: ${treatment.treatment_name}`, 'success');
    }
  }, [appointmentHook, showToast]);

  // Enhanced cancellation policy info
  const getCancellationInfo = useCallback(() => {
    if (!bookingData.clinic) return null;
    
    const policyHours = bookingData.clinic.cancellation_policy_hours || 24;
    const appointmentDateTime = bookingData.date && bookingData.time 
      ? new Date(`${bookingData.date}T${bookingData.time}`)
      : null;
    
    if (!appointmentDateTime) return null;
    
    const cancellationDeadline = new Date(appointmentDateTime.getTime() - (policyHours * 60 * 60 * 1000));
    
    return {
      policyHours,
      cancellationDeadline,
      canStillCancel: new Date() < cancellationDeadline
    };
  }, [bookingData.clinic, bookingData.date, bookingData.time]);
  

  useEffect(() => {
    const checkConsultation = async () => {
      if (bookingData.services?.length > 0 && bookingData.clinic?.id) {
        try {
          const result = await checkConsultationRequirement(
            bookingData.services,
            bookingData.clinic.id
          );
          setConsultationCheckResult(result);
          
          if (result?.canSkipConsultation) {
            setSkipConsultation(true);
          } else {
            setSkipConsultation(false);
          }
        } catch (error) {
          console.error('Error checking consultation requirement:', error);
          setConsultationCheckResult(null);
          setSkipConsultation(false);
        }
      } else {
        setConsultationCheckResult(null);
        setSkipConsultation(false);
      }
    };
    
    checkConsultation();
  }, [bookingData.services, bookingData.clinic?.id, checkConsultationRequirement]);

  //Initial clinic fetch - only once
  useEffect(() => {
    if (!isInitializedRef.current && isPatient) {
      isInitializedRef.current = true;
      fetchClinics();
    }
  }, [isPatient, fetchClinics]);

  // Fetch doctors only when clinic changes
  useEffect(() => {
    const clinicId = bookingData.clinic?.id;
    
    // Only fetch if clinic has changed
    if (clinicIdRef.current !== clinicId) {
      clinicIdRef.current = clinicId;
      
      if (clinicId) {
        fetchDoctors(clinicId);
        fetchServices(clinicId);
      } else {
        setDoctors([]);
        setServices([]);
      }
    }
  }, [bookingData.clinic?.id, fetchDoctors, fetchServices]);

  return {
    // Hook data - spread the entire hook
    ...appointmentHook,
    profile,
    isPatient,
    
    // Local state
    clinics,
    clinicsLoading,
    doctors,
    services,
    toastMessage,
    bookingSuccess,
    consultationCheckResult,
    skipConsultation,
    setSkipConsultation,
    checkConsultationRequirement,
    
    // Enhanced validation state
    appointmentLimitCheck,
    sameDayConflict,
    sameDayConflictDetails,
    bookingLimitsInfo,
    crossClinicWarnings,
    validationLoading,
    patientReliability,
    
    // Handlers
    showToast,
    closeToast,
    handleClinicSelect,
    handleServiceToggle,  
    handleDoctorSelect,
    handleDateSelect,
    handleSubmit,
    handleClearDate,
    handleTreatmentPlanSelect,
    // Enhanced methods
    checkBookingEligibility,
    getCancellationInfo,
  };
};