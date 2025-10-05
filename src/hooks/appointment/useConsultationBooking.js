import { useState, useCallback } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

/**
 * ✅ Consultation-Only Booking Hook
 * Specialized hook for booking doctor consultations without services
 * Complements useAppointmentBooking for consultation-focused workflows
 */
export const useConsultationBooking = () => {
  const { user, profile, isPatient } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Book consultation-only appointment
   */
  const bookConsultation = useCallback(async ({
    clinicId,
    doctorId,
    appointmentDate,
    appointmentTime,
    symptoms = null
  }) => {
    if (!isPatient) {
      return { success: false, error: 'Only patients can book consultations' };
    }

    try {
      setLoading(true);
      setError(null);

      // Call database function with NO services
      const { data, error: dbError } = await supabase.rpc('book_appointment', {
        p_clinic_id: clinicId,
        p_doctor_id: doctorId,
        p_appointment_date: appointmentDate,
        p_appointment_time: appointmentTime,
        p_service_ids: null,  // ✅ Consultation-only
        p_symptoms: symptoms,
        p_treatment_plan_id: null
      });

      if (dbError) throw dbError;
      if (!data?.success) throw new Error(data?.error || 'Booking failed');

      return {
        success: true,
        appointment: data.data,
        message: data.message
      };

    } catch (err) {
      const errorMsg = err.message || 'Failed to book consultation';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [isPatient, profile?.user_id]);

  /**
   * Check doctor availability for consultation
   */
  const checkConsultationAvailability = useCallback(async (doctorId, date) => {
    try {
      const { data, error } = await supabase.rpc('get_available_time_slots', {
        p_doctor_id: doctorId,
        p_appointment_date: date,
        p_service_ids: null  // ✅ No services for consultation
      });

      if (error) throw error;

      return {
        success: true,
        slots: data?.slots || [],
        availableCount: (data?.slots || []).filter(s => s.available).length
      };
    } catch (err) {
      return { success: false, error: err.message, slots: [] };
    }
  }, []);

  /**
   * Get doctors with consultation availability
   */
  const getDoctorsWithConsultationAvailability = useCallback(async (clinicId) => {
    try {
      const { data, error } = await supabase
        .from('doctor_clinics')
        .select(`
          doctors!inner (
            id,
            first_name,
            last_name,
            specialization,
            consultation_fee,
            experience_years,
            rating,
            is_available
          )
        `)
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
        .eq('doctors.is_available', true);

      if (error) throw error;

      const doctors = data.map(item => ({
        ...item.doctors,
        name: `Dr. ${item.doctors.first_name} ${item.doctors.last_name}`.trim()
      }));

      return { success: true, doctors };
    } catch (err) {
      return { success: false, error: err.message, doctors: [] };
    }
  }, []);

  return {
    loading,
    error,
    bookConsultation,
    checkConsultationAvailability,
    getDoctorsWithConsultationAvailability,
    clearError: () => setError(null)
  };
};