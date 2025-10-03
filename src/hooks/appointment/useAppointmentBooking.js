import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

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
    symptoms: '', // ✅ Notes/symptoms field
  });

  // ✅ NEW: Validation state for real-world rules
  const [appointmentLimitCheck, setAppointmentLimitCheck] = useState(null);
  const [sameDayConflict, setSameDayConflict] = useState(null);

  const previousBookingDataRef = useRef();
  const isInitializedRef = useRef(false);

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
    });
    setBookingStep('clinic');
    setAvailableTimes([]);
    setError(null);
    setSameDayConflict(null);
    setAppointmentLimitCheck(null);
    
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
      
      return newData;
    });
    setError(null);
  }, []);

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

  // ✅ FIXED: Properly extract slots from wrapped response
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

  // ✅ NEW: Check appointment limits with same-day conflict detection
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

      // ✅ Store for display in UI
      setAppointmentLimitCheck(data);

      // ✅ Check for same-day conflict
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

      if (!currentBookingData.doctorId || !currentBookingData.date || !currentBookingData.services?.length) {
        setAvailableTimes([]);
        return;
      }

      setCheckingAvailability(true);
      
      try {
        const result = await checkAllAvailableTimes(
          currentBookingData.doctorId,
          currentBookingData.date,
          currentBookingData.services
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

  // ✅ ENHANCED: Handle new response structure with patient demographics
  const bookAppointment = useCallback(async () => {
    if (!isPatient) {
      setError('Only patients can book appointments');
      return { success: false, error: 'Access denied' };
    }

    const { clinic, doctor, date, time, services, symptoms } = bookingData;

    const requiredFields = [
      { field: clinic?.id, name: 'clinic' },
      { field: doctor?.id, name: 'doctor' },
      { field: date, name: 'date' },
      { field: time, name: 'time' },
      { field: services?.length > 0, name: 'services' }
    ];

    const missingField = requiredFields.find(({ field }) => !field);
    if (missingField) {
      setError(`Please select ${missingField.name}`);
      return { success: false, error: 'Missing required fields' };
    }

    if (services.length > 3) {
      setError('Maximum 3 services can be selected');
      return { success: false, error: 'Too many services' };
    }

    // ✅ Check for same-day conflict before submitting
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

      const { data, error } = await supabase.rpc('book_appointment', {
        p_clinic_id: clinic.id,
        p_doctor_id: doctor.id,
        p_appointment_date: date,
        p_appointment_time: time,
        p_service_ids: services,
        p_symptoms: symptoms || null,
      });

      if (error) throw new Error(error.message);

      if (data?.authenticated === false) {
        setError('Please log in to continue');
        return { success: false, error: 'Authentication required' };
      }

      if (!data?.success) {
        // ✅ Handle same-day conflict from server
        if (data?.reason === 'daily_limit_exceeded' || data?.reason === 'same_day_conflict') {
          setSameDayConflict(data?.data?.existing_appointment || null);
          setError('You already have an appointment scheduled for this date. Please cancel it first or choose another date.');
        } else {
          setError(data?.error || 'Booking failed');
        }
        return { success: false, error: data?.error, reason: data?.reason };
      }

      // ✅ Enhanced response with patient demographics
      const appointmentData = data.data;

      resetBooking();
      
      return {
        success: true,
        appointment: {
          id: appointmentData.appointment_id,
          status: appointmentData.status,
          
          // ✅ NEW: Patient demographics (visible to staff)
          patient_info: appointmentData.patient_info,
          
          // Appointment details
          details: appointmentData.appointment_details,
          
          // Clinic info
          clinic: appointmentData.clinic,
          
          // Doctor info
          doctor: appointmentData.doctor,
          
          // Services
          services: appointmentData.services,
          
          // Pricing
          pricing: appointmentData.pricing_estimate,
          
          // Policies
          cancellation_policy: appointmentData.cancellation_policy,
          
          // Patient reliability
          reliability: appointmentData.patient_reliability,
          
          // ✅ NEW: Cross-clinic context (role-based)
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
  }, [bookingData, isPatient, resetBooking, sameDayConflict]);

  const validateStep = useCallback((step) => {
    switch (step) {
      case 'clinic':
        return Boolean(bookingData.clinic?.id);
      case 'services':
        return Boolean(bookingData.services?.length > 0);
      case 'doctor':
        return Boolean(bookingData.doctor?.id);
      case 'datetime':
        return Boolean(bookingData.date && bookingData.time);
      case 'confirm':
        return Boolean(
          bookingData.clinic?.id && 
          bookingData.doctor?.id && 
          bookingData.date && 
          bookingData.time && 
          bookingData.services?.length > 0
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
    
    return {
      canProceed: validateStep(bookingStep) && !sameDayConflict,
      isComplete: bookingStep === 'confirm' && validateStep('confirm'),
      allDataValid: validateStep('confirm') && !sameDayConflict,
      currentStepIndex,
      totalSteps: steps.length,
      stepProgress: ((currentStepIndex + 1) / steps.length) * 100,
      totalServices: bookingData.services?.length || 0,
      maxServicesReached: bookingData.services?.length >= 3,
    };
  }, [bookingStep, bookingData.services, validateStep, sameDayConflict]);

  return {
    loading,
    error,
    bookingStep,
    bookingData,
    checkingAvailability,
    availableTimes,
    appointmentLimitCheck, // ✅ NEW
    sameDayConflict, // ✅ NEW
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
    ...computedValues,
    validateStep,
  };
};