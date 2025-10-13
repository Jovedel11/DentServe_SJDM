import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../auth/context/AuthProvider';
import {
  notifyStaffAppointmentCancelled,
  notifyPatientAppointmentCancelled,
} from '@/services/emailService';

export const useAppointmentCancellation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { userRole } = useAuth();

  const checkCancellationEligibility = useCallback(async (appointmentId) => {
    try {
      if (!appointmentId) {
        return { canCancel: false, reason: 'Invalid appointment ID' };
      }

      const { data, error: rpcError } = await supabase.rpc('can_cancel_appointment', {
        p_appointment_id: appointmentId
      });

      if (rpcError) {
        console.error('Cancellation check error:', rpcError);
        return { canCancel: false, reason: 'Unable to check cancellation policy' };
      }

      return { 
        canCancel: data, 
        reason: data ? 'Can be cancelled' : 'Outside cancellation window'
      };

    } catch (err) {
      console.error('Error checking cancellation eligibility:', err);
      return { canCancel: false, reason: 'Error checking policy' };
    }
  }, []);

  const cancelAppointment = useCallback(async (appointmentId, cancellationReason, cancelledBy = null) => {
    try {
      setLoading(true);
      setError(null);
  
      if (!appointmentId) {
        throw new Error('Appointment ID is required');
      }
  
      if (!cancellationReason || cancellationReason.trim() === '') {
        throw new Error('Cancellation reason is required');
      }
  
      // ✅ FETCH appointment details BEFORE canceling (for email)
      const { data: appointmentDetails, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          patient_id,
          clinics!inner (
            name,
            email,
            contact_email,
            phone
          ),
          doctors (
            first_name,
            last_name
          )
        `)
        .eq('id', appointmentId)
        .single();

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        throw new Error('Failed to fetch appointment details: ' + fetchError.message);
      }

      // ✅ Fetch patient profile separately
      const { data: patientProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('email, first_name, last_name, phone')
        .eq('user_id', appointmentDetails.patient_id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        throw new Error('Failed to fetch patient profile: ' + profileError.message);
      }
  
      // Check eligibility first for patients
      if (userRole === 'patient') {
        const eligibility = await checkCancellationEligibility(appointmentId);
        if (!eligibility.canCancel) {
          throw new Error(`Cannot cancel appointment: ${eligibility.reason}`);
        }
      }
  
      const { data, error: rpcError } = await supabase.rpc('cancel_appointment', {
        p_appointment_id: appointmentId,
        p_cancellation_reason: cancellationReason,
        p_cancelled_by: cancelledBy
      });
  
      if (rpcError) {
        throw new Error(rpcError.message);
      }
  
      if (!data.success) {
        throw new Error(data.error || 'Failed to cancel appointment');
      }
  
      // ✅ Use the fetched appointment details for email
      if (userRole === 'patient') {
        // Notify staff
        const emailResult = await notifyStaffAppointmentCancelled({
          staff_email: appointmentDetails.clinics?.email || appointmentDetails.clinics?.contact_email,
          patient: {
            name: `${patientProfile.first_name} ${patientProfile.last_name}`.trim(),
            email: patientProfile.email,
            phone: patientProfile.phone
          },
          appointment: {
            date: appointmentDetails.appointment_date,
            time: appointmentDetails.appointment_time
          },
          clinic: {
            name: appointmentDetails.clinics?.name
          },
          doctor: {
            name: `Dr. ${appointmentDetails.doctors?.first_name} ${appointmentDetails.doctors?.last_name}`.trim()
          },
          cancellation: {
            reason: cancellationReason,
            cancelled_at: new Date().toISOString()
          }
        });
  
        if (!emailResult.success) {
          console.warn('⚠️ Failed to send cancellation email to staff:', emailResult.error);
        }
      } else if (userRole === 'staff') {
        // Notify patient
        const emailResult = await notifyPatientAppointmentCancelled({
          patient: {
            email: patientProfile.email,
            first_name: patientProfile.first_name
          },
          appointment: {
            date: appointmentDetails.appointment_date,
            time: appointmentDetails.appointment_time
          },
          clinic: {
            name: appointmentDetails.clinics?.name,
            phone: appointmentDetails.clinics?.phone,
            email: appointmentDetails.clinics?.email || appointmentDetails.clinics?.contact_email
          },
          doctor: {
            name: `Dr. ${appointmentDetails.doctors?.first_name} ${appointmentDetails.doctors?.last_name}`.trim()
          },
          cancellation: {
            reason: cancellationReason
          }
        });
  
        if (!emailResult.success) {
          console.warn('⚠️ Failed to send cancellation email to patient:', emailResult.error);
        }
      }
  
      return {
        success: true,
        data: data.data,
        message: data.message || 'Appointment cancelled successfully'
      };
  
    } catch (err) {
      const errorMessage = err.message || 'Failed to cancel appointment';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [userRole, checkCancellationEligibility]);

  return {
    // State
    loading,
    error,
    
    // Actions
    checkCancellationEligibility,
    cancelAppointment
  };
};