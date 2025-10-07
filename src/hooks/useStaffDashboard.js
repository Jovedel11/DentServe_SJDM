import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

export const useStaffDashboard = (options = {}) => {
  const { user, profile, isStaff, isAdmin } = useAuth();
  const {
    autoRefresh = true,
    refreshInterval = 2 * 60 * 1000, // 2 minutes
    includeTrends = true
  } = options;

  const [state, setState] = useState({
    loading: true,
    error: null,
    todayAppointments: [],
    weeklyStats: [],
    recentFeedback: [],
    notifications: [],
    clinicInfo: null,
    stats: {
      today: { total: 0, completed: 0, pending: 0, confirmed: 0, cancelled: 0 },
      week: { total: 0, completed: 0, growth: 0 },
      month: { patients: 0, growth: 0, appointments: 0 }
    },
    lastUpdated: null
  });

  const fetchInProgressRef = useRef(false);

  // Get clinic ID
  const clinicId = useMemo(() => {
    return profile?.role_specific_data?.clinic_id || 
          profile?.clinic_id || 
          profile?.staff_profile?.clinic_id;
  }, [profile]);

  /**
   * Fetch today's appointments
   */
  const fetchTodayAppointments = useCallback(async () => {
    if (!clinicId) return [];

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          symptoms,
          duration_minutes,
          patient:patient_id (
            id,
            user_profiles!inner (
              first_name,
              last_name,
              profile_image_url
            )
          ),
          doctors!inner (
            id,
            first_name,
            last_name,
            specialization,
            image_url
          ),
          appointment_services (
            services (
              id,
              name,
              category
            )
          )
        `)
        .eq('clinic_id', clinicId)
        .eq('appointment_date', today)
        .order('appointment_time', { ascending: true });

      if (error) throw error;

      // Transform data
      return (data || []).map(apt => ({
        ...apt,
        patient_name: apt.patient?.user_profiles 
          ? `${apt.patient.user_profiles.first_name} ${apt.patient.user_profiles.last_name}`
          : 'Unknown Patient',
        patient_image: apt.patient?.user_profiles?.profile_image_url,
        doctor_name: `Dr. ${apt.doctors?.first_name} ${apt.doctors?.last_name}`,
        doctor_specialization: apt.doctors?.specialization,
        services: apt.appointment_services?.map(as => as.services) || []
      }));
    } catch (error) {
      console.error('Error fetching today appointments:', error);
      return [];
    }
  }, [clinicId]);

  /**
   * Fetch weekly statistics
   */
  const fetchWeeklyStats = useCallback(async () => {
    if (!clinicId) return [];

    try {
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 6); // Last 7 days including today

      const { data, error } = await supabase
        .from('appointments')
        .select('appointment_date, status, created_at')
        .eq('clinic_id', clinicId)
        .gte('appointment_date', weekAgo.toISOString().split('T')[0])
        .lte('appointment_date', today.toISOString().split('T')[0]);

      if (error) throw error;

      // Group by date
      const statsMap = {};
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        statsMap[dateStr] = {
          date: dateStr,
          day: date.toLocaleDateString('en-US', { weekday: 'short' }),
          total: 0,
          completed: 0,
          pending: 0,
          confirmed: 0,
          cancelled: 0
        };
      }

      // Count appointments
      (data || []).forEach(apt => {
        const dateStr = apt.appointment_date;
        if (statsMap[dateStr]) {
          statsMap[dateStr].total++;
          if (apt.status === 'completed') statsMap[dateStr].completed++;
          if (apt.status === 'pending') statsMap[dateStr].pending++;
          if (apt.status === 'confirmed') statsMap[dateStr].confirmed++;
          if (apt.status === 'cancelled') statsMap[dateStr].cancelled++;
        }
      });

      return Object.values(statsMap);
    } catch (error) {
      console.error('Error fetching weekly stats:', error);
      return [];
    }
  }, [clinicId]);

  /**
   * Fetch recent feedback
   */
  const fetchRecentFeedback = useCallback(async () => {
    if (!clinicId) return [];

    try {
      const { data, error } = await supabase
        .from('feedback')
        .select(`
          id,
          clinic_rating,
          doctor_rating,
          comment,
          created_at,
          response,
          patient:patient_id (
            id,
            user_profiles!inner (
              first_name,
              last_name
            )
          ),
          doctors (
            id,
            first_name,
            last_name
          )
        `)
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      return (data || []).map(fb => ({
        ...fb,
        patient_name: fb.patient?.user_profiles 
          ? `${fb.patient.user_profiles.first_name} ${fb.patient.user_profiles.last_name}`
          : 'Anonymous',
        doctor_name: fb.doctors 
          ? `Dr. ${fb.doctors.first_name} ${fb.doctors.last_name}`
          : null,
        rating: fb.clinic_rating || fb.doctor_rating || 0
      }));
    } catch (error) {
      console.error('Error fetching recent feedback:', error);
      return [];
    }
  }, [clinicId]);

  /**
   * Fetch notifications
   */
  const fetchNotifications = useCallback(async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }, [user]);

  /**
   * Fetch clinic info
   */
  const fetchClinicInfo = useCallback(async () => {
    if (!clinicId) return null;

    try {
      const { data, error } = await supabase
        .from('clinics')
        .select('id, name, rating, total_reviews, is_active')
        .eq('id', clinicId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching clinic info:', error);
      return null;
    }
  }, [clinicId]);

  /**
   * Fetch monthly growth stats
   */
  const fetchMonthlyGrowth = useCallback(async () => {
    if (!clinicId) return null;

    try {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);

      const { data, error } = await supabase
        .from('appointments')
        .select('patient_id, created_at')
        .eq('clinic_id', clinicId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (error) throw error;

      // Count unique patients
      const uniquePatients = new Set((data || []).map(apt => apt.patient_id));
      
      return {
        patients: uniquePatients.size,
        appointments: (data || []).length,
        growth: 0 // Can calculate if we have previous period data
      };
    } catch (error) {
      console.error('Error fetching monthly growth:', error);
      return { patients: 0, appointments: 0, growth: 0 };
    }
  }, [clinicId]);

  /**
   * Fetch all dashboard data
   */
  const fetchDashboardData = useCallback(async () => {
    if (!isStaff && !isAdmin) {
      setState(prev => ({ 
        ...prev, 
        error: 'Access denied: Staff or Admin required' 
      }));
      return { success: false, error: 'Access denied' };
    }

    if (!clinicId) {
      setState(prev => ({ 
        ...prev, 
        loading: false,
        error: 'No clinic assigned to your account' 
      }));
      return { success: false, error: 'No clinic assigned' };
    }

    if (fetchInProgressRef.current) {
      return { success: false, error: 'Fetch in progress' };
    }

    try {
      fetchInProgressRef.current = true;
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Fetch all data in parallel
      const [
        todayAppointments,
        weeklyStats,
        recentFeedback,
        notifications,
        clinicInfo,
        monthlyGrowth
      ] = await Promise.all([
        fetchTodayAppointments(),
        fetchWeeklyStats(),
        fetchRecentFeedback(),
        fetchNotifications(),
        fetchClinicInfo(),
        fetchMonthlyGrowth()
      ]);

      // Calculate today's stats
      const todayStats = {
        total: todayAppointments.length,
        completed: todayAppointments.filter(a => a.status === 'completed').length,
        pending: todayAppointments.filter(a => a.status === 'pending').length,
        confirmed: todayAppointments.filter(a => a.status === 'confirmed').length,
        cancelled: todayAppointments.filter(a => a.status === 'cancelled').length
      };

      // Calculate week stats
      const weekStats = {
        total: weeklyStats.reduce((sum, day) => sum + day.total, 0),
        completed: weeklyStats.reduce((sum, day) => sum + day.completed, 0),
        growth: 0 // Can calculate with previous week data
      };

      setState({
        loading: false,
        error: null,
        todayAppointments,
        weeklyStats,
        recentFeedback,
        notifications,
        clinicInfo,
        stats: {
          today: todayStats,
          week: weekStats,
          month: monthlyGrowth
        },
        lastUpdated: new Date()
      });

      return { success: true };
    } catch (error) {
      const errorMsg = error.message || 'Failed to fetch dashboard data';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMsg 
      }));
      console.error('Dashboard fetch error:', error);
      return { success: false, error: errorMsg };
    } finally {
      fetchInProgressRef.current = false;
    }
  }, [
    isStaff, 
    isAdmin, 
    clinicId, 
    fetchTodayAppointments, 
    fetchWeeklyStats,
    fetchRecentFeedback,
    fetchNotifications,
    fetchClinicInfo,
    fetchMonthlyGrowth
  ]);

  /**
   * Refresh dashboard
   */
  const refresh = useCallback(() => {
    return fetchDashboardData();
  }, [fetchDashboardData]);

  /**
   * Mark notification as read
   */
  const markNotificationRead = useCallback(async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.filter(n => n.id !== notificationId)
      }));

      return { success: true };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if ((isStaff || isAdmin) && clinicId) {
      fetchDashboardData();
    }
  }, [isStaff, isAdmin, clinicId]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !isStaff) return;

    const interval = setInterval(() => {
      fetchDashboardData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, isStaff, fetchDashboardData]);

  // Computed values
  const nextAppointment = useMemo(() => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    return state.todayAppointments.find(apt => {
      if (apt.status !== 'pending' && apt.status !== 'confirmed') return false;
      
      const [hours, minutes] = apt.appointment_time.split(':').map(Number);
      const aptTime = hours * 60 + minutes;
      
      return aptTime > currentTime;
    });
  }, [state.todayAppointments]);

  const urgentAlerts = useMemo(() => {
    const alerts = [];

    // Cancelled appointments today
    const cancelledToday = state.todayAppointments.filter(a => a.status === 'cancelled');
    if (cancelledToday.length > 0) {
      alerts.push({
        type: 'cancelled',
        count: cancelledToday.length,
        message: `${cancelledToday.length} appointment${cancelledToday.length > 1 ? 's' : ''} cancelled today`,
        severity: 'warning'
      });
    }

    // Pending feedback
    const pendingFeedback = state.recentFeedback.filter(f => !f.response);
    if (pendingFeedback.length > 0) {
      alerts.push({
        type: 'feedback',
        count: pendingFeedback.length,
        message: `${pendingFeedback.length} feedback awaiting response`,
        severity: 'info'
      });
    }

    // Unread notifications
    if (state.notifications.length > 0) {
      alerts.push({
        type: 'notifications',
        count: state.notifications.length,
        message: `${state.notifications.length} unread notification${state.notifications.length > 1 ? 's' : ''}`,
        severity: 'info'
      });
    }

    return alerts;
  }, [state.todayAppointments, state.recentFeedback, state.notifications]);

  return {
    // State
    ...state,
    clinicId,
    
    // Computed
    nextAppointment,
    urgentAlerts,
    hasData: !state.loading && !state.error,
    isEmpty: state.todayAppointments.length === 0,
    
    // Actions
    refresh,
    fetchDashboardData,
    markNotificationRead,
    
    // Individual fetchers (for selective updates)
    fetchTodayAppointments,
    fetchRecentFeedback,
    fetchNotifications
  };
};