import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

/**
 * ✅ FIXED Patient Appointments Hook
 * Gets all data from get_appointments_by_role - NO DIRECT TABLE QUERIES
 * 
 * Features:
 * - Fetch active appointments (pending/confirmed)
 * - Treatment plan data included from RPC
 * - Cancel appointments
 * - Health analytics
 * 
 * NOTE: Archive functionality is in AppointmentHistory.jsx only
 */
export const usePatientAppointments = () => {
  const { user, isPatient } = useAuth();
  
  const [appointments, setAppointments] = useState([]);
  const [healthAnalytics, setHealthAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    totalCount: 0,
    hasMore: false
  });

  // ====================================================================
  // ✅ Fetch Appointments (ALL DATA FROM RPC - NO DIRECT QUERIES)
  // ====================================================================
  const fetchAppointments = useCallback(async (options = {}) => {
    if (!user || !isPatient) return { success: false, error: 'Authentication required' };

    try {
      setLoading(true);
      setError(null);

      const {
        status = null,
        dateFrom = null,
        dateTo = null,
        loadMore = false
      } = options;

      const currentOffset = loadMore ? pagination.offset : 0;

      console.log('🔄 Fetching appointments via RPC...');

      // ✅ ONLY use RPC functions - NO direct table queries
      const [appointmentsResponse, analyticsResponse] = await Promise.allSettled([
        supabase.rpc('get_appointments_by_role', {
          p_status: status ? [status] : null,
          p_date_from: dateFrom,
          p_date_to: dateTo,
          p_limit: pagination.limit,
          p_offset: currentOffset
        }),
        supabase.rpc('get_patient_health_analytics', { p_patient_id: null })
      ]);

      // Handle appointments
      if (appointmentsResponse.status === 'rejected') {
        throw new Error(appointmentsResponse.reason?.message || 'Failed to fetch appointments');
      }

      const appointmentsResult = appointmentsResponse.value;
      if (appointmentsResult.error) {
        throw new Error(appointmentsResult.error.message);
      }

      if (!appointmentsResult.data?.success) {
        throw new Error(appointmentsResult.data?.error || 'Failed to fetch appointments');
      }

      const appointmentData = appointmentsResult.data.data;
      const newAppointments = appointmentData?.appointments || [];
      
      console.log('📥 Raw appointments from DB:', {
        total: newAppointments.length,
        byStatus: {
          pending: newAppointments.filter(a => a.status === 'pending').length,
          confirmed: newAppointments.filter(a => a.status === 'confirmed').length,
          completed: newAppointments.filter(a => a.status === 'completed').length,
          cancelled: newAppointments.filter(a => a.status === 'cancelled').length,
        }
      });
      
      // ✅ Filter for active appointments only (pending/confirmed)
      // Treatment plan data is already included in the response as 'treatment_plan'
      const activeAppointments = newAppointments.filter(apt => 
        ['pending', 'confirmed'].includes(apt.status)
      );

      console.log('✅ Fetched appointments:', activeAppointments);

      // Update state
      setAppointments(prev => 
        loadMore ? [...prev, ...activeAppointments] : activeAppointments
      );

      setPagination(prev => ({
        ...prev,
        totalCount: appointmentData?.total_count || 0,
        hasMore: appointmentData?.has_more || false,
        offset: loadMore ? prev.offset + activeAppointments.length : activeAppointments.length
      }));

      // Handle analytics (optional)
      if (analyticsResponse.status === 'fulfilled' && analyticsResponse.value.data) {
        setHealthAnalytics(analyticsResponse.value.data);
      }

      return { success: true, appointments: activeAppointments };

    } catch (err) {
      const errorMsg = err.message || 'Failed to fetch appointments';
      console.error('❌ Fetch appointments error:', errorMsg);
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [user, isPatient, pagination.limit, pagination.offset]);

  // ====================================================================
  // ✅ Cancel Appointment
  // ====================================================================
  const cancelAppointment = useCallback(async (appointmentId, reason) => {
    try {
      const { data, error } = await supabase.rpc('cancel_appointment', {
        p_appointment_id: appointmentId,
        p_cancellation_reason: reason
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to cancel appointment');

      // Remove from local state
      setAppointments(prev => prev.filter(apt => apt.id !== appointmentId));

      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  // ====================================================================
  // ✅ Check if can cancel appointment
  // ====================================================================
  const canCancelAppointment = useCallback((appointmentId) => {
    const appointment = appointments.find(apt => apt.id === appointmentId);
    if (!appointment) return false;
    
    // Use can_cancel from the database response
    return appointment.can_cancel === true;
  }, [appointments]);

  // ====================================================================
  // ✅ Computed Statistics (UPCOMING ONLY)
  // ====================================================================
  const stats = useMemo(() => {
    // ✅ FIXED: Use 'treatment_plan' from database response
    const treatmentRelatedAppointments = appointments.filter(apt => apt.treatment_plan);
    const today = new Date().toISOString().split('T')[0];
    
    return {
      total: appointments.length,
      pending: appointments.filter(apt => apt.status === 'pending').length,
      confirmed: appointments.filter(apt => apt.status === 'confirmed').length,
      upcoming: appointments.filter(apt => apt.appointment_date >= today).length,
      healthScore: healthAnalytics?.health_score || 0,
      
      // ✅ Treatment-specific stats
      treatmentRelatedCount: treatmentRelatedAppointments.length,
      hasTreatmentPlans: treatmentRelatedAppointments.length > 0
    };
  }, [appointments, healthAnalytics]);

  // ====================================================================
  // ✅ Helper: Get Appointment Details
  // ====================================================================
  const getAppointmentDetails = useCallback((appointmentId) => {
    return appointments.find(apt => apt.id === appointmentId);
  }, [appointments]);

  // ====================================================================
  // ✅ Helper: Get Upcoming Appointments
  // ====================================================================
  const upcomingAppointments = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return appointments.filter(apt => 
      apt.appointment_date >= today && ['pending', 'confirmed'].includes(apt.status)
    ).sort((a, b) => {
      const dateA = new Date(`${a.appointment_date}T${a.appointment_time}`);
      const dateB = new Date(`${b.appointment_date}T${b.appointment_time}`);
      return dateA - dateB;
    });
  }, [appointments]);

  // ====================================================================
  // ✅ Helper: Get Appointments by Treatment Plan
  // ====================================================================
  const getAppointmentsByTreatmentPlan = useCallback((treatmentPlanId) => {
    // ✅ FIXED: Use 'treatment_plan' from database response
    return appointments.filter(apt => 
      apt.treatment_plan?.id === treatmentPlanId
    );
  }, [appointments]);

  // ====================================================================
  // ✅ Auto-fetch on mount
  // ====================================================================
  useEffect(() => {
    if (user && isPatient) {
      fetchAppointments();
    }
  }, [user, isPatient]);
  

  return {
    // State
    appointments,
    upcomingAppointments,
    healthAnalytics,
    loading,
    error,
    pagination,
    stats,

    // Actions
    fetchAppointments,
    cancelAppointment,
    canCancelAppointment,
    loadMore: () => fetchAppointments({ loadMore: true }),
    refresh: () => fetchAppointments(),

    // Utilities
    isEmpty: appointments.length === 0,
    hasMore: pagination.hasMore,
    clearError: () => setError(null),
    getAppointmentDetails,
    getAppointmentsByTreatmentPlan
  };
};