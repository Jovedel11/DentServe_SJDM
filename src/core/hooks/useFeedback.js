import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/context/AuthProvider';

export const useFeedback = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isPatient, profile } = useAuth();

  const submitFeedback = useCallback(async (feedbackData) => {
    // ✅ Role validation
    if (!isPatient) {
      const error = 'Only patients can submit feedback';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      // ✅ FIXED: Use 'comment' field to match database schema
      const comment = feedbackData.comment || feedbackData.feedback_text;
      
      // ✅ Input validation
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

      // ✅ Require either appointment_id or clinic_id
      if (!feedbackData.appointment_id && !feedbackData.clinic_id) {
        throw new Error('Either appointment ID or clinic ID is required');
      }

      // ✅ FIXED: Validate feedback_type enum values
      const validFeedbackTypes = ['general', 'service', 'doctor', 'facility'];
      const feedbackType = feedbackData.feedback_type || 'general';
      if (!validFeedbackTypes.includes(feedbackType)) {
        throw new Error(`Invalid feedback type. Must be one of: ${validFeedbackTypes.join(', ')}`);
      }

      // ✅ FIXED: Call RPC with correct parameter names matching database function
      const { data, error: rpcError } = await supabase.rpc('submit_feedback', {
        p_rating: feedbackData.rating,
        p_comment: comment, // ✅ FIXED: Use comment not feedback_text
        p_appointment_id: feedbackData.appointment_id || null,
        p_clinic_id: feedbackData.clinic_id || null, 
        p_feedback_type: feedbackType, // ✅ FIXED: Use enum value
        p_is_anonymous: feedbackData.is_anonymous || false
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      // ✅ FIXED: Handle RPC response structure
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

  // ✅ FIXED: Check feedback eligibility using proper RPC
  const checkFeedbackEligibility = useCallback(async (appointmentId) => {
    try {
      setLoading(true);
      
      // Check if appointment exists and is completed
      const { data: appointments, error } = await supabase.rpc('get_appointments_by_role', {
        p_status: ['completed'],
        p_date_from: null,
        p_date_to: null,
        p_limit: 1,
        p_offset: 0
      });

      if (error) throw error;

      const appointment = appointments?.data?.appointments?.find(apt => apt.id === appointmentId);
      
      if (!appointment) {
        return {
          can_submit: false,
          already_submitted: false,
          appointment_status: 'not_found',
          error: 'Appointment not found or not completed'
        };
      }

      // Check if feedback already exists
      const { data: feedbackHistory, error: feedbackError } = await supabase.rpc('get_patient_feedback_history', {
        p_patient_id: null,
        p_include_archived: false,
        p_limit: 100,
        p_offset: 0
      });

      if (feedbackError) throw feedbackError;

      const existingFeedback = feedbackHistory?.data?.feedback_history?.find(
        fb => fb.appointment_id === appointmentId
      );

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
    // State
    loading,
    error,
    
    // Actions
    submitFeedback,
    checkFeedbackEligibility,
    
    // Utilities
    clearError: () => setError(null)
  };
};