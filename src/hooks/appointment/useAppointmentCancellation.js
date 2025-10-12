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
          *,
          patient:patients!inner (
            user_profiles!inner (
              email,
              first_name,
              last_name,
              phone
            )
          ),
          clinic:clinics!inner (
            name,
            email,
            contact_email,
            phone
          ),
          doctor:doctors!inner (
            first_name,
            last_name
          )
        `)
        .eq('id', appointmentId)
        .single();
  
      if (fetchError) {
        throw new Error('Failed to fetch appointment details');
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
          staff_email: appointmentDetails.clinic?.email || appointmentDetails.clinic?.contact_email,
          patient: {
            name: `${appointmentDetails.patient?.user_profiles?.first_name} ${appointmentDetails.patient?.user_profiles?.last_name}`.trim(),
            email: appointmentDetails.patient?.user_profiles?.email,
            phone: appointmentDetails.patient?.user_profiles?.phone
          },
          appointment: {
            date: appointmentDetails.appointment_date,
            time: appointmentDetails.appointment_time
          },
          clinic: {
            name: appointmentDetails.clinic?.name
          },
          doctor: {
            name: `Dr. ${appointmentDetails.doctor?.first_name} ${appointmentDetails.doctor?.last_name}`.trim()
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
            email: appointmentDetails.patient?.user_profiles?.email,
            first_name: appointmentDetails.patient?.user_profiles?.first_name
          },
          appointment: {
            date: appointmentDetails.appointment_date,
            time: appointmentDetails.appointment_time
          },
          clinic: {
            name: appointmentDetails.clinic?.name,
            phone: appointmentDetails.clinic?.phone,
            email: appointmentDetails.clinic?.email || appointmentDetails.clinic?.contact_email
          },
          doctor: {
            name: `Dr. ${appointmentDetails.doctor?.first_name} ${appointmentDetails.doctor?.last_name}`.trim()
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