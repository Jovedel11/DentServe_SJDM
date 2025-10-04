import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '../../auth/context/AuthProvider';
import { supabase } from '../../lib/supabaseClient';
import { useAppointmentCancellation } from './useAppointmentCancellation';

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

  // ✅ UNIFIED FETCH - Works for all user types
  const fetchAppointments = useCallback(async (customFilters = {}, loadMore = false) => {
    try {
      setState(prev => ({ 
        ...prev, 
        loading: !loadMore, 
        error: null 
      }));

      const filters = { ...state.filters, ...customFilters };
      const offset = loadMore ? state.pagination.offset : 0;

      // ✅ Use centralized RPC function
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

      // ✅ Get health analytics for patients
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

  // ✅ STAFF ACTIONS - Approve appointment
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

      // ✅ Optimistic update
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
  }, [isStaff, isAdmin]);

  // ✅ STAFF ACTIONS - Reject appointment  
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

      // ✅ Optimistic update
      setState(prev => ({
        ...prev,
        loading: false,
        appointments: prev.appointments.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, status: 'cancelled', cancellation_reason: params.p_rejection_reason }
            : apt
        )
      }));

      return { success: true, data: data.data, message: data.message };

    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err.message }));
      return { success: false, error: err.message };
    }
  }, [isStaff, isAdmin]);

  // ✅ STAFF ACTIONS - Complete appointment
  const completeAppointment = useCallback(async (appointmentId, completionData = {}) => {
    if (!isStaff && !isAdmin) return { success: false, error: 'Access denied' };

    try {
      setState(prev => ({ ...prev, loading: true }));

      const { data, error } = await supabase.rpc('complete_appointment', {
        p_appointment_id: appointmentId,
        p_completion_notes: completionData.notes || '',
        p_services_completed: completionData.servicesCompleted || [],
        p_follow_up_required: completionData.followUpRequired || false,
        p_follow_up_notes: completionData.followUpNotes || ''
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Completion failed');

      // ✅ Optimistic update
      setState(prev => ({
        ...prev,
        loading: false,
        appointments: prev.appointments.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, status: 'completed', notes: completionData.notes || apt.notes }
            : apt
        )
      }));

      return { success: true, data: data.data, message: data.message };

    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err.message }));
      return { success: false, error: err.message };
    }
  }, [isStaff, isAdmin]);

  // STAFF ACTIONS - Mark no-show
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

      // ✅ Optimistic update
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
  }, [isStaff, isAdmin]);

  // ✅ FILTER MANAGEMENT
  const updateFilters = useCallback((newFilters) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters },
      pagination: { ...prev.pagination, offset: 0 } // Reset pagination
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

    return {
      filteredAppointments,
      isEmpty: filteredAppointments.length === 0,
      hasAppointments: state.appointments.length > 0,
      
      // Role-specific computed data
      ...(isPatient && {
        upcomingAppointments: filteredAppointments.filter(apt => 
          new Date(apt.appointment_date) > new Date() && apt.status === 'confirmed'
        ),
        completedAppointments: filteredAppointments.filter(apt => apt.status === 'completed')
      }),

      ...(isStaff && {
        pendingAppointments: filteredAppointments.filter(apt => apt.status === 'pending'),
        todayAppointments: filteredAppointments.filter(apt => {
          const today = new Date().toISOString().split('T')[0];
          return apt.appointment_date === today;
        })
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

    // Cancellation (from existing hook)
    ...cancellation,

    // Utilities
    refreshData: () => fetchAppointments({}, false),
    getAppointmentById: (id) => state.appointments.find(apt => apt.id === id),
    getAppointmentsByStatus: (status) => state.appointments.filter(apt => apt.status === status)
  };
};