import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

/**
 * ✅ ENHANCED Appointment Booking Hook
 * Implements real-world treatment plan workflow:
 * - Detects ongoing treatments during booking
 * - Shows smart link prompt
 * - Auto-links to treatment plans
 * - Provides treatment context
 */
export const useAppointmentBooking = () => {
  const { user, profile, isPatient } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [error, setError] = useState(null);
  const [bookingStep, setBookingStep] = useState('clinic');
  const [bookingData, setBookingData] = useState({
    clinic: null,
    doctor: null,
    date: null,
    time: null,
    services: [],
    symptoms: '',
    treatmentPlanId: null,  // ✅ NEW: Selected treatment plan to link
  });

  // ✅ NEW: Ongoing treatments state
  const [ongoingTreatments, setOngoingTreatments] = useState([]);
  const [showTreatmentLinkPrompt, setShowTreatmentLinkPrompt] = useState(false);
  const [checkingTreatments, setCheckingTreatments] = useState(false);

  // Existing state
  const [appointmentLimitCheck, setAppointmentLimitCheck] = useState(null);
  const [sameDayConflict, setSameDayConflict] = useState(null);

  const previousBookingDataRef = useRef();
  const isInitializedRef = useRef(false);

  const checkOngoingTreatments = useCallback(async (clinicId = null) => {
    if (!user || !isPatient || !profile?.user_id) {
      return { success: false, treatments: [] };
    }

    try {
      setCheckingTreatments(true);

      const { data, error } = await supabase.rpc('get_patient_ongoing_treatments_for_booking', {
        p_patient_id: profile.user_id,
        p_clinic_id: clinicId  
      });

      if (error) throw error;

      const treatments = data?.data?.treatments || [];

      if (treatments.length > 0) {
        setShowTreatmentLinkPrompt(true);
      }

      setOngoingTreatments(treatments);

      return {
        success: true,
        treatments: treatments, 
        hasOngoing: treatments.length > 0
      };

    } catch (err) {
      console.error('Error checking ongoing treatments:', err);
      return { success: false, treatments: [] };
    } finally {
      setCheckingTreatments(false);
    }
  }, [user, isPatient, profile?.user_id]);

  // ====================================================================
  // ✅ NEW: Link/unlink treatment plan
  // ====================================================================
  const selectTreatmentPlan = useCallback((treatmentPlanId) => {
    setBookingData(prev => ({
      ...prev,
      treatmentPlanId
    }));
    setShowTreatmentLinkPrompt(false);
  }, []);

  const clearTreatmentPlanLink = useCallback(() => {
    setBookingData(prev => ({
      ...prev,
      treatmentPlanId: null
    }));
  }, []);

const bookAppointment = useCallback(async (skipConsultationOverride = null) => {
  if (!isPatient) {
    setError('Only patients can book appointments');
    return { success: false, error: 'Access denied' };
  }

  const { clinic, doctor, date, time, services, symptoms, treatmentPlanId } = bookingData;

  // ✅ FIXED: Services are now OPTIONAL
  const requiredFields = [
    { field: clinic?.id, name: 'clinic' },
    { field: doctor?.id, name: 'doctor' },
    { field: date, name: 'date' },
    { field: time, name: 'time' },
    // ❌ REMOVED: { field: services?.length > 0, name: 'services' }
  ];

  const missingField = requiredFields.find(({ field }) => !field);
  if (missingField) {
    setError(`Please select ${missingField.name}`);
    return { success: false, error: 'Missing required fields' };
  }

  // ✅ FIXED: Only validate services length if services provided
  if (services && services.length > 3) {
    setError('Maximum 3 services can be selected');
    return { success: false, error: 'Too many services' };
  }

  if (sameDayConflict) {
    setError('You already have an appointment on this date. Please cancel it first or choose another date.');
    return { 
      success: false, 
      error: 'Same-day appointment exists',
      conflict: sameDayConflict
    };
  }

  try {
    setLoading(true);
    setError(null);

    // ✅ ENHANCED: Support consultation-only (services can be null or empty array)
    const { data, error } = await supabase.rpc('book_appointment', {
      p_clinic_id: clinic.id,
      p_doctor_id: doctor.id,
      p_appointment_date: date,
      p_appointment_time: time,
      p_service_ids: services && services.length > 0 ? services : null,
      p_symptoms: symptoms || null,
      p_treatment_plan_id: treatmentPlanId || null,
      p_skip_consultation: skipConsultationOverride ?? false  // ✅ NEW PARAMETER
    });
    if (error) throw new Error(error.message);

    if (data?.authenticated === false) {
      setError('Please log in to continue');
      return { success: false, error: 'Authentication required' };
    }

    if (!data?.success) {
      if (data?.reason === 'daily_limit_exceeded' || data?.reason === 'same_day_conflict') {
        setSameDayConflict(data?.data?.existing_appointment || null);
        setError('You already have an appointment scheduled for this date. Please cancel it first or choose another date.');
      } else {
        setError(data?.error || 'Booking failed');
      }
      return { success: false, error: data?.error, reason: data?.reason };
    }

    const appointmentData = data.data;

    resetBooking();
    
    return {
      success: true,
      appointment: {
        id: appointmentData.appointment_id,
        status: appointmentData.status,
        bookingType: appointmentData.booking_type,  // ✅ NEW
        consultationFeeCharged: appointmentData.consultation_fee_charged,  // ✅ NEW
        treatmentPlanLink: appointmentData.treatment_plan_link,
        patient_info: appointmentData.patient_info,
        details: appointmentData.appointment_details,
        clinic: appointmentData.clinic,
        doctor: appointmentData.doctor,
        services: appointmentData.services,
        pricing: appointmentData.pricing_estimate,
        cancellation_policy: appointmentData.cancellation_policy,
        reliability: appointmentData.patient_reliability,
        cross_clinic_context: appointmentData.cross_clinic_context,
      },
      message: data.message
    };

  } catch (err) {
    const errorMsg = err?.message || 'Failed to book appointment';
    setError(errorMsg);
    return { 
      success: false, 
      error: errorMsg 
    };
  } finally {
    setLoading(false);
  }
}, [bookingData, isPatient, sameDayConflict]);

  // Browser back button handler
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      return;
    }

    const handlePopState = (event) => {
      event.preventDefault();
      
      const steps = ['clinic', 'services', 'doctor', 'datetime', 'confirm'];
      const currentIndex = steps.indexOf(bookingStep);
      
      if (currentIndex > 0) {
        setBookingStep(steps[currentIndex - 1]);
        setError(null);
        
        window.history.pushState(
          { step: steps[currentIndex - 1] }, 
          '', 
          window.location.pathname
        );
      } else {
        window.history.back();
      }
    };

    window.history.pushState({ step: bookingStep }, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [bookingStep]);

  useEffect(() => {
    if (isInitializedRef.current) {
      window.history.replaceState({ step: bookingStep }, '', window.location.pathname);
    }
  }, [bookingStep]);

  const resetBooking = useCallback(() => {
    setBookingData({
      clinic: null,
      doctor: null,
      date: null,
      time: null,
      services: [],
      symptoms: '',
      treatmentPlanId: null,  // ✅ Reset treatment plan link
    });
    setBookingStep('clinic');
    setAvailableTimes([]);
    setError(null);
    setSameDayConflict(null);
    setAppointmentLimitCheck(null);
    setOngoingTreatments([]);  // ✅ Clear treatments
    setShowTreatmentLinkPrompt(false);  // ✅ Hide prompt
    
    window.history.replaceState({ step: 'clinic' }, '', window.location.pathname);
  }, []);

  const updateBookingData = useCallback((updates) => {
    setBookingData(prev => {
      const newData = { ...prev, ...updates };
      
      if (updates.services && updates.services.length > 3) {
        setError('Maximum 3 services can be selected');
        return prev;
      }
      
      if (updates.date) {
        const appointmentDate = new Date(updates.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (appointmentDate < today) {
          setError('Cannot book appointments in the past');
          return prev;
        }
      }

      // ✅ NEW: Check ongoing treatments when clinic is selected
      if (updates.clinic && updates.clinic.id !== prev.clinic?.id) {
        checkOngoingTreatments(updates.clinic.id);
      }
      
      return newData;
    });
    setError(null);
  }, [checkOngoingTreatments]);

  const getAvailableDoctors = useCallback(async (clinicId) => {
    if (!clinicId) return { success: false, doctors: [], error: 'Clinic ID required' };

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('doctor_clinics')
        .select(`
          doctors (
            id,
            specialization,
            education,
            consultation_fee,
            certifications,
            awards,
            experience_years,
            is_available,
            rating,
            first_name,
            last_name,
            image_url
          )
        `)
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
        .eq('doctors.is_available', true);

      if (error) throw new Error(error.message);

      const doctors = data?.map(item => {
        const doctor = item.doctors;
        const firstName = doctor?.first_name || '';
        const lastName = doctor?.last_name || '';

        return {
          id: doctor?.id,
          specialization: doctor?.specialization,
          consultation_fee: doctor?.consultation_fee,
          certifications: doctor?.certifications,
          awards: doctor?.awards,
          experience_years: doctor?.experience_years,
          rating: doctor?.rating,
          name: `Dr. ${firstName} ${lastName}`.trim(),
          display_name: `${firstName} ${lastName}`.trim() || doctor?.specialization || 'Unknown',
          first_name: firstName,
          last_name: lastName,
          image_url: doctor?.image_url
        };
      }).filter(Boolean);

      return { 
        success: true, 
        doctors, 
        count: doctors.length,
        error: null 
      };

    } catch (err) {
      const errorMsg = err?.message || 'Failed to load available doctors';
      setError(errorMsg);
      return { 
        success: false, 
        doctors: [], 
        error: errorMsg 
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const getServices = useCallback(async (clinicId) => {
    if (!clinicId) return { success: false, services: [], error: 'Clinic ID required' };
    
    try {
      setLoading(true);
      setError(null);

      const { data: clinicServices, error } = await supabase
        .from('services')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) throw new Error(error.message);

      return {
        success: true,
        services: clinicServices || [],
        count: clinicServices?.length || 0,
        error: null
      };

    } catch (err) {
      const errorMsg = err?.message || 'Failed to load services';
      setError(errorMsg);
      return {
        success: false,
        services: [],
        error: errorMsg
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const checkAllAvailableTimes = useCallback(async (doctorId, date, serviceIds = []) => {
    if (!doctorId || !date) {
      return { success: false, slots: [], error: 'Missing required parameters' };
    }

    try {
      const { data, error } = await supabase.rpc('get_available_time_slots', {
        p_doctor_id: doctorId,
        p_appointment_date: date,
        p_service_ids: serviceIds.length > 0 ? serviceIds : null
      });

      if (error) throw error;
      
      if (!data?.success) {
        return {
          success: false,
          slots: [],
          error: data?.error || 'Failed to fetch time slots'
        };
      }
      
      const slotsArray = Array.isArray(data.slots) ? data.slots : [];
      
      return {
        success: true,
        slots: slotsArray,
        metadata: {
          date: data.date,
          doctorId: data.doctor_id,
          totalDuration: data.total_duration,
          serviceIds,
          totalSlots: slotsArray.length,
          availableSlots: slotsArray.filter(s => s.available).length,
          fetchedAt: new Date().toISOString()
        }
      };
    } catch (err) {
      console.error('Error checking availability:', err);
      return { 
        success: false, 
        slots: [], 
        error: err.message 
      };
    }
  }, []);

  const checkAppointmentLimits = useCallback(async (clinicId, appointmentDate = null) => {
    if (!clinicId || !isPatient || !profile?.user_id) {
      return { allowed: true, message: 'No restrictions' };
    }

    try {
      const { data, error } = await supabase.rpc('check_appointment_limit', {
        p_patient_id: profile.user_id,
        p_clinic_id: clinicId,
        p_appointment_date: appointmentDate
      });

      if (error) throw error;

      setAppointmentLimitCheck(data);

      if (!data.allowed && data.reason === 'daily_limit_exceeded') {
        setSameDayConflict(data.data?.existing_appointment || null);
      } else {
        setSameDayConflict(null);
      }

      return data || { allowed: true, message: 'No restrictions' };

    } catch (err) {
      console.error('Error checking appointment limits:', err);
      return {
        allowed: false,
        reason: 'error',
        message: 'Unable to verify appointment limits'
      };
    }
  }, [isPatient, profile?.user_id]);

  const checkConsultationRequirement = useCallback(async (serviceIds, clinicId) => {
    if (!serviceIds || serviceIds.length === 0) return null;
    
    try {
      const consultationChecks = await Promise.all(
        serviceIds.map(serviceId =>
          supabase.rpc('can_book_service_without_consultation', {
            p_patient_id: user.id,
            p_service_id: serviceId,
            p_clinic_id: clinicId
          })
        )
      );
      
      const allAllowed = consultationChecks.every(check => check.data?.allowed);
      const anyRequiresConsultation = consultationChecks.some(
        check => !check.data?.allowed
      );
      
      return {
        canSkipConsultation: allAllowed,
        requiresConsultation: anyRequiresConsultation,
        checks: consultationChecks.map(c => c.data),
      };
    } catch (error) {
      console.error('Error checking consultation requirement:', error);
      return null;
    }
  }, [user?.id]);

  // Auto-check availability
  useEffect(() => {
    const checkAvailability = async () => {
      const currentBookingData = {
        doctorId: bookingData.doctor?.id,
        date: bookingData.date,
        services: bookingData.services
      };

      const prevData = previousBookingDataRef.current;
      if (prevData && 
          prevData.doctorId === currentBookingData.doctorId &&
          prevData.date === currentBookingData.date &&
          JSON.stringify(prevData.services) === JSON.stringify(currentBookingData.services)) {
        return;
      }

      previousBookingDataRef.current = currentBookingData;

      // ✅ FIXED: Also check for consultation-only (no services)
      if (!currentBookingData.doctorId || !currentBookingData.date) {
        setAvailableTimes([]);
        return;
      }

      setCheckingAvailability(true);
      
      try {
        const result = await checkAllAvailableTimes(
          currentBookingData.doctorId,
          currentBookingData.date,
          currentBookingData.services || []  // ✅ FIXED: empty array for consultation-only
        );

        if (result.success && Array.isArray(result.slots)) {
          const availableSlots = result.slots
            .filter(slot => slot.available === true)
            .map(slot => slot.time);
          
          setAvailableTimes(availableSlots);
        } else {
          setAvailableTimes([]);
        }
      } catch (err) {
        console.error('Error checking availability:', err);
        setAvailableTimes([]);
      } finally {
        setCheckingAvailability(false);
      }
    };

    checkAvailability();
  }, [bookingData.doctor?.id, bookingData.date, bookingData.services, checkAllAvailableTimes]);

  const validateStep = useCallback((step) => {
    switch (step) {
      case 'clinic':
        return Boolean(bookingData.clinic?.id);
      case 'services':
        // ✅ FIXED: Services step is ALWAYS valid (can skip for consultation-only)
        return true;
      case 'doctor':
        return Boolean(bookingData.doctor?.id);
      case 'datetime':
        return Boolean(bookingData.date && bookingData.time);
      case 'confirm':
        // ✅ FIXED: Services are NOT required for confirmation
        return Boolean(
          bookingData.clinic?.id && 
          bookingData.doctor?.id && 
          bookingData.date && 
          bookingData.time
          // ❌ REMOVED: && bookingData.services?.length > 0
        );
      default:
        return false;
    }
}, [bookingData]);

  const goToStep = useCallback((step) => {
    setBookingStep(step);
    setError(null);
    window.history.replaceState({ step }, '', window.location.pathname);
  }, []);

  const nextStep = useCallback(() => {
    const steps = ['clinic', 'services', 'doctor', 'datetime', 'confirm'];
    const currentIndex = steps.indexOf(bookingStep);
    
    if (currentIndex < steps.length - 1 && validateStep(bookingStep)) {
      const nextStepName = steps[currentIndex + 1];
      setBookingStep(nextStepName);
      setError(null);
      window.history.pushState({ step: nextStepName }, '', window.location.pathname);
    } else if (!validateStep(bookingStep)) {
      setError(`Please complete the ${bookingStep} selection`);
    }
  }, [bookingStep, validateStep]);

  const previousStep = useCallback(() => {
    const steps = ['clinic', 'services', 'doctor', 'datetime', 'confirm'];
    const currentIndex = steps.indexOf(bookingStep);
    
    if (currentIndex > 0) {
      const prevStepName = steps[currentIndex - 1];
      setBookingStep(prevStepName);
      setError(null);
      window.history.pushState({ step: prevStepName }, '', window.location.pathname);
    }
  }, [bookingStep]);

  const computedValues = useMemo(() => {
    const steps = ['clinic', 'services', 'doctor', 'datetime', 'confirm'];
    const currentStepIndex = steps.indexOf(bookingStep);
    
    const selectedTreatment = ongoingTreatments.find(t => t.id === bookingData.treatmentPlanId);
    
    // ✅ NEW: Determine booking type
    const isConsultationOnly = !bookingData.services || bookingData.services.length === 0;
    
    return {
      canProceed: validateStep(bookingStep) && !sameDayConflict,
      isComplete: bookingStep === 'confirm' && validateStep('confirm'),
      allDataValid: validateStep('confirm') && !sameDayConflict,
      currentStepIndex,
      totalSteps: steps.length,
      stepProgress: ((currentStepIndex + 1) / steps.length) * 100,
      totalServices: bookingData.services?.length || 0,
      maxServicesReached: bookingData.services?.length >= 3,

      // ✅ NEW: Booking type detection
      isConsultationOnly,
      bookingType: bookingData.treatmentPlanId 
        ? 'treatment_plan_follow_up'
        : isConsultationOnly
          ? 'consultation_only'
          : 'consultation_with_service',

      // Treatment plan context
      hasOngoingTreatments: ongoingTreatments.length > 0,
      isLinkedToTreatment: Boolean(bookingData.treatmentPlanId),
      selectedTreatment,
    };
  }, [bookingStep, bookingData.services, bookingData.treatmentPlanId, validateStep, sameDayConflict, ongoingTreatments]);

  return {
    loading,
    error,
    bookingStep,
    bookingData,
    checkingAvailability,
    availableTimes,
    appointmentLimitCheck,
    sameDayConflict,
    
    // ✅ NEW: Treatment plan support
    ongoingTreatments,
    showTreatmentLinkPrompt,
    checkingTreatments,
    checkConsultationRequirement,
    
    // Actions
    updateBookingData,
    resetBooking,
    bookAppointment,
    goToStep,
    nextStep,
    previousStep,
    getAvailableDoctors,
    getServices,
    checkAllAvailableTimes,
    checkAppointmentLimits,
    
    // ✅ NEW: Treatment plan actions
    checkOngoingTreatments,
    selectTreatmentPlan,
    clearTreatmentPlanLink,
    dismissTreatmentPrompt: () => setShowTreatmentLinkPrompt(false),
    
    ...computedValues,
    validateStep,
  };
};