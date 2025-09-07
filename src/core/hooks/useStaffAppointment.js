import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../auth/context/AuthProvider';
import { supabase } from '../../lib/supabaseClient';

export const useStaffAppointments = () => {
  const { isStaff, isAdmin } = useAuth();
  
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0
  });

  // Fetch appointments with comprehensive filtering
  const fetchAppointments = useCallback(async (filters = {}) => {
    if (!isStaff() && !isAdmin()) {
      return { success: false, error: 'Access denied: Staff or Admin only' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc('get_appointments_by_role', {
        p_status: filters.status || null,
        p_date_from: filters.dateFrom || null,
        p_date_to: filters.dateTo || null,
        p_limit: filters.limit || 50,
        p_offset: filters.offset || 0
      });

      if (error) throw new Error(error.message);

      if (data?.authenticated === false) {
        throw new Error('Authentication required');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch appointments');
      }

      const appointmentData = data.data;
      const fetchedAppointments = appointmentData.appointments || [];
      
      setAppointments(fetchedAppointments);
      
      // Calculate comprehensive stats
      const totalCount = appointmentData.pagination?.total_count || 0;
      const pendingCount = appointmentData.pagination?.pending_count || 0;
      
      setStats({
        total: totalCount,
        pending: pendingCount,
        confirmed: fetchedAppointments.filter(a => a.status === 'confirmed').length,
        completed: fetchedAppointments.filter(a => a.status === 'completed').length,
        cancelled: fetchedAppointments.filter(a => a.status === 'cancelled').length
      });

      return {
        success: true,
        appointments: fetchedAppointments,
        totalCount: totalCount,
        pendingCount: pendingCount
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch appointments';
      setError(errorMessage);
      
      return { 
        success: false, 
        error: errorMessage,
        appointments: [], 
        totalCount: 0 
      };
    } finally {
      setIsLoading(false);
    }
  }, [isStaff, isAdmin]);

  // Enhanced approve with comprehensive validation
  const approveAppointment = useCallback(async (appointmentId, staffNotes = '') => {
    if (!appointmentId) {
      return { success: false, error: 'Appointment ID is required' };
    }

    if (!isStaff() && !isAdmin()) {
      const error = 'Insufficient permissions';
      setError(error);
      return { success: false, error };
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('approve_appointment', {
        p_appointment_id: appointmentId,
        p_staff_notes: staffNotes
      });

      if (error) throw new Error(error.message);

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to approve appointment');
      }

      // Optimistic update with comprehensive data
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId 
            ? { 
                ...apt, 
                status: 'confirmed',
                notes: staffNotes || apt.notes,
                updated_at: new Date().toISOString()
              }
            : apt
        )
      );

      // Update stats
      setStats(prev => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        confirmed: prev.confirmed + 1
      }));

      return {
        success: true,
        data: data.data,
        message: data.message || 'Appointment approved successfully',
        appointmentId: appointmentId
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to approve appointment';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [isStaff, isAdmin]);

  // ✅ FIXED: Enhanced reject with proper RPC parameter mapping
  const rejectAppointment = useCallback(async (appointmentId, rejectionData) => {
    console.log('🔄 rejectAppointment called with:', { appointmentId, rejectionData });

    if (!appointmentId) {
      return { success: false, error: 'Appointment ID is required' };
    }

    if (!isStaff() && !isAdmin()) {
      const error = 'Insufficient permissions';
      setError(error);
      return { success: false, error };
    }

    // ✅ FIXED: Proper parameter extraction and validation
    let rejectionReason, rejectionCategory, suggestReschedule, alternativeDates;

    if (typeof rejectionData === 'string') {
      rejectionReason = rejectionData;
      rejectionCategory = 'other';
      suggestReschedule = false;
      alternativeDates = null;
    } else if (rejectionData && typeof rejectionData === 'object') {
      rejectionReason = rejectionData.reason;
      rejectionCategory = rejectionData.category || 'staff_decision';
      suggestReschedule = rejectionData.suggest_reschedule || rejectionData.suggestReschedule || false;
      alternativeDates = rejectionData.alternative_dates || rejectionData.alternativeDates || null;
    } else {
      return { success: false, error: 'Invalid rejection data provided' };
    }

    if (!rejectionReason?.trim()) {
      return { success: false, error: 'Rejection reason is required' };
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('📤 Calling reject_appointment RPC with:', {
        p_appointment_id: appointmentId,
        p_rejection_reason: rejectionReason.trim(),
        p_rejection_category: rejectionCategory,
        p_suggest_reschedule: suggestReschedule,
        p_alternative_dates: alternativeDates
      });

      const { data, error } = await supabase.rpc('reject_appointment', {
        p_appointment_id: appointmentId,
        p_rejection_reason: rejectionReason.trim(),
        p_rejection_category: rejectionCategory,
        p_suggest_reschedule: suggestReschedule,
        p_alternative_dates: alternativeDates
      });

      console.log('📥 RPC Response:', { data, error });

      if (error) {
        console.error('❌ RPC Error:', error);
        throw new Error(error.message);
      }

      if (!data?.success) {
        console.error('❌ RPC returned failure:', data);
        throw new Error(data?.error || 'Failed to reject appointment');
      }

      // Optimistic update
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId 
            ? { 
                ...apt, 
                status: 'cancelled',
                cancellation_reason: rejectionReason.trim(),
                cancelled_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            : apt
        )
      );

      // Update stats
      setStats(prev => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        cancelled: prev.cancelled + 1
      }));

      return {
        success: true,
        data: data.data,
        message: data.message || 'Appointment rejected successfully',
        appointmentId: appointmentId
      };

    } catch (err) {
      console.error('❌ rejectAppointment error:', err);
      const errorMessage = err.message || 'Failed to reject appointment';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [isStaff, isAdmin]);

  // Enhanced complete with comprehensive completion data
  const completeAppointment = useCallback(async (appointmentId, completionData = {}) => {
    if (!appointmentId) {
      return { success: false, error: 'Appointment ID is required' };
    }

    if (!isStaff() && !isAdmin()) {
      const error = 'Insufficient permissions';
      setError(error);
      return { success: false, error };
    }

    try {
      setIsLoading(true);
      setError(null);

      // Handle both string and object completion data
      const completionNotes = typeof completionData === 'string' 
        ? completionData 
        : completionData.notes || '';

      const { data, error } = await supabase.rpc('complete_appointment', {
        p_appointment_id: appointmentId,
        p_completion_notes: completionNotes,
        p_follow_up_required: completionData.follow_up_required || false,
        p_follow_up_notes: completionData.follow_up_notes || '',
        p_services_completed: completionData.services_completed || []
      });

      if (error) throw new Error(error.message);

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to complete appointment');
      }

      // Optimistic update
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId 
            ? { 
                ...apt, 
                status: 'completed',
                notes: completionNotes || apt.notes,
                updated_at: new Date().toISOString()
              }
            : apt
        )
      );

      // Update stats
      setStats(prev => ({
        ...prev,
        confirmed: Math.max(0, prev.confirmed - 1),
        completed: prev.completed + 1
      }));

      return {
        success: true,
        data: data.data,
        message: data.message || 'Appointment completed successfully',
        appointmentId: appointmentId
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to complete appointment';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [isStaff, isAdmin]);

  // Auto-fetch on mount
  useEffect(() => {
    if (isStaff() || isAdmin()) {
      fetchAppointments();
    }
  }, [isStaff, isAdmin, fetchAppointments]);

  return {
    // Data
    appointments,
    isLoading,
    error,
    stats,

    // Actions
    fetchAppointments,
    approveAppointment,
    rejectAppointment,
    completeAppointment,

    // Computed
    hasAppointments: appointments.length > 0,
    pendingAppointments: appointments.filter(a => a.status === 'pending'),
    todayAppointments: appointments.filter(a => {
      const today = new Date().toISOString().split('T')[0];
      return a.appointment_date === today;
    }),
    upcomingAppointments: appointments.filter(a => {
      const today = new Date();
      const appointmentDate = new Date(a.appointment_date);
      return appointmentDate > today && a.status === 'confirmed';
    }),

    // Utilities
    getAppointmentById: (id) => appointments.find(a => a.id === id),
    getAppointmentsByStatus: (status) => appointments.filter(a => a.status === status),
    getAppointmentsByDate: (date) => appointments.filter(a => a.appointment_date === date)
  };
};