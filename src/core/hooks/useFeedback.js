import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/context/AuthProvider';

export const useFeedback = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isPatient, profile } = useAuth();

  const submitFeedback = useCallback(async (feedbackData) => {
    // ✅ Role validation
    if (!isPatient()) {
      const error = 'Only patients can submit feedback';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      // ✅ Input validation
      if (!feedbackData.rating || feedbackData.rating < 1 || feedbackData.rating > 5) {
        throw new Error('Rating must be between 1 and 5 stars');
      }

      if (!feedbackData.feedback_text || feedbackData.feedback_text.trim().length === 0) {
        throw new Error('Feedback text is required');
      }

      if (feedbackData.feedback_text.length > 1000) {
        throw new Error('Feedback must be under 1000 characters');
      }

      if (feedbackData.feedback_text.trim().length < 10) {
        throw new Error('Feedback must be at least 10 characters long');
      }

      // ✅ Require either appointment_id or clinic_id
      if (!feedbackData.appointment_id && !feedbackData.clinic_id) {
        throw new Error('Either appointment ID or clinic ID is required');
      }

      // ✅ Validate feedback categories if provided
      const validCategories = ['service', 'staff', 'facility', 'wait_time', 'cleanliness', 'overall'];
      if (feedbackData.feedback_categories) {
        const invalidCategories = feedbackData.feedback_categories.filter(
          cat => !validCategories.includes(cat)
        );
        if (invalidCategories.length > 0) {
          throw new Error(`Invalid feedback categories: ${invalidCategories.join(', ')}`);
        }
      }

      const { data, error: rpcError } = await supabase.rpc('submit_feedback', {
        p_clinic_id: feedbackData.clinic_id,
        p_appointment_id: feedbackData.appointment_id || null,
        p_rating: feedbackData.rating,
        p_feedback_text: feedbackData.feedback_text,
        p_is_anonymous: feedbackData.is_anonymous || false,
        p_recommend_to_others: feedbackData.recommend_to_others,
        p_feedback_categories: feedbackData.feedback_categories || null
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      // ✅ Handle function response structure
      if (!data.success) {
        throw new Error(data.error || 'Failed to submit feedback');
      }

      return {
        success: true,
        data: data.data,
        message: data.message || 'Feedback submitted successfully'
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

  // ✅ Helper to check if feedback already submitted for appointment
  const checkFeedbackEligibility = useCallback(async (appointmentId) => {
    try {
      // This would typically be a separate RPC or part of appointment data
      // For now, we'll assume it's allowed
      return {
        can_submit: true,
        already_submitted: false,
        appointment_status: 'completed'
      };
    } catch (err) {
      console.error('Error checking feedback eligibility:', err);
      return {
        can_submit: true,
        already_submitted: false
      };
    }
  }, []);

  return {
    // State
    loading,
    error,
    
    // Actions
    submitFeedback,
    checkFeedbackEligibility
  };
};