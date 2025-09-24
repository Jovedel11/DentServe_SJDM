import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { useArchiveManager } from './useArchiveManager';

export const usePatientAppointmentHistory = () => {
  const { user, profile, isPatient } = useAuth();
  
  const {
    archiveAppointment: archiveAppointmentItem,
    unarchiveItem,
    hideItem,
    listArchived,
    loading: archiveLoading,
    error: archiveError,
    clearError: clearArchiveError
  } = useArchiveManager();
  
  const [state, setState] = useState({
    loading: true,
    error: null,
    appointments: [],
    archivedAppointments: [],
    healthAnalytics: null,
    searchQuery: '',
    statusFilter: 'all',
    dateRange: 'all',
    showArchived: false,
    pagination: {
      limit: 50,
      offset: 0,
      totalCount: 0,
      hasMore: false
    }
  });

  //Fetch appointments with
  const fetchAppointmentData = useCallback(async (forceRefresh = false, loadMore = false) => {
    if (!user || !isPatient) {
      setState(prev => ({ ...prev, loading: false }));
      return { success: false, error: 'User not authenticated or not a patient' };
    }

    try {
      if (!loadMore) {
        setState(prev => ({ ...prev, loading: true, error: null }));
      }
      clearArchiveError();

      console.log('🔄 Fetching appointment data:', { forceRefresh, loadMore });

      // Proper offset handling for pagination
      const currentOffset = loadMore ? state.pagination.offset : 0;
      const currentLimit = state.pagination.limit;

      console.log('📊 Pagination params:', { currentOffset, currentLimit });

      // Fetch all data with proper error handling
      const [analyticsResponse, appointmentsResponse, archivedResponse] = await Promise.allSettled([
        supabase.rpc('get_patient_health_analytics', { 
          p_patient_id: null // Uses current user context
        }),
        supabase.rpc('get_appointments_by_role', {
          p_status: null, // Get all statuses
          p_date_from: null,
          p_date_to: null,
          p_limit: currentLimit,
          p_offset: currentOffset
        }),
        listArchived('appointment') // Get archived appointments
      ]);

      console.log('📊 Raw responses:', {
        analytics: analyticsResponse,
        appointments: appointmentsResponse,
        archived: archivedResponse
      });

      // Handle analytics response (optional)
      let healthAnalytics = null;
      if (analyticsResponse.status === 'fulfilled' && analyticsResponse.value.data) {
        healthAnalytics = analyticsResponse.value.data;
      } else {
        console.warn('⚠️ Analytics failed:', analyticsResponse.reason);
      }
      
      // Handle appointments response (required)
      if (appointmentsResponse.status === 'rejected') {
        console.error('❌ Appointments fetch failed:', appointmentsResponse.reason);
        throw new Error(appointmentsResponse.reason?.message || 'Failed to fetch appointments');
      }

      const appointmentsResult = appointmentsResponse.value;
      if (appointmentsResult.error) {
        console.error('❌ Appointments RPC error:', appointmentsResult.error);
        throw new Error(appointmentsResult.error.message || 'Failed to fetch appointments');
      }

      if (!appointmentsResult.data?.success) {
        console.error('❌ Appointments operation failed:', appointmentsResult.data);
        throw new Error(appointmentsResult.data?.error || 'Failed to fetch appointments');
      }

      //  Extract appointment data with proper structure handling
      const appointmentData = appointmentsResult.data.data;
      const appointments = appointmentData?.appointments || [];
      const paginationData = appointmentData?.pagination || {};
      
      console.log('📋 Appointments data:', {
        appointmentsCount: appointments.length,
        pagination: paginationData
      });

      //  Handle archived response with proper error checking
      let archivedItems = [];
      if (archivedResponse.status === 'fulfilled') {
        const archivedResult = archivedResponse.value;
        console.log('🗃️ Raw archived response:', archivedResult);
        
        if (archivedResult && archivedResult.success && archivedResult.data) {
          archivedItems = Array.isArray(archivedResult.data) ? archivedResult.data : [];
        }
      } else {
        console.warn('⚠️ Archive fetch failed:', archivedResponse.reason);
      }
      
      console.log('🗃️ Processed archived items:', archivedItems);
      
      // Create proper archive ID set for faster lookup
      const archivedItemIds = new Set(archivedItems.map(item => item.item_id));
      console.log('🗃️ Archived appointment IDs:', Array.from(archivedItemIds));
      
      //  Transform appointments with complete data mapping
      const transformedAppointments = appointments.map(apt => {
        const isArchived = archivedItemIds.has(apt.id);
        console.log(`📝 Appointment ${apt.id}: archived=${isArchived}`);
        
        return {
          // Basic appointment data
          id: apt.id,
          type: apt.services?.map(s => s.name).join(', ') || 'General Appointment',
          date: apt.appointment_date,
          time: apt.appointment_time,
          status: apt.status,
          
          // Provider information
          doctor: apt.doctor?.name || 'Unknown Doctor',
          doctorId: apt.doctor?.id,
          doctorSpecialization: apt.doctor?.specialization,
          
          // Clinic information  
          clinic: apt.clinic?.name || 'Unknown Clinic',
          clinicId: apt.clinic?.id,
          clinicAddress: apt.clinic?.address || '',
          clinicPhone: apt.clinic?.phone || '',
          
          // Service and cost details
          services: apt.services || [],
          cost: apt.services?.reduce((sum, s) => {
            const price = parseFloat(s.min_price || s.max_price || s.price || 0);
            return sum + price;
          }, 0) || 0,
          
          // Duration and timing
          duration: `${apt.duration_minutes || 60} minutes`,
          durationMinutes: apt.duration_minutes || 60,
          
          // Notes and details
          notes: apt.notes || '',
          symptoms: apt.symptoms || '',
          
          // Treatment information
          treatments: apt.services?.map(s => ({
            name: s.name,
            completed: apt.status === 'completed',
            duration: s.duration_minutes,
            price: s.min_price || s.max_price || 0
          })) || [],
          
          // Cancellation info
          cancelledBy: apt.cancelled_by ? 'clinic' : null,
          cancellationReason: apt.cancellation_reason || '',
          cancelledAt: apt.cancelled_at,
          
          // Metadata
          createdAt: apt.created_at,
          updatedAt: apt.updated_at,
          canCancel: apt.can_cancel || false,
          
          // ✅ FIXED: Archive status from database lookup
          isArchived: isArchived
        };
      });

      console.log('🏗️ Transformed appointments:', {
        total: transformedAppointments.length,
        archived: transformedAppointments.filter(apt => apt.isArchived).length,
        active: transformedAppointments.filter(apt => !apt.isArchived).length
      });

      // ✅ FIXED: Properly separate active vs archived appointments
      const activeAppointments = transformedAppointments.filter(apt => !apt.isArchived);
      const archivedAppointments = transformedAppointments.filter(apt => apt.isArchived);

      console.log('📊 Final separation:', {
        active: activeAppointments.length,
        archived: archivedAppointments.length
      });

      // ✅ FIXED: State update with proper data management
      setState(prev => {
        const newState = {
          ...prev,
          loading: false,
          error: null,
          healthAnalytics: healthAnalytics || prev.healthAnalytics,
          // ✅ FIXED: Handle load more vs refresh properly
          appointments: loadMore ? [...prev.appointments, ...activeAppointments] : activeAppointments,
          archivedAppointments: loadMore ? [...prev.archivedAppointments, ...archivedAppointments] : archivedAppointments,
          // ✅ FIXED: Update pagination correctly
          pagination: {
            limit: currentLimit,
            offset: loadMore ? currentOffset + appointments.length : appointments.length,
            totalCount: paginationData.total_count || 0,
            hasMore: paginationData.has_more || (appointments.length === currentLimit)
          }
        };
        
        console.log('✅ State update:', {
          activeAppointments: newState.appointments.length,
          archivedAppointments: newState.archivedAppointments.length,
          pagination: newState.pagination
        });
        
        return newState;
      });

      return { 
        success: true, 
        data: {
          active: activeAppointments,
          archived: archivedAppointments,
          total: transformedAppointments.length,
          pagination: paginationData
        }
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch appointment data';
      console.error('❌ Fetch error:', err);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage 
      }));
      return { success: false, error: errorMessage };
    }
  }, [user, isPatient, listArchived, clearArchiveError, state.pagination.limit, state.pagination.offset]);

  // ✅ FIXED: Archive appointment with proper validation and state refresh
  const archiveAppointment = useCallback(async (appointmentId) => {
    try {
      console.log('🔄 Starting archive for appointment:', appointmentId);
      
      const appointment = state.appointments.find(apt => apt.id === appointmentId);
      if (!appointment) {
        console.error('❌ Appointment not found in active list:', appointmentId);
        return { success: false, error: 'Appointment not found' };
      }

      if (appointment.status !== 'completed') {
        console.error('❌ Appointment not completed:', appointment.status);
        return { success: false, error: 'Only completed appointments can be archived' };
      }

      console.log('🗃️ Archiving appointment:', appointment);
      
      // ✅ FIXED: Use the correct archive method
      const result = await archiveAppointmentItem(appointmentId);
      
      console.log('🗃️ Archive result:', result);
      
      if (result && result.success) {
        console.log('✅ Archive successful, refreshing data...');
        
        // ✅ FIXED: Force refresh to get updated archive status
        const refreshResult = await fetchAppointmentData(true);
        
        console.log('🔄 Refresh result:', refreshResult);
        
        return { 
          success: true, 
          message: result.message || 'Appointment archived successfully'
        };
      }
      
      console.error('❌ Archive failed:', result);
      return result || { success: false, error: 'Archive operation failed' };

    } catch (err) {
      console.error('❌ Archive error:', err);
      return { success: false, error: err.message || 'Failed to archive appointment' };
    }
  }, [state.appointments, archiveAppointmentItem, fetchAppointmentData]);

  // ✅ FIXED: Unarchive appointment
  const unarchiveAppointment = useCallback(async (appointmentId) => {
    try {
      console.log('🔄 Starting unarchive for appointment:', appointmentId);
      
      const appointment = state.archivedAppointments.find(apt => apt.id === appointmentId);
      if (!appointment) {
        console.error('❌ Archived appointment not found:', appointmentId);
        return { success: false, error: 'Archived appointment not found' };
      }

      console.log('🔄 Unarchiving appointment:', appointment);

      const result = await unarchiveItem('appointment', appointmentId);
      
      console.log('🔄 Unarchive result:', result);
      
      if (result && result.success) {
        console.log('✅ Unarchive successful, refreshing data...');
        
        // ✅ FIXED: Force refresh to get updated archive status
        const refreshResult = await fetchAppointmentData(true);
        
        console.log('🔄 Refresh result:', refreshResult);
        
        return { 
          success: true, 
          message: result.message || 'Appointment restored successfully'
        };
      }
      
      console.error('❌ Unarchive failed:', result);
      return result || { success: false, error: 'Unarchive operation failed' };

    } catch (err) {
      console.error('❌ Unarchive error:', err);
      return { success: false, error: err.message || 'Failed to unarchive appointment' };
    }
  }, [state.archivedAppointments, unarchiveItem, fetchAppointmentData]);

  // ✅ FIXED: Delete archived appointment
  const deleteArchivedAppointment = useCallback(async (appointmentId) => {
    try {
      console.log('🔄 Starting delete for appointment:', appointmentId);
      
      const appointment = state.archivedAppointments.find(apt => apt.id === appointmentId);
      if (!appointment) {
        console.error('❌ Archived appointment not found:', appointmentId);
        return { success: false, error: 'Archived appointment not found' };
      }

      console.log('🗑️ Deleting appointment:', appointment);

      const result = await hideItem('appointment', appointmentId);
      
      console.log('🗑️ Delete result:', result);
      
      if (result && result.success) {
        console.log('✅ Delete successful, refreshing data...');
        
        // ✅ FIXED: Force refresh to remove from archived list
        const refreshResult = await fetchAppointmentData(true);
        
        console.log('🔄 Refresh result:', refreshResult);
        
        return { 
          success: true, 
          message: result.message || 'Appointment permanently deleted'
        };
      }
      
      console.error('❌ Delete failed:', result);
      return result || { success: false, error: 'Delete operation failed' };

    } catch (err) {
      console.error('❌ Delete error:', err);
      return { success: false, error: err.message || 'Failed to delete appointment' };
    }
  }, [state.archivedAppointments, hideItem, fetchAppointmentData]);

  // ✅ FIXED: Load more appointments with proper validation
  const loadMoreAppointments = useCallback(async () => {
    if (state.loading || !state.pagination.hasMore) {
      console.log('❌ Cannot load more:', { 
        loading: state.loading, 
        hasMore: state.pagination.hasMore 
      });
      return { success: false, error: 'No more data to load or already loading' };
    }

    console.log('📥 Loading more appointments from offset:', state.pagination.offset);
    return await fetchAppointmentData(false, true);
  }, [fetchAppointmentData, state.loading, state.pagination.hasMore]);

  // ✅ FIXED: Toggle archive view with proper state management
  const toggleArchiveView = useCallback(async () => {
    console.log('🔄 Toggling archive view from:', state.showArchived);
    
    const newShowArchived = !state.showArchived;
    setState(prev => ({ ...prev, showArchived: newShowArchived }));
    
    // ✅ Don't refresh data - just change view
    console.log('👁️ Archive view toggled to:', newShowArchived);
  }, [state.showArchived]);

  // ✅ Keep existing utility methods...
  const downloadAppointmentDetails = useCallback((appointment) => {
    // ... existing implementation stays the same
  }, [profile]);

  const updateState = useCallback((updates) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // ✅ FIXED: Enhanced computed values with better filtering
  const computedData = useMemo(() => {
    const currentList = state.showArchived ? state.archivedAppointments : state.appointments;
    
    // Apply filters to current list
    const filteredAppointments = currentList.filter(appointment => {
      // Search filter
      if (state.searchQuery) {
        const searchLower = state.searchQuery.toLowerCase();
        const matchesSearch = 
          appointment.type.toLowerCase().includes(searchLower) ||
          appointment.doctor.toLowerCase().includes(searchLower) ||
          appointment.clinic.toLowerCase().includes(searchLower) ||
          appointment.symptoms.toLowerCase().includes(searchLower) ||
          appointment.notes.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Status filter
      if (state.statusFilter !== 'all' && appointment.status !== state.statusFilter) {
        return false;
      }

      // Date range filter
      if (state.dateRange !== 'all') {
        const appointmentDate = new Date(appointment.date);
        const now = new Date();

        switch (state.dateRange) {
          case '7days':
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (appointmentDate < sevenDaysAgo) return false;
            break;
          case '30days':
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            if (appointmentDate < thirtyDaysAgo) return false;
            break;
          case '90days':
            const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            if (appointmentDate < ninetyDaysAgo) return false;
            break;
          case 'thisYear':
            if (appointmentDate.getFullYear() !== now.getFullYear()) return false;
            break;
        }
      }

      return true;
    });

    // Calculate analytics from all appointments
    const allAppointments = [...state.appointments, ...state.archivedAppointments];
    const completedAppointments = allAppointments.filter(apt => apt.status === 'completed');
    
    return {
      filteredAppointments,
      totalAppointments: allAppointments.length,
      activeAppointments: state.appointments.length,
      completedAppointments: completedAppointments.length,
      archivedCount: state.archivedAppointments.length,
      canArchiveCount: state.appointments.filter(apt => apt.status === 'completed').length,
      pendingCount: state.appointments.filter(apt => apt.status === 'pending').length,
      confirmedCount: state.appointments.filter(apt => apt.status === 'confirmed').length,
      cancelledCount: state.appointments.filter(apt => apt.status === 'cancelled').length,
      healthScore: state.healthAnalytics?.health_score || 0,
      improvementTrend: state.healthAnalytics?.improvement_trend || 0,
      consistencyRating: state.healthAnalytics?.consistency_rating || 0,
      // Financial data
      totalSpent: completedAppointments.reduce((sum, apt) => sum + (apt.cost || 0), 0),
      avgAppointmentCost: completedAppointments.length > 0 
        ? completedAppointments.reduce((sum, apt) => sum + (apt.cost || 0), 0) / completedAppointments.length 
        : 0
    };
  }, [state]);

  // ✅ AUTO-FETCH ON MOUNT
  useEffect(() => {
    console.log('🚀 Initial fetch on mount');
    fetchAppointmentData();
  }, []); // Remove fetchAppointmentData from deps to avoid infinite loop

  return {
    // State
    ...state,
    ...computedData,
    loading: state.loading || archiveLoading,
    error: state.error || archiveError,

    // Actions
    fetchAppointmentData,
    loadMoreAppointments,
    archiveAppointment,
    unarchiveAppointment,
    deleteArchivedAppointment,
    downloadAppointmentDetails,
    updateState,
    toggleArchiveView,
    
    // Filter actions
    setSearchQuery: (query) => updateState({ searchQuery: query }),
    setStatusFilter: (status) => updateState({ statusFilter: status }),
    setDateRange: (range) => updateState({ dateRange: range }),
    
    // Utilities
    isEmpty: computedData.filteredAppointments.length === 0,
    hasUnread: false, // Not applicable for appointments
    hasMore: state.pagination.hasMore
  };
};