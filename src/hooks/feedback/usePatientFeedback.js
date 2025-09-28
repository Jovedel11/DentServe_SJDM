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
    archivedFeedback: []
  });

  const [formState, setFormState] = useState({
    selectedClinic: null,
    selectedDoctor: null,
    selectedAppointment: null,
    feedbackForm: {
      rating: 0,
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

  // ✅ OPTIMIZED - Get completed appointments
  const fetchCompletedAppointments = useCallback(async () => {
    if (!user || !isPatient || fetchedRef.current.appointments) {
      return { success: false, error: 'Invalid state or already fetched' };
    }

    try {
      setUIState(prev => ({ ...prev, loading: true, error: null }));

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
      
      // ✅ Transform and group data
      const transformedAppointments = appointments.map(apt => ({
        id: apt.id,
        appointment_date: apt.appointment_date,
        appointment_time: apt.appointment_time,
        status: apt.status,
        clinic: {
          id: apt.clinic?.id,
          name: apt.clinic?.name || 'Unknown Clinic',
          address: apt.clinic?.address || '',
          phone: apt.clinic?.phone || ''
        },
        doctor: {
          id: apt.doctor?.id,
          name: apt.doctor?.name || 'General Practitioner',
          specialization: apt.doctor?.specialization || 'General Dentistry'
        },
        services: apt.services || [],
        symptoms: apt.symptoms || '',
        notes: apt.notes || '',
        duration_minutes: apt.duration_minutes || 60,
        canLeaveFeedback: apt.status === 'completed'
      }));

      // ✅ Group by clinics
      const clinicMap = new Map();
      
      transformedAppointments.forEach(apt => {
        if (!clinicMap.has(apt.clinic.id)) {
          clinicMap.set(apt.clinic.id, {
            ...apt.clinic,
            appointments: [],
            doctors: new Map(),
            totalAppointments: 0,
            lastVisit: null
          });
        }
        
        const clinic = clinicMap.get(apt.clinic.id);
        clinic.appointments.push(apt);
        clinic.totalAppointments++;
        
        const visitDate = new Date(apt.appointment_date);
        if (!clinic.lastVisit || visitDate > clinic.lastVisit) {
          clinic.lastVisit = visitDate;
        }
        
        if (apt.doctor.id && !clinic.doctors.has(apt.doctor.id)) {
          clinic.doctors.set(apt.doctor.id, {
            ...apt.doctor,
            appointments: []
          });
        }
        if (apt.doctor.id) {
          clinic.doctors.get(apt.doctor.id).appointments.push(apt);
        }
      });

      const availableClinics = Array.from(clinicMap.values()).map(clinic => ({
        ...clinic,
        doctors: Array.from(clinic.doctors.values())
      }));

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
  }, [user, isPatient, handleError]);

  // ✅ OPTIMIZED - Get feedback history without archive complexity
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
      
      // ✅ SIMPLIFIED - Process feedback without archive complexity
      const processedFeedback = feedbackData.map(fb => ({
        id: fb.id,
        rating: fb.rating,
        comment: fb.comment,
        is_anonymous: fb.is_anonymous,
        is_public: fb.is_public,
        feedback_type: fb.feedback_type,
        created_at: fb.created_at,
        clinic_response: fb.response,
        responded_at: fb.responded_at,
        clinic: {
          id: fb.clinic_id,
          name: fb.clinic_name,
          address: fb.clinic_address
        },
        doctor: fb.doctor_id ? {
          id: fb.doctor_id,
          name: fb.doctor_name,
          specialization: fb.doctor_specialization
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

  // ✅ ENHANCED - Better feedback submission
  const handleSubmitFeedback = useCallback(async () => {
    const { selectedAppointment, feedbackForm } = formState;
    
    if (!selectedAppointment || !feedbackForm.rating || !feedbackForm.comment.trim()) {
      return handleError(new Error('Please complete all required fields'), 'submit feedback');
    }

    try {
      console.log('🔄 Submitting feedback with staff notification...');

      const result = await submitFeedback({
        clinic_id: selectedAppointment.clinic.id,
        appointment_id: selectedAppointment.id,
        rating: feedbackForm.rating,
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
          rating: 0,
          comment: '',
          feedback_type: 'general',
          is_anonymous: false,
        }
      }));
      
      fetchedRef.current.feedback = false;
      await fetchFeedbackHistory(true);

      return {
        success: true,
        message: 'Feedback submitted successfully! Staff has been notified.',
        data: result.data
      };

    } catch (err) {
      return handleError(err, 'submit feedback');
    }
  }, [formState, submitFeedback, fetchFeedbackHistory, handleError]);

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
      selectedAppointment: appointment
    }));
  }, []);

  const resetForm = useCallback(() => {
    setFormState(prev => ({
      ...prev,
      selectedClinic: null,
      selectedDoctor: null,
      selectedAppointment: null,
      feedbackForm: {
        rating: 0,
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
    
    return {
      totalFeedback: feedbackHistory.length,
      averageRating: feedbackHistory.length > 0 
        ? (feedbackHistory.reduce((sum, fb) => sum + fb.rating, 0) / feedbackHistory.length).toFixed(1)
        : '0.0',
      canSubmitFeedback: !!(selectedAppointment && feedbackForm.rating > 0 && feedbackForm.comment.trim()),
      formProgress: (() => {
        let progress = 0;
        if (selectedClinic) progress += 25;
        if (selectedAppointment) progress += 25;
        if (feedbackForm.rating > 0) progress += 25;
        if (feedbackForm.comment.trim()) progress += 25;
        return progress;
      })(),
      doctorsForSelectedClinic: selectedClinic?.doctors || [],
      appointmentsForSelectedDoctor: selectedDoctor?.appointments || [],
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
    refresh: () => {
      fetchedRef.current = { appointments: false, feedback: false };
      fetchCompletedAppointments();
      fetchFeedbackHistory(true);
    },
    clearError: () => setUIState(prev => ({ ...prev, error: null }))
  };
};