import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../auth/context/AuthProvider';
import { supabase } from '../../lib/supabaseClient';

export const useStaffAppointments = () => {
  const { user, profile, isStaff } = useAuth();
  
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: null, // null = all, ['pending'] = only pending, etc.
    dateFrom: null,
    dateTo: null,
    searchTerm: ''
  });
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    totalCount: 0,
    hasMore: false
  });

  // Fetch appointments using the optimized function
  const fetchAppointments = useCallback(async (options = {}) => {
    if (!isStaff()) return;

    try {
      setLoading(true);
      setError(null);

      const { 
        status = filters.status, 
        dateFrom = filters.dateFrom, 
        dateTo = filters.dateTo,
        limit = pagination.limit,
        offset = pagination.offset,
        refresh = false
      } = options;

      const { data, error } = await supabase.rpc('get_appointments_by_role', {
        p_status: status,
        p_date_from: dateFrom,
        p_date_to: dateTo,
        p_limit: limit,
        p_offset: refresh ? 0 : offset
      });

      if (error) throw new Error(error.message);

      // Handle authentication errors
      if (data?.authenticated === false) {
        setError('Please log in to continue');
        return;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch appointments');
      }

      const appointmentData = data.data;
      const newAppointments = appointmentData.appointments || [];

      if (refresh || offset === 0) {
        setAppointments(newAppointments);
      } else {
        setAppointments(prev => [...prev, ...newAppointments]);
      }

      setPagination(prev => ({
        ...prev,
        totalCount: appointmentData.total_count || 0,
        hasMore: newAppointments.length === limit,
        offset: refresh ? newAppointments.length : prev.offset + newAppointments.length
      }));

    } catch (err) {
      const errorMsg = err?.message || 'Failed to load appointments';
      setError(errorMsg);
      console.error('Fetch appointments error:', err);
    } finally {
      setLoading(false);
    }
  }, [isStaff, filters, pagination.limit, pagination.offset]);

  // Approve appointment
  const approveAppointment = useCallback(async (appointmentId, notes = null) => {
    if (!isStaff()) return { success: false, error: 'Access denied' };

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('approve_appointment', {
        p_appointment_id: appointmentId,
        p_staff_notes: notes
      });

      if (error) throw new Error(error.message);

      if (data?.authenticated === false) {
        setError('Please log in to continue');
        return { success: false };
      }

      if (!data?.success) {
        setError(data?.error || 'Failed to approve appointment');
        return { success: false };
      }

      // Update local state
      setAppointments(prev => prev.map(apt => 
        apt.id === appointmentId 
          ? { ...apt, status: 'confirmed', notes: notes }
          : apt
      ));

      return {
        success: true,
        message: data.message,
        patientName: data.patient_name
      };

    } catch (err) {
      const errorMsg = err?.message || 'Failed to approve appointment';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [isStaff]);

  // Reject appointment
  const rejectAppointment = useCallback(async (appointmentId, reason) => {
    if (!isStaff()) return { success: false, error: 'Access denied' };

    if (!reason || reason.trim() === '') {
      return { success: false, error: 'Rejection reason is required' };
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('reject_appointment', {
        p_appointment_id: appointmentId,
        p_rejection_reason: reason.trim()
      });

      if (error) throw new Error(error.message);

      if (data?.authenticated === false) {
        setError('Please log in to continue');
        return { success: false };
      }

      if (!data?.success) {
        setError(data?.error || 'Failed to reject appointment');
        return { success: false };
      }

      // Update local state
      setAppointments(prev => prev.map(apt => 
        apt.id === appointmentId 
          ? { ...apt, status: 'cancelled', cancellation_reason: reason }
          : apt
      ));

      return {
        success: true,
        message: data.message,
        patientName: data.patient_name
      };

    } catch (err) {
      const errorMsg = err?.message || 'Failed to reject appointment';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [isStaff]);

  // Complete appointment
  const completeAppointment = useCallback(async (appointmentId, completionNotes = null) => {
    if (!isStaff()) return { success: false, error: 'Access denied' };

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('complete_appointment', {
        p_appointment_id: appointmentId,
        p_completion_notes: completionNotes
      });

      if (error) throw new Error(error.message);

      if (data?.authenticated === false) {
        setError('Please log in to continue');
        return { success: false };
      }

      if (!data?.success) {
        setError(data?.error || 'Failed to complete appointment');
        return { success: false };
      }

      // Update local state
      setAppointments(prev => prev.map(apt => 
        apt.id === appointmentId 
          ? { ...apt, status: 'completed', notes: completionNotes }
          : apt
      ));

      return {
        success: true,
        message: data.message
      };

    } catch (err) {
      const errorMsg = err?.message || 'Failed to complete appointment';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [isStaff]);

  // Update filters
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, offset: 0 }));
    setError(null);
  }, []);

  // Load more appointments (pagination)
  const loadMore = useCallback(() => {
    if (!loading && pagination.hasMore) {
      fetchAppointments({ offset: pagination.offset });
    }
  }, [loading, pagination.hasMore, pagination.offset, fetchAppointments]);

  // Refresh appointments
  const refresh = useCallback(() => {
    fetchAppointments({ refresh: true });
  }, [fetchAppointments]);

  // Get filtered appointments for display
  const getFilteredAppointments = useCallback((searchTerm = filters.searchTerm) => {
    if (!searchTerm || searchTerm.trim() === '') {
      return appointments;
    }

    const term = searchTerm.toLowerCase().trim();
    return appointments.filter(apt => 
      apt.patient?.name?.toLowerCase().includes(term) ||
      apt.patient?.email?.toLowerCase().includes(term) ||
      apt.service_type?.toLowerCase().includes(term) ||
      apt.symptoms?.toLowerCase().includes(term)
    );
  }, [appointments, filters.searchTerm]);

  // Get appointment statistics
  const getStats = useCallback(() => {
    return {
      total: appointments.length,
      pending: appointments.filter(apt => apt.status === 'pending').length,
      confirmed: appointments.filter(apt => apt.status === 'confirmed').length,
      completed: appointments.filter(apt => apt.status === 'completed').length,
      cancelled: appointments.filter(apt => apt.status === 'cancelled').length,
      todayCount: appointments.filter(apt => {
        const today = new Date().toISOString().split('T')[0];
        return apt.appointment_date === today;
      }).length
    };
  }, [appointments]);

  // Auto-fetch on component mount and filter changes
  useEffect(() => {
    fetchAppointments({ refresh: true });
  }, [filters.status, filters.dateFrom, filters.dateTo]);

  return {
    // Data
    appointments: getFilteredAppointments(),
    allAppointments: appointments,
    loading,
    error,
    filters,
    pagination,

    // Actions
    approveAppointment,
    rejectAppointment,
    completeAppointment,
    updateFilters,
    refresh,
    loadMore,

    // Computed
    stats: getStats(),
    isEmpty: appointments.length === 0,
    hasMore: pagination.hasMore,

    // Utilities
    canApprove: (appointment) => appointment.status === 'pending',
    canReject: (appointment) => ['pending', 'confirmed'].includes(appointment.status),
    canComplete: (appointment) => appointment.status === 'confirmed',
    isPastDate: (date) => date < new Date().toISOString().split('T')[0]
  };
};