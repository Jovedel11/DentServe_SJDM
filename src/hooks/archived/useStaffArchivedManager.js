import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';


export const useStaffArchiveManager = () => {
  const { user, profile, isStaff, isAdmin } = useAuth();
  
  const [state, setState] = useState({
    loading: false,
    error: null,
    archivedAppointments: [],
    stats: {
      appointmentsArchived: 0,
    },
  });

  const clinicId = profile?.role_specific_data?.clinic_id;

  // ✅ Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // ✅ Get archive stats
  const fetchStats = useCallback(async () => {
    if (!clinicId) return;

    try {
      const { data, error } = await supabase.rpc('manage_user_archives', {
        p_action: 'get_stats',
        p_item_type: 'clinic_appointment',
        p_item_id: null,
        p_item_ids: null,
        p_scope_override: 'clinic',
      });

      if (error) throw error;

      if (data?.success) {
        setState(prev => ({
          ...prev,
          stats: {
            appointmentsArchived: data.data?.archived_counts?.clinic_appointments || 0,
          },
        }));
      }
    } catch (err) {
      console.error('Failed to load archive stats:', err);
    }
  }, [clinicId]);

  // ✅ Fetch archived appointments with CORRECT relationships
  const fetchArchivedAppointments = useCallback(async () => {
    if (!clinicId) return { success: false, error: 'No clinic ID' };

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      console.log('🔄 Fetching archived appointments for clinic:', clinicId);

      // Step 1: Get archived item IDs
      const { data: archiveData, error: archiveError } = await supabase.rpc(
        'manage_user_archives',
        {
          p_action: 'list_archived',
          p_item_type: 'clinic_appointment',
          p_item_id: null,
          p_item_ids: null,
          p_scope_override: 'clinic',
        }
      );

      if (archiveError) throw archiveError;

      if (!archiveData?.success || !archiveData?.data || archiveData.data.length === 0) {
        console.log('✅ No archived appointments found');
        setState(prev => ({
          ...prev,
          loading: false,
          archivedAppointments: [],
        }));
        return { success: true, data: [] };
      }

      const appointmentIds = archiveData.data.map(item => item.item_id);
      console.log('📋 Found archived appointment IDs:', appointmentIds);

      // Step 2: Fetch full appointment details with CORRECT relationships
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:users!appointments_patient_id_fkey (
            id,
            email,
            phone,
            user_profiles (
              id,
              first_name,
              last_name
            )
          ),
          doctor:doctors (
            id,
            first_name,
            last_name,
            specialization
          ),
          clinic:clinics (
            id,
            name,
            address
          ),
          services:appointment_services (
            service:services (
              id,
              name,
              duration_minutes,
              category
            )
          )
        `)
        .in('id', appointmentIds)
        .eq('clinic_id', clinicId);

      if (appointmentsError) throw appointmentsError;

      console.log('✅ Fetched archived appointments:', appointments);

      // Step 3: Transform the data
      const transformedAppointments = appointments.map(apt => ({
        ...apt,
        patient: {
          id: apt.patient?.user_profiles?.id,
          name: apt.patient?.user_profiles 
            ? `${apt.patient.user_profiles.first_name || ''} ${apt.patient.user_profiles.last_name || ''}`.trim()
            : 'Unknown Patient',
          email: apt.patient?.email || '',
          phone: apt.patient?.phone || '',
        },
        doctor: apt.doctor 
          ? {
              id: apt.doctor.id,
              name: `${apt.doctor.first_name || ''} ${apt.doctor.last_name || ''}`.trim(),
              specialization: apt.doctor.specialization,
            }
          : { name: 'Unassigned' },
        services: apt.services?.map(s => s.service).filter(Boolean) || [],
      }));

      setState(prev => ({
        ...prev,
        loading: false,
        archivedAppointments: transformedAppointments,
      }));

      return { success: true, data: transformedAppointments };

    } catch (err) {
      console.error('❌ Failed to load archived appointments:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: err.message,
      }));
      return { success: false, error: err.message };
    }
  }, [clinicId]);

  // ✅ Archive single appointment
  const archiveAppointment = useCallback(async (appointmentId) => {
    if (!clinicId) return { success: false, error: 'No clinic ID' };

    setState(prev => ({ ...prev, loading: true }));

    try {
      const { data, error } = await supabase.rpc('manage_user_archives', {
        p_action: 'archive',
        p_item_type: 'clinic_appointment',
        p_item_id: appointmentId,
        p_item_ids: null,
        p_scope_override: 'clinic',
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Archive failed');

      setState(prev => ({ ...prev, loading: false }));
      
      // Refresh stats
      await fetchStats();

      return { success: true };
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err.message }));
      return { success: false, error: err.message };
    }
  }, [clinicId, fetchStats]);

  // ✅ Archive multiple appointments
  const archiveAppointments = useCallback(async (appointmentIds) => {
    if (!clinicId) return { success: false, error: 'No clinic ID' };
    if (!appointmentIds || appointmentIds.length === 0) {
      return { success: false, error: 'No appointment IDs provided' };
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      const { data, error } = await supabase.rpc('manage_user_archives', {
        p_action: 'archive',
        p_item_type: 'clinic_appointment',
        p_item_id: null,
        p_item_ids: appointmentIds,
        p_scope_override: 'clinic',
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Bulk archive failed');

      setState(prev => ({ ...prev, loading: false }));
      
      // Refresh stats
      await fetchStats();

      return { success: true, count: appointmentIds.length };
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err.message }));
      return { success: false, error: err.message };
    }
  }, [clinicId, fetchStats]);

  // ✅ Unarchive appointment
  const unarchiveAppointment = useCallback(async (appointmentId) => {
    if (!clinicId) return { success: false, error: 'No clinic ID' };

    setState(prev => ({ ...prev, loading: true }));

    try {
      const { data, error } = await supabase.rpc('manage_user_archives', {
        p_action: 'unarchive',
        p_item_type: 'clinic_appointment',
        p_item_id: appointmentId,
        p_item_ids: null,
        p_scope_override: 'clinic',
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Unarchive failed');

      setState(prev => ({ ...prev, loading: false }));
      
      // Refresh archived list and stats
      await fetchArchivedAppointments();
      await fetchStats();

      return { success: true };
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err.message }));
      return { success: false, error: err.message };
    }
  }, [clinicId, fetchArchivedAppointments, fetchStats]);

  // ✅ Delete appointment permanently (admin only)
  const deleteAppointment = useCallback(async (appointmentId) => {
    if (!isAdmin) return { success: false, error: 'Admin access required' };

    setState(prev => ({ ...prev, loading: true }));

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) throw error;

      setState(prev => ({ ...prev, loading: false }));
      
      // Refresh archived list and stats
      await fetchArchivedAppointments();
      await fetchStats();

      return { success: true };
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err.message }));
      return { success: false, error: err.message };
    }
  }, [isAdmin, fetchArchivedAppointments, fetchStats]);

  // ✅ Auto-load stats on mount
  useEffect(() => {
    if ((isStaff || isAdmin) && clinicId) {
      fetchStats();
    }
  }, [isStaff, isAdmin, clinicId, fetchStats]);

  return {
    // State
    ...state,
    clinicId,
    
    // Actions
    fetchStats,
    fetchArchivedAppointments,
    archiveAppointment,
    archiveAppointments,
    unarchiveAppointment,
    deleteAppointment,
    clearError,
    
    // Utilities
    refresh: fetchArchivedAppointments,
    canArchive: !!(isStaff || isAdmin) && !!clinicId,
    canDelete: isAdmin,
  };
};