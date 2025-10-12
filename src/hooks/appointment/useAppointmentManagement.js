import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '../../auth/context/AuthProvider';
import { supabase } from '../../lib/supabaseClient';
import { useAppointmentCancellation } from './useAppointmentCancellation';
import {
  notifyPatientAppointmentConfirmed,
  notifyPatientAppointmentRejected,
  notifyPatientAppointmentCompleted,
  notifyPatientNoShow,
} from '@/services/emailService';

export const useAppointmentManagement = (options = {}) => {
  const { user, profile, isPatient, isStaff, isAdmin } = useAuth();
  const cancellation = useAppointmentCancellation();
  
  const {
    includeHistory = true,
    includeStats = true,
    autoRefresh = true,
    defaultFilters = {}
  } = options;

  const [state, setState] = useState({
    loading: false,
    error: null,
    appointments: [],
    healthAnalytics: null,
    stats: {},
    filters: {
      status: defaultFilters.status || null,
      dateFrom: defaultFilters.dateFrom || null,
      dateTo: defaultFilters.dateTo || null,
      searchQuery: defaultFilters.searchQuery || '',
      ...defaultFilters
    },
    pagination: {
      limit: 50,
      offset: 0,
      hasMore: false,
      totalCount: 0
    }
  });

  // UNIFIED FETCH - Works for all user types
  const fetchAppointments = useCallback(async (customFilters = {}, loadMore = false) => {
    try {
      setState(prev => ({ 
        ...prev, 
        loading: !loadMore, 
        error: null 
      }));

      const filters = { ...state.filters, ...customFilters };
      const offset = loadMore ? state.pagination.offset : 0;

      const { data, error } = await supabase.rpc('get_appointments_by_role', {
        p_status: filters.status ? [filters.status] : null,
        p_date_from: filters.dateFrom,
        p_date_to: filters.dateTo,
        p_limit: state.pagination.limit,
        p_offset: offset
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to fetch appointments');

      const appointments = data.data?.appointments || [];
      const pagination = data.data?.pagination || {};
      console.log('Fetched appointments:', appointments);

      // Get health analytics for patients
      let healthAnalytics = null;
      if (isPatient && includeStats) {
        try {
          const { data: analyticsData } = await supabase.rpc('get_patient_health_analytics');
          healthAnalytics = analyticsData;
        } catch (err) {
          console.warn('Health analytics failed:', err);
        }
      }

      setState(prev => ({
        ...prev,
        loading: false,
        appointments: loadMore ? [...prev.appointments, ...appointments] : appointments,
        healthAnalytics: healthAnalytics || prev.healthAnalytics,
        stats: {
          total: pagination.total_count || 0,
          pending: pagination.pending_count || 0,
          confirmed: appointments.filter(a => a.status === 'confirmed').length,
          completed: appointments.filter(a => a.status === 'completed').length,
          cancelled: appointments.filter(a => a.status === 'cancelled').length
        },
        pagination: {
          ...prev.pagination,
          offset: offset + appointments.length,
          hasMore: pagination.has_more || false,
          totalCount: pagination.total_count || 0
        }
      }));

      return { success: true, appointments, totalCount: pagination.total_count };

    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err.message }));
      return { success: false, error: err.message };
    }
  }, [state.filters, state.pagination.limit, state.pagination.offset, isPatient, includeStats]);

  // ✅ STAFF - Approve appointment
  const approveAppointment = useCallback(async (appointmentId, staffNotes = '') => {
    if (!isStaff && !isAdmin) return { success: false, error: 'Access denied' };
  
    try {
      setState(prev => ({ ...prev, loading: true }));
  
      const { data, error } = await supabase.rpc('approve_appointment', {
        p_appointment_id: appointmentId,
        p_staff_notes: staffNotes
      });
  
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Approval failed');
  
      // Get appointment details for email
      const appointment = state.appointments.find(apt => apt.id === appointmentId);
      
      // Send confirmation email to patient
      if (appointment) {
        const emailResult = await notifyPatientAppointmentConfirmed({
          patient: {
            email: appointment.patient?.email,
            first_name: appointment.patient?.first_name || appointment.patient?.name?.split(' ')[0]
          },
          appointment: {
            date: appointment.appointment_date,
            time: appointment.appointment_time,
            duration_minutes: appointment.duration_minutes,
            notes: staffNotes || appointment.notes
          },
          clinic: {
            name: appointment.clinic?.name,
            address: appointment.clinic?.address,
            phone: appointment.clinic?.phone,
            email: appointment.clinic?.email,
            cancellation_policy_hours: appointment.clinic?.cancellation_policy_hours
          },
          doctor: {
            name: appointment.doctor?.name
          },
          services: appointment.services || []
        });
  
        if (!emailResult.success) {
          console.warn('⚠️ Failed to send confirmation email:', emailResult.error);
        }
      }
      console.log('Appointment approved:', appointment);
  
      setState(prev => ({
        ...prev,
        loading: false,
        appointments: prev.appointments.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, status: 'confirmed', notes: staffNotes || apt.notes }
            : apt
        )
      }));
  
      return { success: true, data: data.data, message: data.message };
  
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err.message }));
      return { success: false, error: err.message };
    }
  }, [isStaff, isAdmin, state.appointments]);

  // ✅ STAFF - Reject appointment  
  const rejectAppointment = useCallback(async (appointmentId, rejectionData) => {
    if (!isStaff && !isAdmin) return { success: false, error: 'Access denied' };
  
    try {
      setState(prev => ({ ...prev, loading: true }));
  
      const params = {
        p_appointment_id: appointmentId,
        p_rejection_reason: typeof rejectionData === 'string' ? rejectionData : rejectionData.reason,
        p_rejection_category: rejectionData.category || 'staff_decision',
        p_suggest_reschedule: rejectionData.suggestReschedule || false,
        p_alternative_dates: rejectionData.alternativeDates || null
      };
  
      const { data, error } = await supabase.rpc('reject_appointment', params);
  
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Rejection failed');
  
      // Get appointment details for email
      const appointment = state.appointments.find(apt => apt.id === appointmentId);
  
      // ✅ NEW: Send rejection email to patient
      if (appointment) {
        const emailResult = await notifyPatientAppointmentRejected({
          patient: {
            email: appointment.patient?.email,
            first_name: appointment.patient?.first_name || appointment.patient?.name?.split(' ')[0]
          },
          appointment: {
            date: appointment.appointment_date,
            time: appointment.appointment_time
          },
          clinic: {
            name: appointment.clinic?.name,
            phone: appointment.clinic?.phone,
            email: appointment.clinic?.email
          },
          doctor: {
            name: appointment.doctor?.name
          },
          rejection: {
            reason: params.p_rejection_reason,
            category: params.p_rejection_category
          }
        });
  
        if (!emailResult.success) {
          console.warn('⚠️ Failed to send rejection email:', emailResult.error);
        }
      }
  
      setState(prev => ({
        ...prev,
        loading: false,
        appointments: prev.appointments.filter(apt => apt.id !== appointmentId)
      }));
  
      return { success: true, data: data.data, message: data.message };
  
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err.message }));
      return { success: false, error: err.message };
    }
  }, [isStaff, isAdmin, state.appointments]);

  // Complete appointment
  const completeAppointment = useCallback(async (appointmentId, completionData = {}) => {
    if (!isStaff && !isAdmin) return { success: false, error: 'Access denied' };
  
    try {
      setState(prev => ({ ...prev, loading: true }));
  
      const { data, error } = await supabase.rpc('complete_appointment', {
        p_appointment_id: appointmentId,
        p_completion_notes: completionData.notes || '',
        p_services_completed: completionData.servicesCompleted || [],
        p_follow_up_required: completionData.followUpRequired || false,
        p_follow_up_notes: completionData.followUpNotes || '',
        p_requires_treatment_plan: completionData.requiresTreatmentPlan || false,
        p_treatment_plan_notes: completionData.treatmentPlanNotes || null,
        p_diagnosis_summary: completionData.diagnosisSummary || null,
        p_recommended_treatment_name: completionData.recommendedTreatmentName || null,
        p_recommended_visits: completionData.recommendedVisits || null
      });
  
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Completion failed');
  
      // Get appointment details for email
      const appointment = state.appointments.find(apt => apt.id === appointmentId);
  
      // ✅ NEW: Send completion email to patient
      if (appointment) {
        const feedbackUrl = `${window.location.origin}/patient/feedback?appointment=${appointmentId}`;
        
        const emailResult = await notifyPatientAppointmentCompleted({
          patient: {
            email: appointment.patient?.email,
            first_name: appointment.patient?.first_name || appointment.patient?.name?.split(' ')[0]
          },
          appointment: {
            date: appointment.appointment_date,
            time: appointment.appointment_time,
            notes: completionData.notes,
            follow_up_required: completionData.followUpRequired
          },
          clinic: {
            name: appointment.clinic?.name,
            phone: appointment.clinic?.phone,
            email: appointment.clinic?.email
          },
          doctor: {
            name: appointment.doctor?.name
          },
          services: appointment.services || [],
          feedbackUrl
        });
  
        if (!emailResult.success) {
          console.warn('⚠️ Failed to send completion email:', emailResult.error);
        }
      }
  
      setState(prev => ({
        ...prev,
        loading: false,
        appointments: prev.appointments.filter(apt => apt.id !== appointmentId)
      }));
  
      return { 
        success: true, 
        data: data.data, 
        message: data.message 
      };
  
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err.message }));
      return { success: false, error: err.message };
    }
  }, [isStaff, isAdmin, state.appointments]);

  // Mark no-show
  const markNoShow = useCallback(async (appointmentId, staffNotes = '') => {
    if (!isStaff && !isAdmin) return { success: false, error: 'Access denied' };
  
    try {
      setState(prev => ({ ...prev, loading: true }));
  
      const { data, error } = await supabase.rpc('mark_appointment_no_show', {
        p_appointment_id: appointmentId,
        p_staff_notes: staffNotes
      });
  
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to mark no-show');
  
      // Get appointment details for email
      const appointment = state.appointments.find(apt => apt.id === appointmentId);
  
      // ✅ NEW: Send no-show notice to patient
      if (appointment) {
        const emailResult = await notifyPatientNoShow({
          patient: {
            email: appointment.patient?.email,
            first_name: appointment.patient?.first_name || appointment.patient?.name?.split(' ')[0]
          },
          appointment: {
            date: appointment.appointment_date,
            time: appointment.appointment_time
          },
          clinic: {
            name: appointment.clinic?.name,
            phone: appointment.clinic?.phone,
            email: appointment.clinic?.email
          },
          doctor: {
            name: appointment.doctor?.name
          }
        });
  
        if (!emailResult.success) {
          console.warn('⚠️ Failed to send no-show email:', emailResult.error);
        }
      }
  
      setState(prev => ({
        ...prev,
        loading: false,
        appointments: prev.appointments.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, status: 'no_show', notes: staffNotes || apt.notes }
            : apt
        )
      }));
  
      return { success: true, data: data.data, message: data.message };
  
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err.message }));
      return { success: false, error: err.message };
    }
  }, [isStaff, isAdmin, state.appointments]);

  // ✅ NEW: STAFF - Send Reschedule Reminder
  const sendRescheduleReminder = useCallback(async (appointmentId, reason, suggestedDates = []) => {
    if (!isStaff && !isAdmin) return { success: false, error: 'Access denied' };

    try {
      setState(prev => ({ ...prev, loading: true }));

      const { data, error } = await supabase.rpc('send_reschedule_reminder', {
        p_appointment_id: appointmentId,
        p_reason: reason,
        p_suggested_dates: suggestedDates.length > 0 ? suggestedDates : null
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to send reminder');

      setState(prev => ({ ...prev, loading: false }));

      return { success: true, data: data.data, message: data.message };

    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err.message }));
      return { success: false, error: err.message };
    }
  }, [isStaff, isAdmin]);

  // ✅ NEW: STAFF - Bulk Approve Appointments
  const bulkApproveAppointments = useCallback(async (appointmentIds, staffNotes = '') => {
    if (!isStaff && !isAdmin) return { success: false, error: 'Access denied' };

    try {
      setState(prev => ({ ...prev, loading: true }));

      const results = await Promise.allSettled(
        appointmentIds.map(id => 
          supabase.rpc('approve_appointment', {
            p_appointment_id: id,
            p_staff_notes: staffNotes
          })
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled' && r.value.data?.success);
      const failed = results.filter(r => r.status === 'rejected' || !r.value.data?.success);

      setState(prev => ({
        ...prev,
        loading: false,
        appointments: prev.appointments.map(apt => {
          const wasApproved = successful.some(s => {
            const appointmentId = s.value?.data?.data?.appointment_id;
            return appointmentId === apt.id;
          });
          return wasApproved 
            ? { ...apt, status: 'confirmed', notes: staffNotes || apt.notes }
            : apt;
        })
      }));

      return {
        success: successful.length > 0,
        approved: successful.length,
        failed: failed.length,
        total: appointmentIds.length,
        message: `${successful.length}/${appointmentIds.length} appointments approved`
      };

    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err.message }));
      return { success: false, error: err.message };
    }
  }, [isStaff, isAdmin]);
  
  // ✅ FILTER MANAGEMENT
  const updateFilters = useCallback((newFilters) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters },
      pagination: { ...prev.pagination, offset: 0 }
    }));
  }, []);

  const loadMore = useCallback(() => {
    if (!state.pagination.hasMore || state.loading) return;
    return fetchAppointments({}, true);
  }, [fetchAppointments, state.pagination.hasMore, state.loading]);

  // ✅ COMPUTED VALUES
  const computedData = useMemo(() => {
    const filteredAppointments = state.appointments.filter(apt => {
      if (state.filters.searchQuery) {
        const search = state.filters.searchQuery.toLowerCase();
        const searchableText = [
          apt.patient?.name || '',
          apt.doctor?.name || '',
          apt.clinic?.name || '',
          apt.symptoms || '',
          apt.notes || ''
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(search)) return false;
      }
      return true;
    });

    // ✅ NEW: Today's appointments helper
    const todayDate = new Date().toISOString().split('T')[0];
    const todayAppointments = filteredAppointments.filter(apt => 
      apt.appointment_date === todayDate
    );

    return {
      filteredAppointments,
      isEmpty: filteredAppointments.length === 0,
      hasAppointments: state.appointments.length > 0,
      
      ...(isPatient && {
        upcomingAppointments: filteredAppointments.filter(apt => 
          new Date(apt.appointment_date) > new Date() && apt.status === 'confirmed'
        ),
        completedAppointments: filteredAppointments.filter(apt => apt.status === 'completed')
      }),

      ...(isStaff && {
        pendingAppointments: filteredAppointments.filter(apt => apt.status === 'pending'),
        confirmedAppointments: filteredAppointments.filter(apt => apt.status === 'confirmed'),
        todayAppointments,
        todayCount: todayAppointments.length,
        pendingCount: filteredAppointments.filter(apt => apt.status === 'pending').length
      })
    };
  }, [state.appointments, state.filters, isPatient, isStaff]);

  // ✅ AUTO-FETCH ON MOUNT
  useEffect(() => {
    if (user && (isPatient || isStaff || isAdmin)) {
      fetchAppointments();
    }
  }, [user, isPatient, isStaff, isAdmin]);

  return {
    // State
    ...state,
    ...computedData,

    // Actions
    fetchAppointments,
    loadMore,
    updateFilters,

    // Staff actions
    approveAppointment,
    rejectAppointment, 
    completeAppointment,
    markNoShow,
    sendRescheduleReminder, // ✅ NEW
    bulkApproveAppointments, // ✅ NEW

    // Cancellation
    ...cancellation,

    // Utilities
    refreshData: () => fetchAppointments({}, false),
    getAppointmentById: (id) => state.appointments.find(apt => apt.id === id),
    getAppointmentsByStatus: (status) => state.appointments.filter(apt => apt.status === status),
    getTodaysAppointments: () => computedData.todayAppointments || [] // ✅ NEW
  };
};