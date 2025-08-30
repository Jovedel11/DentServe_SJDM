import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../auth/context/AuthProvider';
import { supabase } from '../../lib/supabaseClient';

export const useStaffAppointments = () => {
  const { user, profile, isStaff } = useAuth();
  
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

  // ENHANCED: Fetch appointments with comprehensive filtering
  const fetchAppointments = useCallback(async (filters = {}) => {
    if (!isStaff()) {
      return { success: false, error: 'Access denied: Staff only' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .rpc('get_appointments_by_role', {
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
      setAppointments(appointmentData.appointments || []);
      
      // Update stats
      setStats({
        total: appointmentData.total_count || 0,
        pending: appointmentData.pending_count || 0,
        confirmed: appointmentData.appointments?.filter(a => a.status === 'confirmed').length || 0,
        completed: appointmentData.appointments?.filter(a => a.status === 'completed').length || 0,
        cancelled: appointmentData.appointments?.filter(a => a.status === 'cancelled').length || 0
      });

      return {
        success: true,
        appointments: appointmentData.appointments,
        totalCount: appointmentData.total_count,
        pendingCount: appointmentData.pending_count
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch appointments';
      setError(errorMessage);
      console.error('Fetch appointments error:', err);
      
      return { 
        success: false, 
        error: errorMessage,
        appointments: [], 
        totalCount: 0 
      };
    } finally {
      setIsLoading(false);
    }
  }, [isStaff]);

  // ENHANCED: Approve with optimistic updates
  const approveAppointment = useCallback(async (appointmentId, staffNotes = '') => {
    if (!appointmentId) {
      return { success: false, error: 'Appointment ID required' };
    }

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .rpc('approve_appointment', {
          p_appointment_id: appointmentId,
          p_staff_notes: staffNotes
        });

      if (error) throw new Error(error.message);

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to approve appointment');
      }

      // Optimistic update
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
        message: data.message,
        appointmentId: appointmentId,
        patientName: data.patient_name
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to approve appointment';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ENHANCED: Reject with validation
  const rejectAppointment = useCallback(async (appointmentId, rejectionReason) => {
    if (!appointmentId || !rejectionReason?.trim()) {
      return { success: false, error: 'Appointment ID and rejection reason are required' };
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .rpc('reject_appointment', {
          p_appointment_id: appointmentId,
          p_rejection_reason: rejectionReason.trim()
        });

      if (error) throw new Error(error.message);

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to reject appointment');
      }

      // Optimistic update
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId 
            ? { 
                ...apt, 
                status: 'cancelled',
                cancellation_reason: rejectionReason,
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
        message: data.message,
        appointmentId: appointmentId,
        patientName: data.patient_name
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to reject appointment';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ENHANCED: Complete appointment
  const completeAppointment = useCallback(async (appointmentId, completionNotes = '') => {
    if (!appointmentId) {
      return { success: false, error: 'Appointment ID required' };
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .rpc('complete_appointment', {
          p_appointment_id: appointmentId,
          p_completion_notes: completionNotes
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
        message: data.message,
        appointmentId: appointmentId
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to complete appointment';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    if (isStaff()) {
      fetchAppointments();
    }
  }, [isStaff, fetchAppointments]);

  return {
    // Data
    appointments,
    isLoading,
    error,
    stats,

    // Actions
    fetchAppointments,    // Returns: { success, appointments, totalCount, pendingCount }
    approveAppointment,   // Returns: { success, message, appointmentId, patientName }
    rejectAppointment,    // Returns: { success, message, appointmentId, patientName }
    completeAppointment,  // Returns: { success, message, appointmentId }

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