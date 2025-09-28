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
    symptoms: '',
  });

  // ✅ FIX: Use refs to prevent infinite loops
  const previousBookingDataRef = useRef();
  const isInitializedRef = useRef(false);

  // ✅ BROWSER BACK BUTTON HANDLER - Fixed dependencies
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

  // ✅ SYNC BROWSER STATE - Simplified
  useEffect(() => {
    if (isInitializedRef.current) {
      window.history.replaceState({ step: bookingStep }, '', window.location.pathname);
    }
  }, [bookingStep]);

  // Reset booking state
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
    
    window.history.replaceState({ step: 'clinic' }, '', window.location.pathname);
  }, []);

  // ✅ FIX: Stable update function
  const updateBookingData = useCallback((updates) => {
    setBookingData(prev => {
      const newData = { ...prev, ...updates };
      
      // Validate services selection (max 3)
      if (updates.services && updates.services.length > 3) {
        setError('Maximum 3 services can be selected');
        return prev;
      }
      
      // Date validation if updating date
      if (updates.date) {
        const appointmentDate = new Date(updates.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (appointmentDate <= today) {
          setError('Appointment must be scheduled for a future date');
          return prev;
        }
      }
      
      return newData;
    });
    setError(null);
  }, []);

  // ✅ FIX: Stable functions with proper dependencies
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
            profile_image_url
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
          profile_image_url: doctor?.profile_image_url
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

  // Get services
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

  // ✅ FIX: Stable availability check function
  const checkAllAvailableTimes = useCallback(async (doctorId, date, serviceIds = []) => {
    if (!doctorId || !date) {
      return { success: false, slots: [], error: 'Missing required parameters' };
    }

    try {
      const { data, error } = await supabase.rpc('get_available_time_slots', {
        p_doctor_id: doctorId,
        p_appointment_date: date,
        p_service_ids: serviceIds
      });

      if (error) throw error;
      
      return data;
    } catch (err) {
      return { 
        success: false, 
        slots: [], 
        error: err.message 
      };
    }
  }, []);

  // ✅ FIX: Prevent infinite loops in availability checking
  useEffect(() => {
    const checkAvailability = async () => {
      const currentBookingData = {
        doctorId: bookingData.doctor?.id,
        date: bookingData.date,
        services: bookingData.services
      };

      // ✅ Compare with previous data to prevent unnecessary calls
      const prevData = previousBookingDataRef.current;
      if (prevData && 
          prevData.doctorId === currentBookingData.doctorId &&
          prevData.date === currentBookingData.date &&
          JSON.stringify(prevData.services) === JSON.stringify(currentBookingData.services)) {
        return; // No change, skip the call
      }

      previousBookingDataRef.current = currentBookingData;

      if (!currentBookingData.doctorId || !currentBookingData.date || currentBookingData.services.length === 0) {
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

        if (result.success) {
          const availableSlots = result.slots
            .filter(slot => slot.available)
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

  // ✅ FIX: Book appointment with stable dependencies
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
        setError(data?.error || 'Booking failed');
        return { success: false, error: data?.error };
      }

      // Success - reset booking and browser state
      resetBooking();
      
      return {
        success: true,
        appointment: {
          id: data.data?.appointment_id,
          details: data.data,
          clinic_name: clinic.name,
          doctor_name: doctor.name,
          date: date,
          time: time,
          status: 'pending'
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
  }, [bookingData, isPatient, resetBooking]);

  // ✅ FIX: Step validation with stable reference
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

  // Navigation functions with stable references
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

  // ✅ FIX: Memoized computed values with stable dependencies
  const computedValues = useMemo(() => {
    const steps = ['clinic', 'services', 'doctor', 'datetime', 'confirm'];
    const currentStepIndex = steps.indexOf(bookingStep);
    
    return {
      canProceed: validateStep(bookingStep),
      isComplete: bookingStep === 'confirm' && validateStep('confirm'),
      allDataValid: validateStep('confirm'),
      currentStepIndex,
      totalSteps: steps.length,
      stepProgress: ((currentStepIndex + 1) / steps.length) * 100,
      totalServices: bookingData.services?.length || 0,
      maxServicesReached: bookingData.services?.length >= 3,
    };
  }, [bookingStep, bookingData.services, validateStep]);

  return {
    // State
    loading,
    error,
    bookingStep,
    bookingData,
    checkingAvailability,
    availableTimes,

    // Actions
    updateBookingData,
    resetBooking,
    bookAppointment,

    // Step navigation
    goToStep,
    nextStep,
    previousStep,

    // Data fetching
    getAvailableDoctors,
    getServices,
    checkAllAvailableTimes,

    // Computed values (memoized)
    ...computedValues,
    
    // Helper functions
    validateStep,
  };
};