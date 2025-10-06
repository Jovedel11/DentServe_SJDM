import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/context/AuthProvider';

export const useFeedback = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isPatient } = useAuth();

  /**
   * ✅ UPDATED: Submit feedback with dual ratings
   * @param {Object} feedbackData
   * @param {number} feedbackData.clinic_rating - Rating for clinic (1-5)
   * @param {number} feedbackData.doctor_rating - Rating for doctor (1-5)
   * @param {string} feedbackData.comment - Feedback comment
   * @param {string} feedbackData.appointment_id - REQUIRED appointment ID
   * @param {string} feedbackData.feedback_type - Type: 'general', 'doctor', 'facility', 'service'
   * @param {boolean} feedbackData.is_anonymous - Anonymous submission
   */
  const submitFeedback = useCallback(async (feedbackData) => {
    if (!isPatient) {
      const error = 'Only patients can submit feedback';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      // ✅ VALIDATION: At least one rating required
      if (!feedbackData.clinic_rating && !feedbackData.doctor_rating) {
        throw new Error('Please provide at least one rating (clinic or doctor)');
      }

      // ✅ VALIDATION: Clinic rating
      if (feedbackData.clinic_rating && (feedbackData.clinic_rating < 1 || feedbackData.clinic_rating > 5)) {
        throw new Error('Clinic rating must be between 1 and 5 stars');
      }

      // ✅ VALIDATION: Doctor rating
      if (feedbackData.doctor_rating && (feedbackData.doctor_rating < 1 || feedbackData.doctor_rating > 5)) {
        throw new Error('Doctor rating must be between 1 and 5 stars');
      }

      // ✅ VALIDATION: Comment
      if (!feedbackData.comment || feedbackData.comment.trim().length === 0) {
        throw new Error('Feedback comment is required');
      }

      if (feedbackData.comment.trim().length < 10) {
        throw new Error('Feedback must be at least 10 characters long');
      }

      if (feedbackData.comment.length > 1000) {
        throw new Error('Feedback must be under 1000 characters');
      }

      // ✅ VALIDATION: Appointment required
      if (!feedbackData.appointment_id) {
        throw new Error('Appointment ID is required. Please select an appointment to review.');
      }

      // ✅ VALIDATION: Feedback type
      const validFeedbackTypes = ['general', 'service', 'doctor', 'facility'];
      const feedbackType = feedbackData.feedback_type || 'general';
      if (!validFeedbackTypes.includes(feedbackType)) {
        throw new Error(`Invalid feedback type. Must be one of: ${validFeedbackTypes.join(', ')}`);
      }

      // ✅ CALL NEW FUNCTION with dual ratings
      const { data, error: rpcError } = await supabase.rpc('submit_feedback', {
        p_clinic_rating: feedbackData.clinic_rating || null,
        p_doctor_rating: feedbackData.doctor_rating || null,
        p_comment: feedbackData.comment.trim(),
        p_appointment_id: feedbackData.appointment_id,
        p_feedback_type: feedbackType,
        p_is_anonymous: feedbackData.is_anonymous || false
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to submit feedback');
      }

      console.log('✅ Feedback submitted successfully:', data);

      return {
        success: true,
        data: data.data,
        message: data.message || 'Feedback submitted successfully and staff notified'
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to submit feedback';
      console.error('❌ Submit feedback error:', err);
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [isPatient]);

  /**
   * ✅ Check feedback eligibility for appointment
   */
  const checkFeedbackEligibility = useCallback(async (appointmentId) => {
    try {
      setLoading(true);
      
      const { data: appointment, error: aptError } = await supabase
        .from('appointments')
        .select(`
          id,
          status,
          appointment_date,
          appointment_time,
          patient_id,
          clinic_id,
          doctor_id,
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

      // Check if feedback already submitted
      const { data: existingFeedback, error: feedbackError } = await supabase
        .from('feedback')
        .select('id')
        .eq('appointment_id', appointmentId)
        .maybeSingle();

      return {
        can_submit: !existingFeedback,
        already_submitted: !!existingFeedback,
        appointment_status: appointment.status,
        appointment: appointment,
        has_doctor: !!appointment.doctor_id
      };

    } catch (err) {
      console.error('❌ Error checking feedback eligibility:', err);
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