import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../auth/context/AuthProvider';
import { supabase } from '../../lib/supabaseClient';

export const usePatientAppointments = () => {
  const { user, profile, isPatient } = useAuth();
  
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming'); // upcoming, past, all
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    totalCount: 0,
    hasMore: false
  });

  // Fetch patient appointments
  const fetchAppointments = useCallback(async (options = {}) => {
    if (!isPatient()) return;

    try {
      setLoading(true);
      setError(null);

      const { 
        tab = activeTab,
        limit = pagination.limit,
        offset = pagination.offset,
        refresh = false
      } = options;

      // Determine status filter based on tab
      let statusFilter = null;
      let dateFrom = null;
      let dateTo = null;

      const today = new Date().toISOString().split('T')[0];

      switch (tab) {
        case 'upcoming':
          statusFilter = ['pending', 'confirmed'];
          dateFrom = today;
          break;
        case 'past':
          statusFilter = ['completed', 'cancelled', 'no_show'];
          dateTo = today;
          break;
        case 'all':
        default:
          statusFilter = null;
          break;
      }

      const { data, error } = await supabase.rpc('get_appointments_by_role', {
        p_status: statusFilter,
        p_date_from: dateFrom,
        p_date_to: dateTo,
        p_limit: limit,
        p_offset: refresh ? 0 : offset
      });

      if (error) throw new Error(error.message);

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
      console.error('Fetch patient appointments error:', err);
    } finally {
      setLoading(false);
    }
  }, [isPatient, activeTab, pagination.limit, pagination.offset]);

  // Cancel appointment (patient-initiated)
  const cancelAppointment = useCallback(async (appointmentId, reason) => {
    if (!isPatient()) return { success: false, error: 'Access denied' };

    try {
      setLoading(true);
      setError(null);

      // First check if cancellation is allowed
      const { data: canCancelData, error: canCancelError } = await supabase.rpc('can_cancel_appointment', {
        p_appointment_id: appointmentId
      });

      if (canCancelError) throw new Error(canCancelError.message);

      if (!canCancelData) {
        return { 
          success: false, 
          error: 'Cancellation not allowed within the clinic policy timeframe' 
        };
      }

      // Proceed with cancellation
      const { data, error } = await supabase.rpc('cancel_appointment', {
        p_appointment_id: appointmentId,
        p_cancellation_reason: reason,
        p_cancelled_by: null // Will use current user
      });

      if (error) throw new Error(error.message);

      if (data?.authenticated === false) {
        setError('Please log in to continue');
        return { success: false };
      }

      if (!data?.success) {
        setError(data?.error || 'Failed to cancel appointment');
        return { success: false };
      }

      // Update local state
      setAppointments(prev => prev.map(apt => 
        apt.id === appointmentId 
          ? { 
              ...apt, 
              status: 'cancelled', 
              cancellation_reason: reason,
              cancelled_at: new Date().toISOString()
            }
          : apt
      ));

      return {
        success: true,
        message: data.message
      };

    } catch (err) {
      const errorMsg = err?.message || 'Failed to cancel appointment';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [isPatient]);

  // Check if appointment can be cancelled
  const canCancelAppointment = useCallback(async (appointmentId) => {
    try {
      const { data, error } = await supabase.rpc('can_cancel_appointment', {
        p_appointment_id: appointmentId
      });

      if (error) return false;
      return data || false;
    } catch (err) {
      console.error('Can cancel check error:', err);
      return false;
    }
  }, []);

  // Get appointment details
  const getAppointmentDetails = useCallback((appointmentId) => {
    return appointments.find(apt => apt.id === appointmentId) || null;
  }, [appointments]);

  // Change active tab
  const changeTab = useCallback((tab) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
      setPagination(prev => ({ ...prev, offset: 0 }));
      setError(null);
    }
  }, [activeTab]);

  // Load more appointments
  const loadMore = useCallback(() => {
    if (!loading && pagination.hasMore) {
      fetchAppointments({ offset: pagination.offset });
    }
  }, [loading, pagination.hasMore, pagination.offset, fetchAppointments]);

  // Refresh appointments
  const refresh = useCallback(() => {
    fetchAppointments({ refresh: true });
  }, [fetchAppointments]);

  // Get appointments by status
  const getAppointmentsByStatus = useCallback((status) => {
    return appointments.filter(apt => apt.status === status);
  }, [appointments]);

  // Get upcoming appointments (next 7 days)
  const getUpcomingAppointments = useCallback(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];
    
    return appointments.filter(apt => 
      ['pending', 'confirmed'].includes(apt.status) &&
      apt.appointment_date >= new Date().toISOString().split('T')[0] &&
      apt.appointment_date <= nextWeekStr
    );
  }, [appointments]);

  // Get appointment statistics
  const getStats = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    
    return {
      total: appointments.length,
      pending: appointments.filter(apt => apt.status === 'pending').length,
      confirmed: appointments.filter(apt => apt.status === 'confirmed').length,
      completed: appointments.filter(apt => apt.status === 'completed').length,
      cancelled: appointments.filter(apt => apt.status === 'cancelled').length,
      upcoming: appointments.filter(apt => 
        ['pending', 'confirmed'].includes(apt.status) && 
        apt.appointment_date >= today
      ).length,
      nextAppointment: appointments
        .filter(apt => 
          ['pending', 'confirmed'].includes(apt.status) && 
          apt.appointment_date >= today
        )
        .sort((a, b) => {
          const dateA = new Date(`${a.appointment_date}T${a.appointment_time}`);
          const dateB = new Date(`${b.appointment_date}T${b.appointment_time}`);
          return dateA - dateB;
        })[0] || null
    };
  }, [appointments]);

  // Auto-fetch when tab changes
  useEffect(() => {
    fetchAppointments({ refresh: true });
  }, [activeTab]);

  return {
    // Data
    appointments,
    loading,
    error,
    activeTab,
    pagination,

    // Actions
    cancelAppointment,
    canCancelAppointment,
    changeTab,
    refresh,
    loadMore,

    // Computed
    stats: getStats(),
    upcomingAppointments: getUpcomingAppointments(),
    isEmpty: appointments.length === 0,
    hasMore: pagination.hasMore,

    // Utilities
    getAppointmentDetails,
    getAppointmentsByStatus,
    canCancel: (appointment) => 
      ['pending', 'confirmed'].includes(appointment?.status) &&
      appointment?.appointment_date >= new Date().toISOString().split('T')[0],
    isUpcoming: (appointment) => 
      ['pending', 'confirmed'].includes(appointment?.status) &&
      appointment?.appointment_date >= new Date().toISOString().split('T')[0],
    isPast: (appointment) =>
      ['completed', 'cancelled', 'no_show'].includes(appointment?.status) ||
      appointment?.appointment_date < new Date().toISOString().split('T')[0]
  };
};