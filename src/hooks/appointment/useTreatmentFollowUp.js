import { useState, useCallback } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

export const useTreatmentPlanFollowUp = () => {
  const { user, profile, isPatient } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bookingInfo, setBookingInfo] = useState(null);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  /**
   * Get pre-filled booking info for treatment plan follow-up
   */
  const getFollowUpBookingInfo = useCallback(async (treatmentPlanId) => {
    if (!isPatient) {
      return { success: false, error: 'Only patients can book follow-ups' };
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase.rpc(
        'get_treatment_plan_booking_info',
        { p_treatment_plan_id: treatmentPlanId }
      );

      if (dbError) throw dbError;
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to get booking info');
      }

      const info = data.data;

      // Validate doctor availability
      if (!info.doctor?.is_available) {
        return {
          success: false,
          error: 'Assigned doctor is currently unavailable. Please contact the clinic.',
          info
        };
      }

      setBookingInfo(info);

      return {
        success: true,
        info,
        message: 'Booking information loaded successfully'
      };

    } catch (err) {
      const errorMsg = err.message || 'Failed to get booking info';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [isPatient]);

  /**
   * Check available time slots for the recommended date
   */
  const checkAvailableTimesForFollowUp = useCallback(async (treatmentPlanId, customDate = null) => {
    if (!bookingInfo && !treatmentPlanId) {
      return { success: false, error: 'Booking info not loaded' };
    }

    try {
      setCheckingAvailability(true);

      // If no booking info yet, fetch it first
      let info = bookingInfo;
      if (!info && treatmentPlanId) {
        const result = await getFollowUpBookingInfo(treatmentPlanId);
        if (!result.success) {
          return result;
        }
        info = result.info;
      }

      const dateToCheck = customDate || info.recommended_date;
      const serviceIds = info.services?.map(s => s.id) || [];

      const { data, error } = await supabase.rpc('get_available_time_slots', {
        p_doctor_id: info.doctor.id,
        p_appointment_date: dateToCheck,
        p_service_ids: serviceIds.length > 0 ? serviceIds : null
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to check availability');
      }

      const slots = data.slots || [];
      const availableSlots = slots.filter(slot => slot.available);

      setAvailableTimes(availableSlots);

      return {
        success: true,
        slots: availableSlots,
        totalSlots: slots.length,
        availableCount: availableSlots.length
      };

    } catch (err) {
      const errorMsg = err.message || 'Failed to check availability';
      setError(errorMsg);
      return { success: false, error: errorMsg, slots: [] };
    } finally {
      setCheckingAvailability(false);
    }
  }, [bookingInfo, getFollowUpBookingInfo]);

  /**
   * Book treatment plan follow-up appointment
   */
  const bookFollowUpAppointment = useCallback(async ({
    treatmentPlanId,
    appointmentDate,
    appointmentTime,
    symptoms = null
  }) => {
    if (!isPatient) {
      return { success: false, error: 'Only patients can book appointments' };
    }

    if (!bookingInfo) {
      return { success: false, error: 'Booking info not loaded. Please refresh and try again.' };
    }

    try {
      setLoading(true);
      setError(null);

      const { clinic, doctor, services } = bookingInfo;
      const serviceIds = services?.map(s => s.id) || [];

      // Call book_appointment with treatment_plan_id
      const { data, error: dbError } = await supabase.rpc('book_appointment', {
        p_clinic_id: clinic.id,
        p_doctor_id: doctor.id,
        p_appointment_date: appointmentDate,
        p_appointment_time: appointmentTime,
        p_service_ids: serviceIds.length > 0 ? serviceIds : null,
        p_symptoms: symptoms,
        p_treatment_plan_id: treatmentPlanId,
        p_skip_consultation: false  // Treatment plans usually need consultation
      });

      if (dbError) throw dbError;
      if (!data?.success) {
        throw new Error(data?.error || 'Booking failed');
      }

      // Reset state after successful booking
      setBookingInfo(null);
      setAvailableTimes([]);

      return {
        success: true,
        appointment: data.data,
        message: data.message || 'Follow-up appointment booked successfully!'
      };

    } catch (err) {
      const errorMsg = err.message || 'Failed to book follow-up appointment';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [isPatient, bookingInfo]);

  /**
   * Quick book with recommended date
   */
  const quickBookFollowUp = useCallback(async (treatmentPlanId, selectedTime, symptoms = null) => {
    if (!bookingInfo) {
      // Load booking info first
      const result = await getFollowUpBookingInfo(treatmentPlanId);
      if (!result.success) {
        return result;
      }
    }

    const info = bookingInfo;
    if (!info.recommended_date) {
      return {
        success: false,
        error: 'No recommended date available. Please contact the clinic.'
      };
    }

    return await bookFollowUpAppointment({
      treatmentPlanId,
      appointmentDate: info.recommended_date,
      appointmentTime: selectedTime,
      symptoms
    });
  }, [bookingInfo, getFollowUpBookingInfo, bookFollowUpAppointment]);

  /**
   * Validate if can book follow-up
   */
  const canBookFollowUp = useCallback(() => {
    if (!bookingInfo) return { can: false, reason: 'No booking info loaded' };
    
    const { doctor, clinic, treatment_plan } = bookingInfo;
    
    if (!doctor) {
      return { can: false, reason: 'No doctor assigned to treatment plan' };
    }
    
    if (!doctor.is_available) {
      return { can: false, reason: 'Assigned doctor is currently unavailable' };
    }
    
    if (treatment_plan.status !== 'active') {
      return { can: false, reason: 'Treatment plan is not active' };
    }
    
    return { can: true, reason: 'Ready to book' };
  }, [bookingInfo]);

  return {
    // State
    loading,
    error,
    bookingInfo,
    availableTimes,
    checkingAvailability,
    
    // Actions
    getFollowUpBookingInfo,
    checkAvailableTimesForFollowUp,
    bookFollowUpAppointment,
    quickBookFollowUp,
    
    // Validation
    canBookFollowUp,
    
    // Computed
    isReady: bookingInfo !== null,
    hasServices: bookingInfo?.services?.length > 0,
    hasRecommendedDate: bookingInfo?.recommended_date !== null,
    doctorAvailable: bookingInfo?.doctor?.is_available === true,
    
    // Utilities
    clearError: () => setError(null),
    resetBooking: () => {
      setBookingInfo(null);
      setAvailableTimes([]);
      setError(null);
    }
  };
};