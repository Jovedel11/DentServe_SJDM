import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/context/AuthProvider';

export const useAdminAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  
  const { isAdmin } = useAuth();

  // Fetch all appointments
  const fetchAppointments = useCallback(async (options = {}) => {
    if (!isAdmin) {
      const error = 'Access denied: Admin required';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);
      
      const {
        status = null,
        dateFrom = null,
        dateTo = null,
        limit = 20,
        offset = 0
      } = options;

      const { data, error: rpcError } = await supabase.rpc('get_appointments_by_role', {
        p_status: status,
        p_date_from: dateFrom,
        p_date_to: dateTo,
        p_limit: limit,
        p_offset: offset
      });

      if (rpcError) throw new Error(rpcError.message);

      setAppointments(data || []);
      setTotalCount(data?.length || 0);

      return {
        success: true,
        data: data
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch appointments';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  //Delete appointment
  const deleteAppointment = useCallback(async (appointmentId) => {
    if (!isAdmin) {
      return { success: false, error: 'Access denied: Admin required' };
    }

    try {
      setLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (deleteError) throw new Error(deleteError.message);

      // Refresh appointments list
      await fetchAppointments();

      return {
        success: true,
        message: 'Appointment deleted successfully'
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to delete appointment';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [isAdmin, fetchAppointments]);

  //Get appointment statistics
  const getAppointmentStats = useCallback(async () => {
    if (!isAdmin) {
      return { success: false, error: 'Access denied: Admin required' };
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('appointments')
        .select('status, clinic_id, appointment_date');

      if (queryError) throw new Error(queryError.message);

      // Calculate statistics
      const stats = {
        total: data.length,
        pending: data.filter(a => a.status === 'pending').length,
        confirmed: data.filter(a => a.status === 'confirmed').length,
        completed: data.filter(a => a.status === 'completed').length,
        cancelled: data.filter(a => a.status === 'cancelled').length,
        no_show: data.filter(a => a.status === 'no_show').length,
        clinics: new Set(data.map(a => a.clinic_id)).size
      };

      return {
        success: true,
        data: stats
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch appointment statistics';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  return {
    // State
    appointments,
    loading,
    error,
    totalCount,
    
    // Methods
    fetchAppointments,
    deleteAppointment,
    getAppointmentStats
  };
};