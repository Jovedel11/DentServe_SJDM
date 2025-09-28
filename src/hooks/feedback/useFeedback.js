import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/context/AuthProvider';

export const useFeedback = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isPatient } = useAuth();

  const submitFeedback = useCallback(async (feedbackData) => {
    if (!isPatient) {
      const error = 'Only patients can submit feedback';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      const comment = feedbackData.comment || feedbackData.feedback_text;
      
      // ✅ Enhanced validation
      if (!feedbackData.rating || feedbackData.rating < 1 || feedbackData.rating > 5) {
        throw new Error('Rating must be between 1 and 5 stars');
      }

      if (!comment || comment.trim().length === 0) {
        throw new Error('Feedback comment is required');
      }

      if (comment.length > 1000) {
        throw new Error('Feedback must be under 1000 characters');
      }

      if (comment.trim().length < 10) {
        throw new Error('Feedback must be at least 10 characters long');
      }

      if (!feedbackData.appointment_id && !feedbackData.clinic_id) {
        throw new Error('Either appointment ID or clinic ID is required');
      }

      // ✅ Validate feedback_type enum values
      const validFeedbackTypes = ['general', 'service', 'doctor', 'facility'];
      const feedbackType = feedbackData.feedback_type || 'general';
      if (!validFeedbackTypes.includes(feedbackType)) {
        throw new Error(`Invalid feedback type. Must be one of: ${validFeedbackTypes.join(', ')}`);
      }

      const { data, error: rpcError } = await supabase.rpc('submit_feedback', {
        p_rating: feedbackData.rating,
        p_comment: comment,
        p_appointment_id: feedbackData.appointment_id || null,
        p_clinic_id: feedbackData.clinic_id || null, 
        p_feedback_type: feedbackType,
        p_is_anonymous: feedbackData.is_anonymous || false
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to submit feedback');
      }

      return {
        success: true,
        data: data.data,
        message: data.message || 'Feedback submitted successfully and staff notified'
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to submit feedback';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [isPatient]);

  // ✅ OPTIMIZED: Direct appointment check instead of fetching all
  const checkFeedbackEligibility = useCallback(async (appointmentId) => {
    try {
      setLoading(true);
      
      // ✅ FIXED: Direct appointment query instead of fetching all
      const { data: appointment, error: aptError } = await supabase
        .from('appointments')
        .select(`
          id,
          status,
          appointment_date,
          appointment_time,
          patient_id,
          clinic_id,
          clinics(name, address),
          doctors(first_name, last_name, specialization)
        `)
        .eq('id', appointmentId)
        .eq('status', 'completed')
        .single();

      if (aptError || !appointment) {
        return {
          can_submit: false,
          already_submitted: false,
          appointment_status: 'not_found',
          error: 'Appointment not found or not completed'
        };
      }

      // ✅ OPTIMIZED: Direct feedback check
      const { data: existingFeedback, error: feedbackError } = await supabase
        .from('feedback')
        .select('id')
        .eq('appointment_id', appointmentId)
        .single();

      return {
        can_submit: !existingFeedback,
        already_submitted: !!existingFeedback,
        appointment_status: appointment.status,
        appointment: appointment
      };

    } catch (err) {
      console.error('Error checking feedback eligibility:', err);
      return {
        can_submit: false,
        already_submitted: false,
        error: err.message
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    submitFeedback,
    checkFeedbackEligibility,
    clearError: () => setError(null)
  };
};