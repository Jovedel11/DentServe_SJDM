import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { useFeedback } from './useFeedback';

export const usePatientFeedback = () => {
  const { user, isPatient } = useAuth();
  const { submitFeedback, loading: feedbackLoading, error: feedbackError } = useFeedback();

  // ✅ SEPARATED STATE
  const [dataState, setDataState] = useState({
    availableClinics: [],
    completedAppointments: [],
    feedbackHistory: [],
  });

  const [formState, setFormState] = useState({
    selectedClinic: null,
    selectedDoctor: null,
    selectedAppointment: null,
    feedbackForm: {
      clinic_rating: 0,
      doctor_rating: 0,
      comment: '',
      feedback_type: 'general',
      is_anonymous: false
    }
  });

  const [uiState, setUIState] = useState({
    loading: true,
    error: null,
    showArchived: false,
    pagination: {
      limit: 20,
      offset: 0,
      totalCount: 0,
      hasMore: false
    }
  });

  const fetchedRef = useRef({
    appointments: false,
    feedback: false
  });

  const handleError = useCallback((error, context) => {
    const errorMessage = error?.message || `Failed to ${context}`;
    console.error(`❌ ${context} error:`, error);
    setUIState(prev => ({ ...prev, error: errorMessage }));
    return { success: false, error: errorMessage };
  }, []);

  // ✅ ENHANCED: Check which appointments already have feedback
  const checkAppointmentsFeedbackStatus = useCallback(async (appointmentIds) => {
    if (!appointmentIds || appointmentIds.length === 0) {
      console.log('⚠️ No appointment IDs to check');
      return {};
    }

    try {
      console.log(`🔍 Checking feedback status for ${appointmentIds.length} appointments...`);
      console.log('📋 Appointment IDs:', appointmentIds.map(id => id.slice(0, 8)));
      
      const { data, error } = await supabase.rpc('check_appointments_feedback_status', {
        p_appointment_ids: appointmentIds
      });

      if (error) {
        console.error('❌ RPC error:', error);
        throw error;
      }

      if (!data?.success) {
        console.error('❌ Function returned error:', data?.error);
        return {};
      }

      const feedbackData = data.data || {};
      console.log(`✅ Feedback check complete:`, {
        totalChecked: appointmentIds.length,
        withFeedback: Object.keys(feedbackData).length,
        withoutFeedback: appointmentIds.length - Object.keys(feedbackData).length
      });

      // Log each appointment's status
      appointmentIds.forEach(id => {
        const hasFeedback = !!feedbackData[id];
        console.log(`  ${hasFeedback ? '✓' : '✗'} ${id.slice(0, 8)}: ${hasFeedback ? 'Has feedback' : 'No feedback'}`);
      });

      return feedbackData;
    } catch (err) {
      console.error('❌ Error checking feedback status:', err);
      return {};
    }
  }, []);

  // ✅ ENHANCED: Get completed appointments with feedback status
  const fetchCompletedAppointments = useCallback(async () => {
    if (!user || !isPatient) {
      console.log('⚠️ Cannot fetch: No user or not a patient');
      return { success: false, error: 'Invalid state' };
    }

    if (fetchedRef.current.appointments) {
      console.log('ℹ️ Appointments already fetched (using cache)');
      return { success: false, error: 'Already fetched' };
    }

    try {
      setUIState(prev => ({ ...prev, loading: true, error: null }));

      console.log('🔄 Fetching completed appointments...');

      const { data, error } = await supabase.rpc('get_appointments_by_role', {
        p_status: ['completed'],
        p_date_from: null,
        p_date_to: null,
        p_limit: 100,
        p_offset: 0,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to fetch appointments');

      const appointments = data.data.appointments || [];
      console.log(`📋 Fetched ${appointments.length} completed appointments`);
      
      // ✅ Check which appointments already have feedback
      const appointmentIds = appointments.map(apt => apt.id);
      const feedbackMap = await checkAppointmentsFeedbackStatus(appointmentIds);
      
      // ✅ Transform appointments with feedback status
      const transformedAppointments = appointments.map(apt => {
        const feedbackInfo = feedbackMap[apt.id];
        const hasFeedback = !!feedbackInfo;
        const canLeave = apt.status === 'completed' && !hasFeedback;
        
        return {
          id: apt.id,
          appointment_date: apt.appointment_date,
          appointment_time: apt.appointment_time,
          status: apt.status,
          clinic: {
            id: apt.clinic?.id,
            name: apt.clinic?.name || 'Unknown Clinic',
            address: apt.clinic?.address || '',
            phone: apt.clinic?.phone || '',
            rating: apt.clinic?.rating || 0,
            total_reviews: apt.clinic?.total_reviews || 0
          },
          doctor: apt.doctor?.id ? {
            id: apt.doctor.id,
            name: apt.doctor.name || 'General Practitioner',
            specialization: apt.doctor.specialization || 'General Dentistry',
            rating: apt.doctor.rating || 0,
            total_reviews: apt.doctor.total_reviews || 0
          } : null,
          services: apt.services || [],
          symptoms: apt.symptoms || '',
          notes: apt.notes || '',
          duration_minutes: apt.duration_minutes || 60,
          // ✅ Feedback tracking
          hasFeedback,
          feedbackId: feedbackInfo?.id || null,
          feedbackDetails: feedbackInfo || null,
          canLeaveFeedback: canLeave
        };
      });

      console.log('📊 Appointment transformation complete:', {
        total: transformedAppointments.length,
        withFeedback: transformedAppointments.filter(a => a.hasFeedback).length,
        canReview: transformedAppointments.filter(a => a.canLeaveFeedback).length
      });

      // ✅ Group by clinics with detailed counting
      const clinicMap = new Map();
      
      transformedAppointments.forEach(apt => {
        if (!clinicMap.has(apt.clinic.id)) {
          clinicMap.set(apt.clinic.id, {
            ...apt.clinic,
            appointments: [],
            doctors: new Map(),
            totalAppointments: 0,
            completedAppointments: 0,
            reviewedAppointments: 0,
            availableAppointments: 0,
            lastVisit: null
          });
        }
        
        const clinic = clinicMap.get(apt.clinic.id);
        clinic.appointments.push(apt);
        clinic.totalAppointments++;
        clinic.completedAppointments++;
        
        // ✅ Count reviewed vs available
        if (apt.hasFeedback) {
          clinic.reviewedAppointments++;
        }
        
        if (apt.canLeaveFeedback) {
          clinic.availableAppointments++;
        }
        
        const visitDate = new Date(apt.appointment_date);
        if (!clinic.lastVisit || visitDate > clinic.lastVisit) {
          clinic.lastVisit = visitDate;
        }
        
        // ✅ Group doctors
        if (apt.doctor) {
          if (!clinic.doctors.has(apt.doctor.id)) {
            clinic.doctors.set(apt.doctor.id, {
              ...apt.doctor,
              appointments: [],
              totalAppointments: 0,
              reviewedAppointments: 0,
              availableAppointments: 0
            });
          }
          
          const doctor = clinic.doctors.get(apt.doctor.id);
          doctor.appointments.push(apt);
          doctor.totalAppointments++;
          
          if (apt.hasFeedback) {
            doctor.reviewedAppointments++;
          }
          
          if (apt.canLeaveFeedback) {
            doctor.availableAppointments++;
          }
        }
      });

      // ✅ Convert to array and filter
      const availableClinics = Array.from(clinicMap.values())
        .map(clinic => ({
          ...clinic,
          doctors: Array.from(clinic.doctors.values())
            .filter(doc => doc.availableAppointments > 0) // Only doctors with reviewable appointments
        }))
        .filter(clinic => clinic.availableAppointments > 0); // Only clinics with reviewable appointments

      console.log('🏥 Clinics processing complete:');
      availableClinics.forEach(clinic => {
        console.log(`  - ${clinic.name}:`, {
          total: clinic.totalAppointments,
          reviewed: clinic.reviewedAppointments,
          available: clinic.availableAppointments,
          doctors: clinic.doctors.length
        });
      });

      setDataState(prev => ({
        ...prev,
        availableClinics,
        completedAppointments: transformedAppointments
      }));

      fetchedRef.current.appointments = true;
      setUIState(prev => ({ ...prev, loading: false }));

      return { success: true, data: { clinics: availableClinics, appointments: transformedAppointments } };

    } catch (err) {
      return handleError(err, 'fetch completed appointments');
    }
  }, [user, isPatient, handleError, checkAppointmentsFeedbackStatus]);

  // ✅ Get feedback history
  const fetchFeedbackHistory = useCallback(async (forceRefresh = false) => {
    if (!user || !isPatient || (!forceRefresh && fetchedRef.current.feedback)) {
      return { success: false, error: 'Invalid state or already fetched' };
    }

    try {
      console.log('🔄 Fetching feedback history...');

      const { data, error } = await supabase.rpc('get_patient_feedback_history', {
        p_patient_id: null,
        p_include_archived: false,
        p_limit: uiState.pagination.limit,
        p_offset: uiState.pagination.offset
      });

      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch feedback history');
      }

      const feedbackData = data.data.feedback_history || [];
      
      // ✅ Process feedback with dual ratings
      const processedFeedback = feedbackData.map(fb => ({
        id: fb.id,
        rating: fb.rating,
        clinic_rating: fb.clinic_rating,
        doctor_rating: fb.doctor_rating,
        comment: fb.comment,
        is_anonymous: fb.is_anonymous,
        is_public: fb.is_public,
        feedback_type: fb.feedback_type,
        created_at: fb.created_at,
        clinic_response: fb.response,
        responded_at: fb.responded_at,
        responder_name: fb.responder_name,
        clinic: {
          id: fb.clinic_id,
          name: fb.clinic_name,
          address: fb.clinic_address,
          current_rating: fb.current_clinic_rating,
          total_reviews: fb.clinic_total_reviews
        },
        doctor: fb.doctor_id ? {
          id: fb.doctor_id,
          name: fb.doctor_name,
          specialization: fb.doctor_specialization,
          current_rating: fb.current_doctor_rating,
          total_reviews: fb.doctor_total_reviews
        } : null,
        appointment: fb.appointment_id ? {
          id: fb.appointment_id,
          date: fb.appointment_date,
          time: fb.appointment_time,
          services: fb.services || []
        } : null
      }));

      setDataState(prev => ({
        ...prev,
        feedbackHistory: processedFeedback
      }));

      setUIState(prev => ({
        ...prev,
        pagination: {
          ...prev.pagination,
          totalCount: data.data.total_count || 0
        }
      }));

      fetchedRef.current.feedback = true;
      console.log('✅ Feedback history updated:', { count: processedFeedback.length });

      return { success: true, data: processedFeedback };

    } catch (err) {
      return handleError(err, 'fetch feedback history');
    }
  }, [user, isPatient, uiState.pagination.limit, uiState.pagination.offset, handleError]);

  // ✅ ENHANCED: Submit feedback with dual ratings
  const handleSubmitFeedback = useCallback(async () => {
    const { selectedAppointment, feedbackForm } = formState;
    
    // ✅ VALIDATION
    if (!selectedAppointment) {
      return handleError(new Error('Please select an appointment'), 'submit feedback');
    }

    // ✅ PREVENT DUPLICATE: Check if already has feedback
    if (selectedAppointment.hasFeedback) {
      return handleError(
        new Error('You have already submitted feedback for this appointment'), 
        'submit feedback'
      );
    }

    if (!feedbackForm.clinic_rating && !feedbackForm.doctor_rating) {
      return handleError(new Error('Please provide at least one rating'), 'submit feedback');
    }

    if (!feedbackForm.comment.trim()) {
      return handleError(new Error('Please provide a comment'), 'submit feedback');
    }

    if (feedbackForm.comment.trim().length < 10) {
      return handleError(new Error('Feedback must be at least 10 characters long'), 'submit feedback');
    }

    try {
      console.log('🔄 Submitting feedback with dual ratings...', feedbackForm);

      const result = await submitFeedback({
        appointment_id: selectedAppointment.id,
        clinic_rating: feedbackForm.clinic_rating || null,
        doctor_rating: feedbackForm.doctor_rating || null,
        comment: feedbackForm.comment,
        feedback_type: feedbackForm.feedback_type, 
        is_anonymous: feedbackForm.is_anonymous
      });
      
      if (!result.success) return result;

      console.log('✅ Feedback submitted successfully, staff will be notified');

      // ✅ Reset form and refresh data
      setFormState(prev => ({
        ...prev,
        selectedClinic: null,
        selectedDoctor: null,
        selectedAppointment: null,
        feedbackForm: {
          clinic_rating: 0,
          doctor_rating: 0,
          comment: '',
          feedback_type: 'general',
          is_anonymous: false,
        }
      }));
      
      // ✅ IMPORTANT: Refresh appointments to update feedback status
      fetchedRef.current.appointments = false;
      fetchedRef.current.feedback = false;
      await Promise.all([
        fetchCompletedAppointments(),
        fetchFeedbackHistory(true)
      ]);

      return {
        success: true,
        message: 'Feedback submitted successfully! Staff has been notified.',
        data: result.data
      };

    } catch (err) {
      return handleError(err, 'submit feedback');
    }
  }, [formState, submitFeedback, fetchFeedbackHistory, fetchCompletedAppointments, handleError]);

  // ✅ FORM MANAGEMENT
  const updateFeedbackForm = useCallback((updates) => {
    setFormState(prev => ({
      ...prev,
      feedbackForm: { ...prev.feedbackForm, ...updates }
    }));
  }, []);

  const selectClinic = useCallback((clinic) => {
    setFormState(prev => ({
      ...prev,
      selectedClinic: clinic,
      selectedDoctor: null,
      selectedAppointment: null
    }));
  }, []);

  const selectDoctor = useCallback((doctor) => {
    setFormState(prev => ({
      ...prev,
      selectedDoctor: doctor,
      selectedAppointment: null
    }));
  }, []);

  const selectAppointment = useCallback((appointment) => {
    setFormState(prev => ({
      ...prev,
      selectedAppointment: appointment,
      feedbackForm: {
        ...prev.feedbackForm,
        clinic_rating: 0,
        doctor_rating: 0,
        comment: ''
      }
    }));
  }, []);

  const resetForm = useCallback(() => {
    setFormState(prev => ({
      ...prev,
      selectedClinic: null,
      selectedDoctor: null,
      selectedAppointment: null,
      feedbackForm: {
        clinic_rating: 0,
        doctor_rating: 0,
        comment: '',
        feedback_type: 'general',
        is_anonymous: false,
      }
    }));
  }, []);

  // ✅ COMPUTED VALUES
  const computedData = useMemo(() => {
    const { feedbackHistory } = dataState;
    const { selectedClinic, selectedDoctor, selectedAppointment, feedbackForm } = formState;
    
    // ✅ Filter appointments that can still be reviewed
    const availableAppointmentsForDoctor = selectedDoctor?.appointments.filter(apt => apt.canLeaveFeedback) || [];
    
    return {
      totalFeedback: feedbackHistory.length,
      averageRating: feedbackHistory.length > 0 
        ? (feedbackHistory.reduce((sum, fb) => sum + (fb.rating || 0), 0) / feedbackHistory.length).toFixed(1)
        : '0.0',
      averageClinicRating: feedbackHistory.filter(f => f.clinic_rating).length > 0
        ? (feedbackHistory.reduce((sum, fb) => sum + (fb.clinic_rating || 0), 0) / 
           feedbackHistory.filter(f => f.clinic_rating).length).toFixed(1)
        : '0.0',
      averageDoctorRating: feedbackHistory.filter(f => f.doctor_rating).length > 0
        ? (feedbackHistory.reduce((sum, fb) => sum + (fb.doctor_rating || 0), 0) / 
           feedbackHistory.filter(f => f.doctor_rating).length).toFixed(1)
        : '0.0',
      canSubmitFeedback: !!(
        selectedAppointment && 
        !selectedAppointment.hasFeedback && // ✅ NEW: Check not already submitted
        (feedbackForm.clinic_rating > 0 || feedbackForm.doctor_rating > 0) && 
        feedbackForm.comment.trim() &&
        feedbackForm.comment.trim().length >= 10 // ✅ NEW: Minimum 10 characters
      ),
      formProgress: (() => {
        let progress = 0;
        if (selectedClinic) progress += 20;
        if (selectedAppointment) progress += 20;
        if (feedbackForm.clinic_rating > 0 || feedbackForm.doctor_rating > 0) progress += 30;
        if (feedbackForm.comment.trim() && feedbackForm.comment.trim().length >= 10) progress += 30;
        return progress;
      })(),
      doctorsForSelectedClinic: selectedClinic?.doctors.filter(doc => doc.availableAppointments > 0) || [],
      appointmentsForSelectedDoctor: availableAppointmentsForDoctor,
      ratingDistribution: {
        5: feedbackHistory.filter(f => f.rating === 5).length,
        4: feedbackHistory.filter(f => f.rating === 4).length,
        3: feedbackHistory.filter(f => f.rating === 3).length,
        2: feedbackHistory.filter(f => f.rating === 2).length,
        1: feedbackHistory.filter(f => f.rating === 1).length,
      }
    };
  }, [dataState, formState]);

  // ✅ AUTO-FETCH ON MOUNT
  useEffect(() => {
    if (user && isPatient && !fetchedRef.current.appointments) {
      fetchCompletedAppointments();
    }
  }, [user, isPatient, fetchCompletedAppointments]);

  useEffect(() => {
    if (user && isPatient && !fetchedRef.current.feedback) {
      fetchFeedbackHistory();
    }
  }, [user, isPatient, fetchFeedbackHistory]);

  return {
    // State
    ...dataState,
    ...formState,
    ...uiState,
    ...computedData,
    
    // Computed loading/error
    loading: uiState.loading || feedbackLoading,
    error: uiState.error || feedbackError,

    // Actions
    fetchCompletedAppointments,
    fetchFeedbackHistory,
    handleSubmitFeedback,
    
    // Form management
    updateFeedbackForm,
    selectClinic,
    selectDoctor,
    selectAppointment,
    resetForm,

    // Utilities
    refresh: useCallback(() => {
      console.log('♻️ Force refreshing feedback data...');
      fetchedRef.current = { appointments: false, feedback: false };
      return Promise.all([
        fetchCompletedAppointments(),
        fetchFeedbackHistory(true)
      ]);
    }, [fetchCompletedAppointments, fetchFeedbackHistory]),

    clearError: () => setUIState(prev => ({ ...prev, error: null }))
  };
};