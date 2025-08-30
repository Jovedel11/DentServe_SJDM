import { useState, useCallback } from 'react';
import { useAuth } from '../../auth/context/AuthProvider';
import { supabase } from '../../lib/supabaseClient';

export const useAppointmentBooking = () => {
  const { user, profile, isPatient } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bookingStep, setBookingStep] = useState('clinic'); // clinic -> services -> doctor -> datetime -> confirm
  const [bookingData, setBookingData] = useState({
    clinic: null,
    doctor: null,
    date: null,
    time: null,
    services: [],
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

  // Update booking data
  const updateBookingData = useCallback((updates) => {
    setBookingData(prev => ({ ...prev, ...updates }));
    setError(null);
  }, []);

  // Get available doctors for selected clinic
  const getAvailableDoctors = useCallback(async (clinicId) => {
    if (!clinicId) return [];

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('doctor_clinics')
        .select(`
          doctors (
            id,
            specialization,
            consultation_fee,
            certifications,
            award,
            experience_years,
            is_available,
            rating,
          )
        `)
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
        .eq('doctors.is_available', true);

      if (error) throw new Error(error.message || 'Failed to fetch doctors');

      const doctors = data?.map(item => ({
        ...item.doctor,
        name: `Dr. ${item.doctor.first_name} ${item.doctor.last_name}`,
        specialization: `${item.doctor.specialization}`
      })) || [];

      return doctors;
    } catch (err) {
      const errorMsg = err?.message || 'Failed to load available doctors';
      setError(errorMsg);
      console.error('Get available doctors error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getServices = useCallback(async (clinicId) => {
    if (!clinicId) return [] 
    try {
      const { data: clinicServices, error } = await supabase
        .from('services')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('is_active', true);

      if (error) throw new Error(error.message || 'Failed to load services');

      return clinicServices;
    } catch (error) {
      const errorMsg = error?.message || 'Failed to load services';
      setError(errorMsg);
      return [];
    } finally {
      setLoading(false);
    }
  });

  // Check appointment availability for specific slot
  const checkSlotAvailability = useCallback(async (doctorId, date, time, duration = 60) => {
    if (!doctorId || !date || !time) return false;

    try {
      const { data, error } = await supabase.rpc('check_appointment_availability', {
        p_doctor_id: doctorId,
        p_appointment_date: date,
        p_appointment_time: time,
        p_duration_minutes: duration
      });

      if (error) throw new Error(error.message);
      return data || false;
    } catch (err) {
      console.error('Slot availability check error:', err);
      return false;
    }
  }, []);

  // Get available time slots for a doctor on specific date
  const getAvailableTimeSlots = useCallback(async (doctorId, date, clinicId) => {
    if (!doctorId || !date || !clinicId) return [];

    try {
      setLoading(true);
      
      // Get clinic operating hours
      const { data: clinic, error: clinicError } = await supabase
        .from('clinics')
        .select('operating_hours')
        .eq('id', clinicId)
        .single();

      if (clinicError) throw new Error(clinicError.message);

      // Get existing appointments for this doctor on this date
      const { data: appointments, error: appointmentError } = await supabase
        .from('appointments')
        .select('appointment_time, duration_minutes')
        .eq('doctor_id', doctorId)
        .eq('appointment_date', date)
        .not('status', 'in', '(cancelled,no_show)');

      if (appointmentError) throw new Error(appointmentError.message);

      // Generate available slots based on operating hours
      const operatingHours = clinic?.operating_hours;
      if (!operatingHours) return [];

      const dayOfWeek = new Date(date).getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek]

      let daySchedule;

      if (['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(dayName)) {
        daySchedule = operatingHours.weekdays[dayName]
      } else {
        daySchedule = operatingHours.weekends[dayName]
      }

      if (!daySchedule || !daySchedule.open || !daySchedule.start || !daySchedule.end) {
        return [];
      }

      // Generate time slots (30-minute intervals)
      const slots = [];
      const startTime = daySchedule.start;
      const endTime = daySchedule.end;
      
      let currentTime = startTime;
      while (currentTime < endTime) {
        // Check if slot conflicts with existing appointments
        const hasConflict = appointments?.some(apt => {
          const aptStart = apt.appointment_time;
          const aptEnd = addMinutes(aptStart, apt.duration_minutes);
          const slotEnd = addMinutes(currentTime, 60); // Default 1-hour slots
          
          return (currentTime < aptEnd && slotEnd > aptStart);
        });

        if (!hasConflict) {
          slots.push({
            time: currentTime,
            available: true,
            label: formatTime(currentTime)
          });
        }

        currentTime = addMinutes(currentTime, 30); // 30-minute intervals
      }

      return slots;
    } catch (err) {
      const errorMsg = err?.message || 'Failed to load time slots';
      setError(errorMsg);
      console.error('Get time slots error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Book appointment using the enhanced function
  const bookAppointment = useCallback(async () => {
    if (!isPatient()) {
      setError('Only patients can book appointments');
      return { success: false };
    }

    const { clinic, doctor, date, time, services, symptoms } = bookingData;

    // Validation
    if (!clinic || !doctor || !date || !time || !services) {
      setError('Please complete all booking details');
      return { success: false };
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

      // Handle authentication errors
      if (data?.authenticated === false) {
        setError('Please log in to continue');
        return { success: false };
      }

      // Handle function errors
      if (!data?.success) {
        setError(data?.error || 'Booking failed');
        return { success: false };
      }

      // Success
      resetBooking();
      return {
        success: true,
        appointmentId: data.appointment_id,
        details: data.appointment_details,
        message: data.message
      };

    } catch (err) {
      const errorMsg = err?.message || 'Failed to book appointment';
      setError(errorMsg);
      console.error('Appointment booking error:', err);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [bookingData, isPatient, resetBooking]);

  // Validate current booking step
  const validateStep = useCallback((step) => {
    switch (step) {
      case 'clinic':
        return !!bookingData.clinic;
      case 'doctor':
        return !!bookingData.doctor;
      case 'datetime':
        return !!bookingData.date && !!bookingData.time;
      case 'confirm':
        return !!bookingData.services;
      default:
        return false;
    }
  }, [bookingData]);

  // Navigate booking steps
  const goToStep = useCallback((step) => {
    setBookingStep(step);
    setError(null);
  }, []);

  const nextStep = useCallback(() => {
    const steps = ['clinic', 'doctor', 'datetime', 'confirm'];
    const currentIndex = steps.indexOf(bookingStep);
    
    if (currentIndex < steps.length - 1 && validateStep(bookingStep)) {
      setBookingStep(steps[currentIndex + 1]);
      setError(null);
    }
  }, [bookingStep, validateStep]);

  const previousStep = useCallback(() => {
    const steps = ['clinic', 'doctor', 'datetime', 'confirm'];
    const currentIndex = steps.indexOf(bookingStep);
    
    if (currentIndex > 0) {
      setBookingStep(steps[currentIndex - 1]);
      setError(null);
    }
  }, [bookingStep]);

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
    getAvailableTimeSlots,

    // Computed
    canProceed: validateStep(bookingStep),
    isComplete: Object.values(bookingData).every(val => 
      val !== null && val !== '' && val !== undefined
    )
  };
};

// Helper functions
const addMinutes = (time, minutes) => {
  const [hours, mins] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60);
  const newMins = totalMinutes % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}:00`;
};

const formatTime = (time) => {
  const [hours, mins] = time.split(':');
  const hour12 = hours % 12 || 12;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  return `${hour12}:${mins} ${ampm}`;
};