import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { usePatientArchive } from '../archived/usePatientArchive';

/**
 * Clean Patient Appointments Hook
 * Focused on appointment business logic without archive complexity
 */
export const usePatientAppointments = () => {
  const { user, isPatient } = useAuth();
  const patientArchive = usePatientArchive();
  
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

  // ✅ CLEAN: Fetch appointments without archive complexity
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
      
      // Get archived IDs for filtering
      const archivedIds = new Set(
        patientArchive.archivedData.appointments.map(item => item.item_id)
      );

      // Filter out archived appointments
      const activeAppointments = newAppointments.filter(apt => !archivedIds.has(apt.id));

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
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [user, isPatient, pagination.limit, pagination.offset, patientArchive.archivedData.appointments]);

  // ✅ CLEAN: Archive appointment with automatic UI update
  const archiveAppointment = useCallback(async (appointmentId) => {
    const appointment = appointments.find(apt => apt.id === appointmentId);
    if (!appointment) {
      return { success: false, error: 'Appointment not found' };
    }

    if (appointment.status !== 'completed') {
      return { success: false, error: 'Only completed appointments can be archived' };
    }

    try {
      // Archive using patient archive hook
      const result = await patientArchive.archiveAppointment(appointmentId, appointment);
      
      if (result.success) {
        // Remove from local appointments list
        setAppointments(prev => prev.filter(apt => apt.id !== appointmentId));
      }
      
      return result;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [appointments, patientArchive]);

  // ✅ COMPUTED: Clean statistics
  const stats = useMemo(() => {
    return {
      total: appointments.length,
      completed: appointments.filter(apt => apt.status === 'completed').length,
      upcoming: appointments.filter(apt => 
        apt.status === 'confirmed' && new Date(apt.appointment_date) > new Date()
      ).length,
      canArchiveCount: appointments.filter(apt => apt.status === 'completed').length,
      healthScore: healthAnalytics?.health_score || 0
    };
  }, [appointments, healthAnalytics]);

  // ✅ AUTO-FETCH: Load on mount
  useEffect(() => {
    if (user && isPatient) {
      fetchAppointments();
    }
  }, [user, isPatient]);

  // ✅ SYNC: Refresh when archived data changes
  useEffect(() => {
    if (patientArchive.archivedData.appointments.length > 0) {
      // Re-filter appointments to remove newly archived ones
      const archivedIds = new Set(
        patientArchive.archivedData.appointments.map(item => item.item_id)
      );
      setAppointments(prev => prev.filter(apt => !archivedIds.has(apt.id)));
    }
  }, [patientArchive.archivedData.appointments]);

  return {
    // State
    appointments,
    healthAnalytics,
    loading: loading || patientArchive.loading,
    error: error || patientArchive.error,
    pagination,
    stats,

    // Actions
    fetchAppointments,
    archiveAppointment,
    loadMore: () => fetchAppointments({ loadMore: true }),
    refresh: () => fetchAppointments(),

    // Archive data from separate hook
    archivedAppointments: patientArchive.archivedData.appointments,
    unarchiveAppointment: patientArchive.unarchiveAppointment,
    deleteArchivedAppointment: patientArchive.deleteAppointment,

    // Utilities
    isEmpty: appointments.length === 0,
    hasMore: pagination.hasMore,
    clearError: () => setError(null)
  };
};