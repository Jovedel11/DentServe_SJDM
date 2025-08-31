import { useState, useCallback } from 'react';
import { useAuth } from '../../auth/context/AuthProvider';
import { supabase } from '../../lib/supabaseClient';

export const useAppointmentBooking = () => {
  const { user, profile, isPatient } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bookingStep, setBookingStep] = useState('clinic');
  const [bookingData, setBookingData] = useState({
    clinic: null,
    doctor: null,
    date: null,
    time: null,
    services: [], // Array of service IDs
    symptoms: '',
  });

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
    setError(null);
  }, []);

  // Update booking data with validation
  const updateBookingData = useCallback((updates) => {
    setBookingData(prev => {
      const newData = { ...prev, ...updates };
      
      // Validate services selection (max 3)
      if (updates.services && updates.services.length > 3) {
        setError('Maximum 3 services can be selected');
        return prev;
      }
      
      return newData;
    });
    setError(null);
  }, []);

  // Get available doctors with correct schema
  const getAvailableDoctors = useCallback(async (clinicId) => {
    if (!clinicId) return { success: false, doctors: [], error: 'Clinic ID required' };

    try {
      setLoading(true);
      setError(null);

      // Correct schema - doctors don't have names, get from user_profiles
      const { data, error } = await supabase
        .from('doctor_clinics')
        .select(`
          doctors (
            id,
            specialization,
            consultation_fee,
            certifications,
            awards,
            experience_years,
            is_available,
            rating,
            user_id,
            first_name,
            last_name,
          )
        `)
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
        .eq('doctors.is_available', true);

      if (error) throw new Error(error.message);

      const doctors = data?.map(item => {
        const doctor = item.doctors;
        const first_name = doctor?.first_name;
        const last_name = doctor?.last_name;
        const full_name = first_name && last_name ? `${first_name} ${last_name}` : '';

        return {
        id: doctor?.id,
        specialization: doctor?.specialization,
        consultation_fee: doctor?.consultation_fee,
        certifications: doctor?.certifications,
        awards: doctor?.awards,
        experience_years: doctor?.experience_years,
        rating: doctor?.rating,
        name: doctor ? `Dr. ${first_name} ${last_name}` : 'Unknown Doctor',
        display_name: full_name || doctor?.specialization || 'Unknown'
        };
      }) || [];

      return { 
        success: true, 
        doctors, 
        count: doctors.length,
        error: null 
      };

    } catch (err) {
      const errorMsg = err?.message || 'Failed to load available doctors';
      setError(errorMsg);
      console.error('Get available doctors error:', err);
      return { 
        success: false, 
        doctors: [], 
        error: errorMsg 
      };
    } finally {
      setLoading(false);
    }
  }, []);

  // Get services with detailed info
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
        .order('priority', { ascending: true });

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

  // Proper availability check with multiple services
  const checkSlotAvailability = useCallback(async (doctorId, date, time, serviceIds = []) => {
    if (!doctorId || !date || !time) {
      return { available: false, error: 'Missing required parameters' };
    }

    try {
      // Calculate total duration from selected services
      let totalDuration = 60; // Default
      
      if (serviceIds.length > 0) {
        const { data: services, error: servicesError } = await supabase
          .from('services')
          .select('duration_minutes')
          .in('id', serviceIds);
          
        if (!servicesError && services) {
          totalDuration = services.reduce((sum, service) => sum + service.duration_minutes, 0);
        }
      }

      const { data, error } = await supabase.rpc('check_appointment_availability', {
        p_doctor_id: doctorId,
        p_appointment_date: date,
        p_appointment_time: time,
        p_duration_minutes: totalDuration
      });

      if (error) throw new Error(error.message);
      
      return { 
        available: data || false, 
        duration: totalDuration,
        error: null 
      };

    } catch (err) {
      console.error('Slot availability check error:', err);
      return { 
        available: false, 
        error: err.message 
      };
    }
  }, []);

  // Book appointment with comprehensive validation
  const bookAppointment = useCallback(async () => {
    if (!isPatient()) {
      setError('Only patients can book appointments');
      return { success: false, error: 'Access denied' };
    }

    const { clinic, doctor, date, time, services, symptoms } = bookingData;

    // Enhanced validation
    if (!clinic?.id || !doctor?.id || !date || !time) {
      setError('Please complete all booking details');
      return { success: false, error: 'Missing required fields' };
    }

    if (!services || services.length === 0) {
      setError('Please select at least one service');
      return { success: false, error: 'No services selected' };
    }

    if (services.length > 3) {
      setError('Maximum 3 services can be selected');
      return { success: false, error: 'Too many services' };
    }

    try {
      setLoading(true);
      setError(null);

      // Use correct parameter structure
      const { data, error } = await supabase.rpc('book_appointment', {
        p_clinic_id: clinic.id,
        p_doctor_id: doctor.id,
        p_appointment_date: date,
        p_appointment_time: time,
        p_service_ids: services, // Array of UUIDs
        p_symptoms: symptoms || null,
      });

      if (error) throw new Error(error.message);

      // Handle function response properly
      if (data?.authenticated === false) {
        setError('Please log in to continue');
        return { success: false, error: 'Authentication required' };
      }

      if (!data?.success) {
        setError(data?.error || 'Booking failed');
        return { success: false, error: data?.error };
      }

      // Success - reset booking
      resetBooking();
      
      return {
        success: true,
        appointment: {
          id: data.appointment_id,
          details: data.appointment_details,
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
      console.error('Appointment booking error:', err);
      return { 
        success: false, 
        error: errorMsg 
      };
    } finally {
      setLoading(false);
    }
  }, [bookingData, isPatient, resetBooking]);

  // Step validation with detailed checks
  const validateStep = useCallback((step) => {
    switch (step) {
      case 'clinic':
        return bookingData.clinic?.id;
      case 'services':
        return bookingData.services?.length > 0;
      case 'doctor':
        return bookingData.doctor?.id;
      case 'datetime':
        return bookingData.date && bookingData.time;
      case 'confirm':
        return bookingData.clinic && bookingData.doctor && 
              bookingData.date && bookingData.time && 
              bookingData.services?.length > 0;
      default:
        return false;
    }
  }, [bookingData]);

  //Navigation with better step flow
  const goToStep = useCallback((step) => {
    setBookingStep(step);
    setError(null);
  }, []);

  const nextStep = useCallback(() => {
    const steps = ['clinic', 'services', 'doctor', 'datetime', 'confirm'];
    const currentIndex = steps.indexOf(bookingStep);
    
    if (currentIndex < steps.length - 1 && validateStep(bookingStep)) {
      setBookingStep(steps[currentIndex + 1]);
      setError(null);
    } else if (!validateStep(bookingStep)) {
      setError(`Please complete the ${bookingStep} selection`);
    }
  }, [bookingStep, validateStep]);

  const previousStep = useCallback(() => {
    const steps = ['clinic', 'services', 'doctor', 'datetime', 'confirm'];
    const currentIndex = steps.indexOf(bookingStep);
    
    if (currentIndex > 0) {
      setBookingStep(steps[currentIndex - 1]);
      setError(null);
    }
  }, [bookingStep]);

  // Get selected services details
  const getSelectedServicesDetails = useCallback(async () => {
    if (!bookingData.services?.length) return [];

    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .in('id', bookingData.services);

      if (error) throw error;

      return data || [];
    } catch (err) {
      console.error('Error getting services details:', err);
      return [];
    }
  }, [bookingData.services]);

  return {
    // State
    loading,
    error,
    bookingStep,
    bookingData,

    // Actions
    updateBookingData,
    resetBooking,
    bookAppointment,

    // Step navigation
    goToStep,
    nextStep,
    previousStep,
    validateStep,

    // Data fetching
    getAvailableDoctors,
    getServices,
    checkSlotAvailability,
    getSelectedServicesDetails,

    // Computed values
    canProceed: validateStep(bookingStep),
    isComplete: validateStep('confirm'),
    totalServices: bookingData.services?.length || 0,
    maxServicesReached: bookingData.services?.length >= 3,
    
    // Step info
    currentStepIndex: ['clinic', 'services', 'doctor', 'datetime', 'confirm'].indexOf(bookingStep),
    totalSteps: 5,
    stepProgress: ((['clinic', 'services', 'doctor', 'datetime', 'confirm'].indexOf(bookingStep) + 1) / 5) * 100
  };
};