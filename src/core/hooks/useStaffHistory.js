import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { useArchiveManager } from './useArchiveManager';

export const useStaffHistory = () => {
  const { isStaff, isAdmin, profile } = useAuth();
  const archiveManager = useArchiveManager();
  
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set());

  // Get current clinic ID for staff scoping
  const clinicId = useMemo(() => {
    if (isStaff()) {
      return profile?.role_specific_data?.clinic_id;
    }
    return null;
  }, [isStaff, profile]);

  // Fetch staff appointment history with comprehensive filtering
  const fetchHistory = useCallback(async (filters = {}) => {
    if (!isStaff() && !isAdmin()) {
      const errorMsg = 'Access denied: Staff or Admin required';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      setLoading(true);
      setError(null);

    const {
      status = null,
      dateFrom = null,
      dateTo = null,
      patientSearch = null,
      limit = 100,
      offset = 0,
      sortBy = 'appointment_date',
      sortOrder = 'desc'
    } = filters;

      const { data, error: rpcError } = await supabase.rpc('get_user_appointments', {
        p_status: status ? [status] : null,
        p_date_from: dateFrom === '' ? null : dateFrom, 
        p_date_to: dateTo === '' ? null : dateTo,       
        p_limit: limit,
        p_offset: offset
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch appointment history');
      }

      let fetchedAppointments = data.data?.appointments || [];

      // Client-side patient search if provided
      if (patientSearch?.trim()) {
        const searchTerm = patientSearch.toLowerCase().trim();
        fetchedAppointments = fetchedAppointments.filter(apt => 
          apt.patient?.name?.toLowerCase().includes(searchTerm) ||
          apt.patient?.email?.toLowerCase().includes(searchTerm)
        );
      }

      // Client-side sorting
      fetchedAppointments.sort((a, b) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];
        
        if (sortOrder === 'desc') {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        } else {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        }
      });

      setAppointments(fetchedAppointments);

      return {
        success: true,
        appointments: fetchedAppointments,
        totalCount: data.data?.total_count || fetchedAppointments.length,
        hasMore: (offset + limit) < (data.data?.total_count || 0)
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch appointment history';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [isStaff, isAdmin]);

  // Archive single appointment
  const archiveAppointment = useCallback(async (appointmentId) => {
    try {
      setLoading(true);
      const result = await archiveManager.archiveClinicAppointment(appointmentId);
      
      if (result.success) {
        // Remove from current list
        setAppointments(prev => prev.filter(apt => apt.id !== appointmentId));
        setSelectedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(appointmentId);
          return newSet;
        });
      }
      
      return result;
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [archiveManager]);

  // Archive multiple appointments
  const archiveSelectedAppointments = useCallback(async () => {
    if (selectedItems.size === 0) {
      return { success: false, error: 'No items selected' };
    }

    try {
      setLoading(true);
      const appointmentIds = Array.from(selectedItems);
      
      const result = await archiveManager.archiveMultipleAppointments(appointmentIds);
      
      if (result.success) {
        // Remove archived items from current list
        setAppointments(prev => 
          prev.filter(apt => !selectedItems.has(apt.id))
        );
        setSelectedItems(new Set());
      }
      
      return result;
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [selectedItems, archiveManager]);

  // Delete appointment (permanent)
  const deleteAppointment = useCallback(async (appointmentId) => {
    if (!isAdmin()) {
      return { success: false, error: 'Delete operation requires admin privileges' };
    }

    try {
      setLoading(true);
      
      // For permanent deletion, use Supabase direct delete
      const { error: deleteError } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      // Remove from current list
      setAppointments(prev => prev.filter(apt => apt.id !== appointmentId));
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(appointmentId);
        return newSet;
      });

      return { success: true, message: 'Appointment permanently deleted' };

    } catch (error) {
      const errorMessage = error.message || 'Failed to delete appointment';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Selection management
  const toggleSelection = useCallback((appointmentId) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(appointmentId)) {
        newSet.delete(appointmentId);
      } else {
        newSet.add(appointmentId);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedItems(new Set(appointments.map(apt => apt.id)));
  }, [appointments]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  // Computed values
  const stats = useMemo(() => {
    const total = appointments.length;
    const byStatus = appointments.reduce((acc, apt) => {
      acc[apt.status] = (acc[apt.status] || 0) + 1;
      return acc;
    }, {});

    const thisMonth = appointments.filter(apt => {
      const aptDate = new Date(apt.appointment_date);
      const now = new Date();
      return aptDate.getMonth() === now.getMonth() && 
            aptDate.getFullYear() === now.getFullYear();
    }).length;

    return {
      total,
      thisMonth,
      byStatus,
      selectedCount: selectedItems.size,
      hasSelection: selectedItems.size > 0,
      allSelected: selectedItems.size === total && total > 0
    };
  }, [appointments, selectedItems]);

  return {
    // State
    appointments,
    loading: loading || archiveManager.loading,
    error: error || archiveManager.error,
    stats,
    
    // Selection
    selectedItems,
    toggleSelection,
    selectAll,
    clearSelection,
    
    // Actions
    fetchHistory,
    archiveAppointment,
    archiveSelectedAppointments,
    deleteAppointment,
    
    // Computed
    hasAppointments: appointments.length > 0,
    canDelete: isAdmin(),
    canArchive: isStaff() || isAdmin(),
    clinicId
  };
};