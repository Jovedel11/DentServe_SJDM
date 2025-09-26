import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { useFeedback } from './useFeedback';
import { useArchiveManager } from './useArchiveManager';

export const usePatientFeedback = () => {
  const { user, profile, isPatient } = useAuth();
  const { submitFeedback, loading: feedbackLoading, error: feedbackError } = useFeedback();
  const {
    archiveItem,
    unarchiveItem,
    hideItem,
    listArchived,
    loading: archiveLoading,
    error: archiveError
  } = useArchiveManager();

  // ✅ SEPARATED STATE - Better performance
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
      comment: '', // ✅ FIXED: Use 'comment' to match database
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

  // ✅ PERFORMANCE - Prevent unnecessary API calls
  const fetchedRef = useRef({
    appointments: false,
    feedback: false
  });

  // ✅ OPTIMIZED - Memoized error handler
  const handleError = useCallback((error, context) => {
    const errorMessage = error?.message || `Failed to ${context}`;
    console.error(`❌ ${context} error:`, error);
    setUIState(prev => ({ ...prev, error: errorMessage }));
    return { success: false, error: errorMessage };
  }, []);

  // ✅ ENHANCED - Better data fetching with caching
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
      
      // ✅ FIXED: Transform data to match component expectations
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

      // ✅ ENHANCED - Clinic grouping with better logic
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
        
        // Group doctors
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

  // ✅ OPTIMIZED - Better feedback history with archive integration
  const fetchFeedbackHistory = useCallback(async (forceRefresh = false) => {
    if (!user || !isPatient || (!forceRefresh && fetchedRef.current.feedback)) {
      return { success: false, error: 'Invalid state or already fetched' };
    }

    try {
      console.log('🔄 Fetching feedback history...');

      // ✅ PARALLEL - Fetch both active and archived data simultaneously
      const [feedbackResponse, archivedResponse] = await Promise.all([
        supabase.rpc('get_patient_feedback_history', {
          p_patient_id: null,
          p_include_archived: false,
          p_limit: uiState.pagination.limit,
          p_offset: uiState.pagination.offset
        }),
        listArchived('feedback')
      ]);

      if (feedbackResponse.error) throw feedbackResponse.error;
      if (!feedbackResponse.data?.success) {
        throw new Error(feedbackResponse.data?.error || 'Failed to fetch feedback history');
      }

      const feedbackData = feedbackResponse.data.data.feedback_history || [];
      const archivedItems = archivedResponse?.success ? (archivedResponse.data || []) : [];
      
      // ✅ ENHANCED - Better archive status mapping
      const archivedItemIds = new Set(archivedItems.map(item => item.item_id));
      
      // ✅ FIXED: Transform data to match component structure
      const processedFeedback = feedbackData.map(fb => ({
        id: fb.id,
        rating: fb.rating,
        comment: fb.comment, // ✅ FIXED: Use comment field
        message: fb.comment, // ✅ COMPATIBILITY: Add message alias for component
        feedback_text: fb.comment, // ✅ COMPATIBILITY: Add feedback_text alias
        is_anonymous: fb.is_anonymous,
        is_public: fb.is_public,
        feedback_type: fb.feedback_type,
        created_at: fb.created_at,
        clinic_response: fb.response,
        responded_at: fb.responded_at,
        recommend_to_others: fb.recommend_to_others,
        isArchived: archivedItemIds.has(fb.id),
        // ✅ FIXED: Structure nested objects properly
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

      const activeFeedback = processedFeedback.filter(fb => !fb.isArchived);
      const archivedFeedback = processedFeedback.filter(fb => fb.isArchived);

      setDataState(prev => ({
        ...prev,
        feedbackHistory: activeFeedback,
        archivedFeedback: archivedFeedback
      }));

      setUIState(prev => ({
        ...prev,
        pagination: {
          ...prev.pagination,
          totalCount: feedbackResponse.data.data.total_count || 0
        }
      }));

      fetchedRef.current.feedback = true;
      console.log('✅ Feedback history updated:', { active: activeFeedback.length, archived: archivedFeedback.length });

      return { success: true, data: processedFeedback };

    } catch (err) {
      return handleError(err, 'fetch feedback history');
    }
  }, [user, isPatient, uiState.pagination.limit, uiState.pagination.offset, listArchived, handleError]);

  // ✅ ENHANCED - Better feedback submission with comprehensive error handling
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
        comment: feedbackForm.comment, // ✅ FIXED: Use comment field
        feedback_type: feedbackForm.feedback_type, 
        is_anonymous: feedbackForm.is_anonymous
      });
      
      if (!result.success) return result;

      console.log('✅ Feedback submitted successfully, staff will be notified');

      // ✅ ENHANCED - Reset form and refresh data
      setFormState(prev => ({
        ...prev,
        selectedClinic: null,
        selectedDoctor: null,
        selectedAppointment: null,
        feedbackForm: {
          rating: 0,
          comment: '', // ✅ FIXED: Use comment field
          feedback_type: 'general',
          is_anonymous: false,
        }
      }));
      
      // ✅ PERFORMANCE - Mark for refresh instead of immediate fetch
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

  // ✅ OPTIMIZED - Archive actions with immediate UI updates
  const archiveFeedback = useCallback(async (feedbackId) => {
    try {
      console.log('🔄 Archiving feedback:', feedbackId);

      // ✅ OPTIMISTIC UPDATE - Update UI immediately
      const feedback = dataState.feedbackHistory.find(fb => fb.id === feedbackId);
      if (!feedback) return handleError(new Error('Feedback not found'), 'archive feedback');

      setDataState(prev => ({
        ...prev,
        feedbackHistory: prev.feedbackHistory.filter(fb => fb.id !== feedbackId),
        archivedFeedback: [...prev.archivedFeedback, { ...feedback, isArchived: true }]
      }));

      const result = await archiveItem('feedback', feedbackId);
      
      if (!result.success) {
        // ✅ ROLLBACK - Revert optimistic update on failure
        setDataState(prev => ({
          ...prev,
          feedbackHistory: [...prev.feedbackHistory, feedback],
          archivedFeedback: prev.archivedFeedback.filter(fb => fb.id !== feedbackId)
        }));
        return result;
      }

      console.log('✅ Archive successful');
      return { success: true, message: 'Feedback archived successfully' };

    } catch (err) {
      return handleError(err, 'archive feedback');
    }
  }, [dataState.feedbackHistory, dataState.archivedFeedback, archiveItem, handleError]);

  const unarchiveFeedback = useCallback(async (feedbackId) => {
    try {
      console.log('🔄 Unarchiving feedback:', feedbackId);

      // ✅ OPTIMISTIC UPDATE
      const feedback = dataState.archivedFeedback.find(fb => fb.id === feedbackId);
      if (!feedback) return handleError(new Error('Archived feedback not found'), 'unarchive feedback');

      setDataState(prev => ({
        ...prev,
        archivedFeedback: prev.archivedFeedback.filter(fb => fb.id !== feedbackId),
        feedbackHistory: [...prev.feedbackHistory, { ...feedback, isArchived: false }]
      }));

      const result = await unarchiveItem('feedback', feedbackId);
      
      if (!result.success) {
        // ✅ ROLLBACK
        setDataState(prev => ({
          ...prev,
          archivedFeedback: [...prev.archivedFeedback, feedback],
          feedbackHistory: prev.feedbackHistory.filter(fb => fb.id !== feedbackId)
        }));
        return result;
      }

      console.log('✅ Unarchive successful');
      return { success: true, message: 'Feedback restored successfully' };

    } catch (err) {
      return handleError(err, 'unarchive feedback');
    }
  }, [dataState.archivedFeedback, dataState.feedbackHistory, unarchiveItem, handleError]);

  const deleteArchivedFeedback = useCallback(async (feedbackId) => {
    try {
      console.log('🔄 Permanently deleting feedback:', feedbackId);

      // ✅ OPTIMISTIC UPDATE
      const feedback = dataState.archivedFeedback.find(fb => fb.id === feedbackId);
      if (!feedback) return handleError(new Error('Archived feedback not found'), 'delete feedback');

      setDataState(prev => ({
        ...prev,
        archivedFeedback: prev.archivedFeedback.filter(fb => fb.id !== feedbackId)
      }));

      const result = await hideItem('feedback', feedbackId);
      
      if (!result.success) {
        // ✅ ROLLBACK
        setDataState(prev => ({
          ...prev,
          archivedFeedback: [...prev.archivedFeedback, feedback]
        }));
        return result;
      }

      console.log('✅ Delete successful');
      return { success: true, message: 'Feedback permanently deleted' };

    } catch (err) {
      return handleError(err, 'delete feedback');
    }
  }, [dataState.archivedFeedback, hideItem, handleError]);

  // ✅ PERFORMANCE - Enhanced download function
  const downloadFeedbackDetails = useCallback((feedback) => {
    try {
      const feedbackData = `
FEEDBACK DETAILS
===============
Generated: ${new Date().toLocaleDateString()}
Patient: ${profile?.first_name} ${profile?.last_name}

FEEDBACK INFORMATION
===================
ID: ${feedback.id}
Submitted: ${new Date(feedback.created_at).toLocaleDateString()}
Rating: ${feedback.rating}/5 stars
Anonymous: ${feedback.is_anonymous ? 'Yes' : 'No'}

APPOINTMENT DETAILS
==================
Date: ${feedback.appointment ? new Date(feedback.appointment.date).toLocaleDateString() : 'N/A'}
Time: ${feedback.appointment?.time || 'N/A'}
Services: ${feedback.appointment?.services?.join(', ') || 'General Appointment'}

PROVIDER DETAILS
===============
Clinic: ${feedback.clinic.name}
Address: ${feedback.clinic.address || 'Not specified'}
Doctor: ${feedback.doctor?.name || 'Not specified'}
${feedback.doctor?.specialization ? `Specialization: ${feedback.doctor.specialization}` : ''}

FEEDBACK CONTENT
===============
${feedback.comment}

${feedback.feedback_type ? `Type: ${feedback.feedback_type}` : ''}

CLINIC RESPONSE
==============
${feedback.clinic_response || 'No response yet'}
${feedback.responded_at ? `Response Date: ${new Date(feedback.responded_at).toLocaleDateString()}` : ''}

---
This is a system-generated report from DentServe SJDM.
Generated on ${new Date().toLocaleString()}
      `;

      const blob = new Blob([feedbackData], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `feedback-${feedback.id}-${feedback.appointment?.date || 'general'}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return { success: true, message: 'Feedback details downloaded' };
    } catch (err) {
      return handleError(err, 'download feedback');
    }
  }, [profile, handleError]);

  // ✅ OPTIMIZED - State management functions
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

  const toggleArchiveView = useCallback(() => {
    setUIState(prev => ({ ...prev, showArchived: !prev.showArchived }));
  }, []);

  const resetForm = useCallback(() => {
    setFormState(prev => ({
      ...prev,
      selectedClinic: null,
      selectedDoctor: null,
      selectedAppointment: null,
      feedbackForm: {
        rating: 0,
        comment: '', // ✅ FIXED: Use comment field
        feedback_type: 'general',
        is_anonymous: false,
      }
    }));
  }, []);

  // ✅ ENHANCED - Computed values with better performance
  const computedData = useMemo(() => {
    const { feedbackHistory, archivedFeedback } = dataState;
    const { showArchived } = uiState;
    const { selectedClinic, selectedDoctor, selectedAppointment, feedbackForm } = formState;
    
    return {
      totalFeedback: feedbackHistory.length + archivedFeedback.length,
      activeFeedback: feedbackHistory.length,
      archivedCount: archivedFeedback.length,
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
      currentList: showArchived ? archivedFeedback : feedbackHistory,
      ratingDistribution: {
        5: feedbackHistory.filter(f => f.rating === 5).length,
        4: feedbackHistory.filter(f => f.rating === 4).length,
        3: feedbackHistory.filter(f => f.rating === 3).length,
        2: feedbackHistory.filter(f => f.rating === 2).length,
        1: feedbackHistory.filter(f => f.rating === 1).length,
      }
    };
  }, [dataState, uiState, formState]);

  // ✅ OPTIMIZED - Auto-fetch on mount only
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
    // ✅ SEPARATED STATE
    ...dataState,
    ...formState,
    ...uiState,
    ...computedData,
    
    // ✅ COMPUTED LOADING/ERROR
    loading: uiState.loading || feedbackLoading || archiveLoading,
    error: uiState.error || feedbackError || archiveError,

    // ✅ OPTIMIZED ACTIONS
    fetchCompletedAppointments,
    fetchFeedbackHistory,
    handleSubmitFeedback,
    archiveFeedback,
    unarchiveFeedback,
    deleteArchivedFeedback,
    downloadFeedbackDetails,
    
    // ✅ FORM MANAGEMENT
    updateFeedbackForm,
    selectClinic,
    selectDoctor,
    selectAppointment,
    toggleArchiveView,
    resetForm,

    // ✅ UTILITIES
    refresh: () => {
      fetchedRef.current = { appointments: false, feedback: false };
      fetchCompletedAppointments();
      fetchFeedbackHistory(true);
    },
    clearError: () => setUIState(prev => ({ ...prev, error: null }))
  };
};