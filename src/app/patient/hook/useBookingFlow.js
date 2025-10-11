import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useAppointmentBooking, ERROR_MESSAGES } from "@/hooks/appointment/useAppointmentBooking";
import { supabase } from "@/lib/supabaseClient";

export const useBookingFlow = () => {
  const { profile, isPatient } = useAuth();
  
  // Hook integration
  const appointmentHook = useAppointmentBooking();
  
  //Extract stable references to prevent infinite loops
  const {
    bookingData,
    bookingStep,
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
  const [bookingError, setBookingError] = useState(null); 

  const [selectedTreatmentPlan, setSelectedTreatmentPlan] = useState(null);
  const [ongoingTreatments, setOngoingTreatments] = useState([]);

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

  // ✅ NEW: Clear booking error
  const clearBookingError = useCallback(() => {
    setBookingError(null);
  }, []);

  const validateCurrentStep = useCallback(async () => {
    clearBookingError();
    
    // Validate based on current step
    if (bookingStep === 'doctor' && bookingData.doctor && bookingData.clinic) {
      setValidationLoading(true);
      try {
        // Check if doctor still works at clinic
        const { data, error } = await supabase
          .from('doctor_clinics')
          .select('is_active')
          .eq('doctor_id', bookingData.doctor.id)
          .eq('clinic_id', bookingData.clinic.id)
          .eq('is_active', true)
          .single();
        
        if (error || !data) {
          setBookingError({
            type: "doctor_not_at_clinic",
            title: "Doctor Not Available",
            message: `${bookingData.doctor.name} is no longer available at ${bookingData.clinic.name}.`,
            suggestion: "Please select another doctor",
            data: {
              doctor: bookingData.doctor.name,
              clinic: bookingData.clinic.name
            }
          });
          return false;
        }
  
        // Check if doctor is available (active status)
        const { data: doctorData, error: doctorError } = await supabase
          .from('doctors')
          .select('is_available')
          .eq('id', bookingData.doctor.id)
          .single();
        
        if (doctorError || !doctorData?.is_available) {
          setBookingError({
            type: "doctor_unavailable",
            title: "Doctor Unavailable",
            message: `${bookingData.doctor.name} is currently unavailable.`,
            suggestion: "Please select another doctor or try again later",
          });
          return false;
        }
      } catch (err) {
        console.error('Doctor validation error:', err);
      } finally {
        setValidationLoading(false);
      }
    }
  
    // Validate datetime step
    if (bookingStep === 'datetime' && bookingData.date && bookingData.time && bookingData.doctor) {
      setValidationLoading(true);
      try {
        // Calculate total duration
        const totalDuration = bookingData.services?.reduce((total, service) => {
          return total + (service.duration_minutes || 30);
        }, 0) || 30;
  
        // Check time slot availability
        const { data, error } = await supabase.rpc('check_appointment_availability', {
          p_doctor_id: bookingData.doctor.id,
          p_appointment_date: bookingData.date,
          p_appointment_time: bookingData.time,
          p_duration_minutes: totalDuration
        });
  
        if (error) throw error;
  
        if (!data) {
          setBookingError({
            type: "time_slot_unavailable",
            title: "Time Slot Unavailable",
            message: "This time slot is no longer available. The doctor may have been booked by another patient.",
            suggestion: "Please select a different time slot",
            data: {
              date: bookingData.date,
              time: bookingData.time,
              doctor: bookingData.doctor.name
            }
          });
          return false;
        }
      } catch (err) {
        console.error('Time slot validation error:', err);
        // Don't block if validation fails - let backend handle it
      } finally {
        setValidationLoading(false);
      }
    }
  
    return true;
  }, [bookingStep, bookingData, clearBookingError, supabase]);

  const fetchOngoingTreatments = useCallback(async () => {
    if (!profile?.profile?.user_id) return;
  
    try {
      const { data, error } = await supabase.rpc("get_patient_ongoing_treatments_for_booking", {
        p_patient_id: profile?.profile?.user_id,
        p_clinic_id: bookingData.clinic?.id || null 
      });
  
      if (error) throw error;
      if (data?.success) {
        setOngoingTreatments(data.data?.treatments || []);
      }
    } catch (err) {
      console.error("Error fetching ongoing treatments:", err);
    }
  }, [profile?.profile?.user_id]);
  
  // Call on mount
  useEffect(() => {
    fetchOngoingTreatments();
  }, [fetchOngoingTreatments]);
  
  // Add handler for treatment plan selection
  const handleTreatmentPlanSelect = useCallback(async (treatment) => {
    if (!treatment) {
      setSelectedTreatmentPlan(null);
      // Reset to normal booking
      appointmentHook.updateBookingData({ 
        treatmentPlanId: null,
        bookingType: 'consultation_only' 
      });
      return;
    }
  
    setSelectedTreatmentPlan(treatment);
  
    try {
      // ✅ STEP 1: Set treatment plan ID immediately
      appointmentHook.updateBookingData({ 
        treatmentPlanId: treatment.id,
        bookingType: 'treatment_plan_follow_up'
      });
  
      // ✅ STEP 2: Auto-select doctor from treatment plan
      if (treatment.assigned_doctor_id && bookingData.clinic?.id) {
        const doctorsResult = await appointmentHook.getAvailableDoctors(bookingData.clinic.id);
        
        if (doctorsResult.success) {
          const assignedDoctor = doctorsResult.doctors.find(
            d => d.id === treatment.assigned_doctor_id
          );
          
          if (assignedDoctor) {
            appointmentHook.updateBookingData({ doctor: assignedDoctor });
          } else {
            showToast("Assigned doctor is not available at this clinic", "warning");
          }
        }
      }
  
      // ✅ STEP 3: Auto-set date and time if available
      if (treatment.next_visit_due) {
        const updates = { date: treatment.next_visit_due };
        
        // If time is also provided
        if (treatment.next_visit_time) {
          updates.time = treatment.next_visit_time;
        }
        
        appointmentHook.updateBookingData(updates);
      }
  
      // ✅ STEP 4: Get recommended services based on treatment category
      if (treatment.treatment_category && bookingData.clinic?.id) {
        const servicesResult = await appointmentHook.getServices(bookingData.clinic.id);
        
        if (servicesResult.success) {
          // Find services matching the treatment category
          const matchingServices = servicesResult.services.filter(
            s => s.category === treatment.treatment_category && s.is_active
          );
          
          if (matchingServices.length > 0) {
            // Auto-select the first matching service (or let user choose)
            appointmentHook.updateBookingData({ 
              services: [matchingServices[0].id]  // You can select multiple or show a picker
            });
          } else {
            // No matching service, proceed as consultation-only
            appointmentHook.updateBookingData({ 
              services: [],
              bookingType: 'treatment_plan_follow_up'
            });
          }
        }
      }
  
      showToast(`Booking linked to ${treatment.treatment_name}`, "success");
  
      // ✅ STEP 5: Auto-advance to confirmation step (skip intermediate steps)
      setTimeout(() => {
        appointmentHook.goToStep('confirm');
      }, 500);
  
    } catch (err) {
      console.error("Error loading treatment plan details:", err);
      showToast("Failed to load treatment plan details", "error");
    }
  }, [appointmentHook, bookingData.clinic, showToast]);

  const calculateTotalDuration = useCallback((selectedServices) => {
    if (!selectedServices || selectedServices.length === 0) {
      return 30; // Consultation default
    }
    
    return selectedServices.reduce((total, service) => {
      return total + (service.duration_minutes || 30);
    }, 0);
  }, []);

  const validateBookingBeforeConfirm = useCallback(async () => {
    if (!bookingData.clinic || !bookingData.doctor || !bookingData.date || !bookingData.time) {
      return { valid: false, error: "Please complete all required fields" };
    }
  
    setValidationLoading(true);
    clearBookingError();
  
    try {
      // Check doctor availability at selected time
      const { data: availabilityData, error: availError } = await supabase.rpc(
        'check_appointment_availability',
        {
          p_doctor_id: bookingData.doctor.id,
          p_appointment_date: bookingData.date,
          p_appointment_time: bookingData.time,
          p_duration_minutes: calculateTotalDuration(bookingData.services)
        }
      );
  
      if (availError) throw availError;
  
      if (!availabilityData) {
        setBookingError({
          title: "Time Slot Unavailable",
          message: "This time slot is no longer available. Please select a different time.",
          suggestion: "View updated available time slots",
          type: "time_conflict"
        });
        return { valid: false, error: "time_slot_unavailable" };
      }
  
      // ✅ All validations passed
      return { valid: true };
  
    } catch (error) {
      console.error("Validation error:", error);
      setBookingError({
        title: "Validation Failed",
        message: error.message || "Unable to validate booking",
        type: "validation_error"
      });
      return { valid: false, error: error.message };
    } finally {
      setValidationLoading(false);
    }
  }, [bookingData, clearBookingError]);

  const nextStep = useCallback(async () => {
    clearBookingError();
    
    // Proactive validation before moving forward
    const isValid = await validateCurrentStep();
    if (!isValid) {
      return; // Don't proceed if validation fails
    }
  
    // Call the original nextStep from appointmentHook
    appointmentHook.nextStep();
  }, [clearBookingError, validateCurrentStep, appointmentHook]);

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

  // Fetch doctors with stable dependencies
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

  // Fetch services with stable dependencies
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

  // Check booking eligibility with same-day conflict detection
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
      // Check appointment limits (includes same-day check)
      const limitData = await checkAppointmentLimits(clinicId, appointmentDate);

      if (limitData?.data) {
        const totalPending = limitData.data.total_pending_appointments || 0;
        const maxTotalPending = limitData.data.max_total_pending || 3;
        const clinicPending = limitData.data.clinic_pending_count || 0;
        const maxClinicPending = limitData.data.max_pending_per_clinic || 2;
        
        const hasSameDayConflict = !limitData.allowed && limitData.reason === 'daily_appointment_exists';
        
        setBookingLimitsInfo({
          totalPending,
          maxTotalPending,
          totalRemaining: Math.max(0, maxTotalPending - totalPending),
          clinicPending,
          maxClinicPending,
          clinicRemaining: Math.max(0, maxClinicPending - clinicPending),
          maxAdvanceDays: limitData.data.max_advance_days || 60,
          latestBookableDate: limitData.data.latest_bookable_date,
          clinicHistoricalCount: limitData.data.clinic_current_count || 0,
          clinicHistoricalLimit: limitData.data.clinic_limit || 0,
          clinicHistoricalRemaining: limitData.data.clinic_remaining || 0,
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
      
      // Extract cross-clinic data
      const crossClinicData = limitData?.data?.cross_clinic_appointments || [];
      const crossClinicMinimal = limitData?.data?.cross_clinic_minimal || [];
      const crossClinicInfo = crossClinicData.length > 0 ? crossClinicData : crossClinicMinimal;
      setCrossClinicWarnings(Array.isArray(crossClinicInfo) ? crossClinicInfo : []);
      
      // Check patient reliability
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

  // Event handlers with stable dependencies
  const handleClinicSelect = useCallback((clinic) => {
    updateBookingData({
      clinic,
      doctor: null,
      services: [],
      date: null,
      time: null,
    });
    
    checkBookingEligibility(clinic.id);
    appointmentHook.checkOngoingTreatments(clinic.id);
  }, [updateBookingData, checkBookingEligibility, appointmentHook]);

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
      checkBookingEligibility(bookingData.clinic.id, date);
    }
  }, [bookingData.clinic?.id, updateBookingData, checkBookingEligibility]);

  // ✅ ENHANCED: Submit handler with better error handling
  const handleSubmit = useCallback(async () => {
    if (!isPatient) {
      setBookingError({
        type: "access_denied",
        title: "Access Denied",
        message: "Only patients can book appointments",
        suggestion: null
      });
      return;
    }

    // Check if booking limit reached
    if (bookingLimitsInfo && bookingLimitsInfo.totalRemaining === 0) {
      setBookingError({
        type: "limit_reached",
        title: "Booking Limit Reached",
        message: `You have reached your pending appointment limit (${bookingLimitsInfo.totalPending}/${bookingLimitsInfo.maxTotalPending}). Please wait for confirmations before booking more.`,
        suggestion: "View your pending appointments"
      });
      return;
    }

    // Validate consultation requirement
    if (bookingData.services?.length > 0 && consultationCheckResult) {
      if (!consultationCheckResult.canSkipConsultation && !bookingData.doctor) {
        setBookingError({
          type: "consultation_required",
          title: "Consultation Required",
          message: "Please select a doctor for consultation as selected services require it.",
          suggestion: "Select a doctor to continue"
        });
        return;
      }
    }

    // Check for same-day conflict
    if (sameDayConflict) {
      setBookingError({
        type: "same_day_conflict",
        title: "Appointment Conflict",
        message: "You already have an appointment on this date. Please cancel it first or choose another date.",
        suggestion: "View conflicting appointment",
        data: sameDayConflictDetails
      });
      return;
    }

    // Check appointment limits
    if (!appointmentLimitCheck?.allowed) {
      const message = appointmentLimitCheck?.message || "Booking not allowed";
      setBookingError({
        type: "not_allowed",
        title: "Cannot Book",
        message: `Cannot book appointment: ${message}`,
        suggestion: null
      });
      return;
    }

    // High-risk reliability confirmation (keep this as confirm dialog)
    if (patientReliability?.risk_level === 'high_risk') {
      const confirmed = window.confirm(
        "Your appointment history shows some missed appointments. Are you sure you can attend this appointment? Continued no-shows may affect your booking privileges."
      );
      if (!confirmed) return;
    }

    try {
      const result = await bookAppointment(skipConsultation);

      if (result.success) {
        setBookingSuccess(true);
        showToast("Appointment booked successfully!", "success");
        
        setTimeout(() => {
          window.location.href = "/patient/appointments/upcoming";
        }, 3000);
      } else {
        // ✅ Handle enhanced error details
        if (result.errorDetails) {
          setBookingError({
            type: result.errorType,
            title: result.errorDetails.title,
            message: result.errorDetails.message,
            suggestion: result.errorDetails.suggestion,
            data: result.errorDetails.data
          });
        } else {
          showToast(result.error || "Booking failed. Please try again.", "error");
        }
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
    sameDayConflictDetails,
    appointmentLimitCheck,
    patientReliability,
    bookAppointment,
    showToast,
  ]);

  const handleClearDate = useCallback(() => {
    updateBookingData({ date: null, time: null });
    setSameDayConflictDetails(null);
    
    if (bookingData.clinic?.id) {
      checkBookingEligibility(bookingData.clinic.id, null);
    }
  }, [bookingData.clinic?.id, updateBookingData, checkBookingEligibility]);
  

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

  // Initial clinic fetch - only once
  useEffect(() => {
    if (!isInitializedRef.current && isPatient) {
      isInitializedRef.current = true;
      fetchClinics();
    }
  }, [isPatient, fetchClinics]);

  // Fetch doctors only when clinic changes
  useEffect(() => {
    const clinicId = bookingData.clinic?.id;
    
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
    nextStep,
    
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
    bookingError, 
    validateBookingBeforeConfirm,
    calculateTotalDuration,
    clearBookingError,
    validateCurrentStep,
    
    // Handlers
    showToast,
    closeToast,
    handleClinicSelect,
    handleServiceToggle,  
    handleDoctorSelect,
    handleDateSelect,
    handleSubmit,
    handleClearDate,
    selectedTreatmentPlan,
    ongoingTreatments,
    handleTreatmentPlanSelect,
    
    // Enhanced methods
    checkBookingEligibility,
    getCancellationInfo,
  };
};