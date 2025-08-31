import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../auth/context/AuthProvider';
import { supabase } from '../../lib/supabaseClient';

export const usePatientAppointments = () => {
  const { isPatient } = useAuth();
  
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    totalCount: 0,
    hasMore: false
  });

  // fetch with proper user ID extraction
  const fetchAppointments = useCallback(async (options = {}) => {
    if (!isPatient()) {
      return { success: false, error: 'Access denied: Patient only' };
    }

    try {
      setLoading(true);
      setError(null);

      const { 
        tab = activeTab,
        limit = pagination.limit,
        offset = pagination.offset,
        refresh = false
      } = options;

      // Better status and date filtering
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
          break;
        case 'pending':
          statusFilter = ['pending'];
          break;
        case 'confirmed':
          statusFilter = ['confirmed'];
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
        throw new Error('Authentication required');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch appointments');
      }

      const appointmentData = data.data;
      const newAppointments = appointmentData.appointments || [];

      // computed fields to appointments
      const enrichedAppointments = newAppointments.map(apt => ({
        ...apt,
        canCancel: ['pending', 'confirmed'].includes(apt.status) &&
                  apt.appointment_date >= today,
        isUpcoming: ['pending', 'confirmed'].includes(apt.status) &&
                  apt.appointment_date >= today,
        isPast: ['completed', 'cancelled', 'no_show'].includes(apt.status) ||
              apt.appointment_date < today,
        appointmentDateTime: new Date(`${apt.appointment_date}T${apt.appointment_time}`),
        statusColor: {
          pending: 'yellow',
          confirmed: 'green',
          completed: 'blue',
          cancelled: 'red',
          no_show: 'gray'
        }[apt.status] || 'gray'
      }));

      if (refresh || offset === 0) {
        setAppointments(enrichedAppointments);
      } else {
        setAppointments(prev => [...prev, ...enrichedAppointments]);
      }

      setPagination(prev => ({
        ...prev,
        totalCount: appointmentData.total_count || 0,
        hasMore: newAppointments.length === limit,
        offset: refresh ? newAppointments.length : prev.offset + newAppointments.length
      }));

      return {
        success: true,
        appointments: enrichedAppointments,
        totalCount: appointmentData.total_count || 0
      };

    } catch (err) {
      const errorMsg = err?.message || 'Failed to load appointments';
      setError(errorMsg);
      console.error('Fetch patient appointments error:', err);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [isPatient, activeTab, pagination.limit, pagination.offset]);

  // Cancel appointment with proper validation
  const cancelAppointment = useCallback(async (appointmentId, reason) => {
    if (!isPatient()) {
      return { success: false, error: 'Access denied: Patient only' };
    }

    if (!appointmentId || !reason?.trim()) {
      return { success: false, error: 'Appointment ID and reason are required' };
    }

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
        p_cancellation_reason: reason.trim(),
        p_cancelled_by: null // Function will use current user
      });

      if (error) throw new Error(error.message);

      if (data?.authenticated === false) {
        throw new Error('Authentication required');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to cancel appointment');
      }

      // Optimistic update
      setAppointments(prev => prev.map(apt => 
        apt.id === appointmentId 
          ? { 
              ...apt, 
              status: 'cancelled', 
              cancellation_reason: reason.trim(),
              cancelled_at: new Date().toISOString(),
              canCancel: false,
              isPast: true,
              statusColor: 'red'
            }
          : apt
      ));

      return {
        success: true,
        message: data.message,
        appointmentId
      };

    } catch (err) {
      const errorMsg = err?.message || 'Failed to cancel appointment';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [isPatient]);

  // Check cancellation eligibility
  const canCancelAppointment = useCallback(async (appointmentId) => {
    if (!appointmentId) return { canCancel: false, error: 'Invalid appointment ID' };

    try {
      const { data, error } = await supabase.rpc('can_cancel_appointment', {
        p_appointment_id: appointmentId
      });

      if (error) return { canCancel: false, error: error.message };

      return { canCancel: data || false, error: null };
    } catch (err) {
      console.error('Can cancel check error:', err);
      return { canCancel: false, error: err.message };
    }
  }, []);

  //  Get appointment details with computed fields
  const getAppointmentDetails = useCallback((appointmentId) => {
    const appointment = appointments.find(apt => apt.id === appointmentId);
    
    if (!appointment) return null;

    // computed fields for detailed view
    return {
      ...appointment,
      timeUntilAppointment: (() => {
        if (!appointment.appointmentDateTime) return null;
        const diff = appointment.appointmentDateTime - new Date();
        if (diff < 0) return null; // Past appointment
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
        return 'Soon';
      })(),
      formattedDate: new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(new Date(appointment.appointment_date)),
      formattedTime: new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(new Date(`2000-01-01T${appointment.appointment_time}`))
    };
  }, [appointments]);

  // Change tab with validation
  const changeTab = useCallback((tab) => {
    const validTabs = ['upcoming', 'past', 'pending', 'confirmed', 'all'];
    
    if (!validTabs.includes(tab)) {
      console.warn('Invalid tab:', tab);
      return;
    }

    if (tab !== activeTab) {
      setActiveTab(tab);
      setPagination(prev => ({ ...prev, offset: 0 }));
      setError(null);
    }
  }, [activeTab]);

  const loadMore = useCallback(() => {
    if (!loading && pagination.hasMore) {
      fetchAppointments({ offset: pagination.offset });
    }
  }, [loading, pagination.hasMore, pagination.offset, fetchAppointments]);

  const refresh = useCallback(() => {
    fetchAppointments({ refresh: true });
  }, [fetchAppointments]);

  //Statistics with more detailed metrics
  const getStats = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];
    
    const upcomingAppointments = appointments.filter(apt => 
      ['pending', 'confirmed'].includes(apt.status) && 
      apt.appointment_date >= today
    );

    const nextAppointment = upcomingAppointments
      .sort((a, b) => new Date(`${a.appointment_date}T${a.appointment_time}`) - 
      new Date(`${b.appointment_date}T${b.appointment_time}`))[0] || null;

    return {
      total: appointments.length,
      pending: appointments.filter(apt => apt.status === 'pending').length,
      confirmed: appointments.filter(apt => apt.status === 'confirmed').length,
      completed: appointments.filter(apt => apt.status === 'completed').length,
      cancelled: appointments.filter(apt => apt.status === 'cancelled').length,
      noShow: appointments.filter(apt => apt.status === 'no_show').length,
      upcoming: upcomingAppointments.length,
      thisWeek: appointments.filter(apt => 
        ['pending', 'confirmed'].includes(apt.status) &&
        apt.appointment_date >= today &&
        apt.appointment_date <= nextWeekStr
      ).length,
      nextAppointment,
      averageRating: (() => {
        const completedWithRating = appointments.filter(apt => 
          apt.status === 'completed' && apt.rating
        );
        if (completedWithRating.length === 0) return null;
        return completedWithRating.reduce((sum, apt) => sum + apt.rating, 0) / 
              completedWithRating.length;
      })()
    };
  }, [appointments]);

  // Auto-fetch when component mounts or tab changes
  useEffect(() => {
    if (isPatient()) {
      fetchAppointments({ refresh: true });
    }
  }, [activeTab, isPatient]);

  return {
    // Data
    appointments,
    loading,
    error,
    activeTab,
    pagination,

    // Actions
    fetchAppointments,       // Returns: { success, appointments, totalCount, error }
    cancelAppointment,       // Returns: { success, message, appointmentId, error }
    canCancelAppointment,    // Returns: { canCancel, error }
    changeTab,
    refresh,
    loadMore,

    // Computed
    stats: getStats(),
    upcomingAppointments: appointments.filter(apt => apt.isUpcoming),
    pastAppointments: appointments.filter(apt => apt.isPast),
    isEmpty: appointments.length === 0,
    hasMore: pagination.hasMore,

    // Utilities
    getAppointmentDetails,
    getAppointmentsByStatus: (status) => appointments.filter(apt => apt.status === status),
    
    // Filters
    filterByDateRange: (startDate, endDate) => 
      appointments.filter(apt => 
        apt.appointment_date >= startDate && 
        apt.appointment_date <= endDate
      ),
    
    searchAppointments: (query) => 
      appointments.filter(apt => 
        apt.clinic?.name?.toLowerCase().includes(query.toLowerCase()) ||
        apt.doctor?.name?.toLowerCase().includes(query.toLowerCase())
      )
  };
};