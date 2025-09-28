import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { useArchive } from './useArchive';

/**
 * Staff-specific Archive Management Hook
 * Handles clinic-scoped archive operations for staff members
 */
export const useStaffArchive = () => {
  const { user, profile, isStaff, isAdmin } = useAuth();
  const archive = useArchive();
  
  const [archivedData, setArchivedData] = useState({
    appointments: [],
    feedback: [],
    communications: [],
    notifications: []
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const clinicId = useMemo(() => {
    return profile?.role_specific_data?.clinic_id;
  }, [profile]);

  // ✅ OPTIMIZED: Fetch clinic archived data
  const fetchArchivedData = useCallback(async (forceRefresh = false) => {
    if (!isStaff && !isAdmin) return { success: false, error: 'Access denied' };
    if (!forceRefresh && loading) return;

    try {
      setLoading(true);
      setError(null);

      const scopeOptions = { scopeOverride: 'clinic' };

      const [appointmentsResult, feedbackResult, communicationsResult, notificationsResult] = await Promise.allSettled([
        archive.listArchived('clinic_appointment', scopeOptions),
        archive.listArchived('clinic_feedback', scopeOptions),
        archive.listArchived('patient_communication', scopeOptions),
        archive.listArchived('staff_notification', scopeOptions)
      ]);

      const newArchivedData = {
        appointments: appointmentsResult.status === 'fulfilled' && appointmentsResult.value.success
          ? appointmentsResult.value.data
          : [],
        feedback: feedbackResult.status === 'fulfilled' && feedbackResult.value.success
          ? feedbackResult.value.data
          : [],
        communications: communicationsResult.status === 'fulfilled' && communicationsResult.value.success
          ? communicationsResult.value.data
          : [],
        notifications: notificationsResult.status === 'fulfilled' && notificationsResult.value.success
          ? notificationsResult.value.data
          : []
      };

      setArchivedData(newArchivedData);

      return {
        success: true,
        data: newArchivedData
      };

    } catch (err) {
      const errorMsg = err.message || 'Failed to fetch archived data';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [isStaff, isAdmin, loading, archive]);

  // ✅ ENHANCED: Archive with clinic scope
  const archiveWithClinicScope = useCallback(async (itemType, itemId, itemData = null) => {
    if (!clinicId) {
      return { success: false, error: 'No clinic associated with staff member' };
    }

    try {
      const scopeOptions = { scopeOverride: 'clinic' };
      
      // Optimistic update
      if (itemData) {
        const archiveType = itemType.startsWith('clinic_') ? itemType.replace('clinic_', '') : itemType;
        setArchivedData(prev => ({
          ...prev,
          [archiveType]: [...prev[archiveType], { item_id: itemId, ...itemData, archived_at: new Date().toISOString() }]
        }));
      }

      const result = await archive.archiveItem(itemType, itemId, scopeOptions);

      if (!result.success && itemData) {
        // Rollback optimistic update
        const archiveType = itemType.startsWith('clinic_') ? itemType.replace('clinic_', '') : itemType;
        setArchivedData(prev => ({
          ...prev,
          [archiveType]: prev[archiveType].filter(item => item.item_id !== itemId)
        }));
      }

      return result;

    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [clinicId, archive]);

  // ✅ ENHANCED: Batch archive operations for staff
  const batchArchiveAppointments = useCallback(async (appointmentIds) => {
    if (!clinicId) {
      return { success: false, error: 'No clinic associated with staff member' };
    }

    try {
      const scopeOptions = { scopeOverride: 'clinic' };
      const result = await archive.archiveItems('clinic_appointment', appointmentIds, scopeOptions);
      
      if (result.success) {
        await fetchArchivedData(true);
      }
      
      return result;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [clinicId, archive, fetchArchivedData]);

  // ✅ ENHANCED: Staff-specific unarchive
  const unarchiveWithClinicScope = useCallback(async (itemType, itemId) => {
    try {
      const scopeOptions = { scopeOverride: 'clinic' };
      const result = await archive.unarchiveItem(itemType, itemId, scopeOptions);
      
      if (result.success) {
        const archiveType = itemType.startsWith('clinic_') ? itemType.replace('clinic_', '') : itemType;
        setArchivedData(prev => ({
          ...prev,
          [archiveType]: prev[archiveType].filter(item => item.item_id !== itemId)
        }));
      }
      
      return result;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [archive]);

  // ✅ COMPUTED: Staff archive statistics
  const stats = useMemo(() => {
    const totalArchived = Object.values(archivedData).reduce((sum, items) => sum + items.length, 0);
    
    return {
      totalArchived,
      appointmentsArchived: archivedData.appointments.length,
      feedbackArchived: archivedData.feedback.length,
      communicationsArchived: archivedData.communications.length,
      notificationsArchived: archivedData.notifications.length,
      hasArchivedData: totalArchived > 0,
      clinicId,
      
      // Monthly breakdown
      thisMonth: (() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        let monthlyCount = 0;
        Object.values(archivedData).forEach(items => {
          monthlyCount += items.filter(item => {
            const archivedDate = new Date(item.archived_at);
            return archivedDate.getMonth() === currentMonth && 
                   archivedDate.getFullYear() === currentYear;
          }).length;
        });
        
        return monthlyCount;
      })()
    };
  }, [archivedData, clinicId]);

  // ✅ AUTO-FETCH: Load archived data on mount
  useEffect(() => {
    if ((isStaff || isAdmin) && clinicId) {
      fetchArchivedData();
    }
  }, [isStaff, isAdmin, clinicId]);

  return {
    // State
    archivedData,
    loading: loading || archive.loading,
    error: error || archive.error,
    stats,
    clinicId,

    // Actions
    fetchArchivedData,
    archiveAppointment: (id, data) => archiveWithClinicScope('clinic_appointment', id, data),
    archiveFeedback: (id, data) => archiveWithClinicScope('clinic_feedback', id, data),
    archiveCommunication: (id, data) => archiveWithClinicScope('patient_communication', id, data),
    archiveNotification: (id, data) => archiveWithClinicScope('staff_notification', id, data),
    
    unarchiveAppointment: (id) => unarchiveWithClinicScope('clinic_appointment', id),
    unarchiveFeedback: (id) => unarchiveWithClinicScope('clinic_feedback', id),
    unarchiveCommunication: (id) => unarchiveWithClinicScope('patient_communication', id),
    unarchiveNotification: (id) => unarchiveWithClinicScope('staff_notification', id),

    // Batch operations
    batchArchiveAppointments,

    // Utilities
    clearError: () => setError(null),
    refresh: () => fetchArchivedData(true),
    canArchive: !!(isStaff || isAdmin) && !!clinicId
  };
};