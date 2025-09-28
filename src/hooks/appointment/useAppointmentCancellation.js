import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../auth/context/AuthProvider';

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

      // ✅ Input validation
      if (!appointmentId) {
        throw new Error('Appointment ID is required');
      }

      if (!cancellationReason || cancellationReason.trim() === '') {
        throw new Error('Cancellation reason is required');
      }

      // ✅ Check eligibility first for patients
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

      // ✅ Handle function response structure
      if (!data.success) {
        throw new Error(data.error || 'Failed to cancel appointment');
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