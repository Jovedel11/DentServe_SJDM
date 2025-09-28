import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { useArchive } from './useArchive';

/**
 * Patient-specific Archive Management Hook
 * Optimized for patient data archiving (appointments, feedback, notifications)
 */
export const usePatientArchive = () => {
  const { user, isPatient } = useAuth();
  const archive = useArchive();
  
  const [archivedData, setArchivedData] = useState({
    appointments: [],
    feedback: [],
    notifications: []
  });

  const [preferences, setPreferences] = useState({
    autoArchiveDays: 365,
    dataRetentionConsent: true,
    showArchived: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ✅ OPTIMIZED: Fetch all archived data
  const fetchArchivedData = useCallback(async (forceRefresh = false) => {
    if (!isPatient || (!forceRefresh && loading)) return;

    try {
      setLoading(true);
      setError(null);

      const [appointmentsResult, feedbackResult, notificationsResult] = await Promise.allSettled([
        archive.listArchived('appointment'),
        archive.listArchived('feedback'), 
        archive.listArchived('notification')
      ]);

      const newArchivedData = {
        appointments: appointmentsResult.status === 'fulfilled' && appointmentsResult.value.success
          ? appointmentsResult.value.data
          : [],
        feedback: feedbackResult.status === 'fulfilled' && feedbackResult.value.success
          ? feedbackResult.value.data
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
  }, [isPatient, loading, archive]);

  // ✅ ENHANCED: Archive with optimistic UI updates
  const archiveWithUpdate = useCallback(async (itemType, itemId, itemData = null) => {
    try {
      // Optimistic update
      if (itemData) {
        setArchivedData(prev => ({
          ...prev,
          [itemType]: [...prev[itemType], { item_id: itemId, ...itemData, archived_at: new Date().toISOString() }]
        }));
      }

      const result = await archive.archiveItem(itemType, itemId);

      if (!result.success) {
        // Rollback optimistic update
        if (itemData) {
          setArchivedData(prev => ({
            ...prev,
            [itemType]: prev[itemType].filter(item => item.item_id !== itemId)
          }));
        }
        return result;
      }

      // Refresh to get accurate server state
      await fetchArchivedData(true);
      return result;

    } catch (err) {
      // Rollback optimistic update
      if (itemData) {
        setArchivedData(prev => ({
          ...prev,
          [itemType]: prev[itemType].filter(item => item.item_id !== itemId)
        }));
      }
      return { success: false, error: err.message };
    }
  }, [archive, fetchArchivedData]);

  // ✅ ENHANCED: Unarchive with optimistic updates
  const unarchiveWithUpdate = useCallback(async (itemType, itemId) => {
    try {
      // Optimistic update
      setArchivedData(prev => ({
        ...prev,
        [itemType]: prev[itemType].filter(item => item.item_id !== itemId)
      }));

      const result = await archive.unarchiveItem(itemType, itemId);

      if (!result.success) {
        // Rollback - refresh from server
        await fetchArchivedData(true);
        return result;
      }

      return result;

    } catch (err) {
      // Rollback on error
      await fetchArchivedData(true);
      return { success: false, error: err.message };
    }
  }, [archive, fetchArchivedData]);

  // ✅ ENHANCED: Permanently delete with optimistic updates
  const deleteWithUpdate = useCallback(async (itemType, itemId) => {
    try {
      // Optimistic update
      setArchivedData(prev => ({
        ...prev,
        [itemType]: prev[itemType].filter(item => item.item_id !== itemId)
      }));

      const result = await archive.hideItem(itemType, itemId);

      if (!result.success) {
        // Rollback - refresh from server
        await fetchArchivedData(true);
        return result;
      }

      return result;

    } catch (err) {
      // Rollback on error
      await fetchArchivedData(true);
      return { success: false, error: err.message };
    }
  }, [archive, fetchArchivedData]);

  // ✅ COMPUTED: Statistics
  const stats = useMemo(() => {
    const totalArchived = archivedData.appointments.length + archivedData.feedback.length + archivedData.notifications.length;
    
    return {
      totalArchived,
      appointmentsArchived: archivedData.appointments.length,
      feedbackArchived: archivedData.feedback.length,
      notificationsArchived: archivedData.notifications.length,
      hasArchivedData: totalArchived > 0,
      
      // Recent archives (last 7 days)
      recentArchives: (() => {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        let recent = 0;
        
        Object.values(archivedData).forEach(items => {
          recent += items.filter(item => 
            new Date(item.archived_at) > sevenDaysAgo
          ).length;
        });
        
        return recent;
      })()
    };
  }, [archivedData]);

  // ✅ ENHANCED: Bulk operations
  const bulkArchive = useCallback(async (operations) => {
    const results = [];
    
    for (const { itemType, itemId, itemData } of operations) {
      try {
        const result = await archiveWithUpdate(itemType, itemId, itemData);
        results.push({ itemType, itemId, ...result });
      } catch (err) {
        results.push({ itemType, itemId, success: false, error: err.message });
      }
    }
    
    return {
      success: results.every(r => r.success),
      results,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length
    };
  }, [archiveWithUpdate]);

  // ✅ AUTO-FETCH: Load archived data on mount
  useEffect(() => {
    if (user && isPatient) {
      fetchArchivedData();
    }
  }, [user, isPatient]);

  // ✅ SYNC: Update from archive hook stats
  useEffect(() => {
    if (archive.stats) {
      setPreferences(prev => ({
        ...prev,
        autoArchiveDays: archive.stats.preferences?.auto_archive_days || 365,
        dataRetentionConsent: archive.stats.preferences?.data_retention_consent !== false
      }));
    }
  }, [archive.stats]);

  return {
    // State
    archivedData,
    preferences,
    loading: loading || archive.loading,
    error: error || archive.error,
    stats,

    // Actions
    fetchArchivedData,
    archiveAppointment: (id, data) => archiveWithUpdate('appointment', id, data),
    archiveFeedback: (id, data) => archiveWithUpdate('feedback', id, data),
    archiveNotification: (id, data) => archiveWithUpdate('notification', id, data),
    
    unarchiveAppointment: (id) => unarchiveWithUpdate('appointment', id),
    unarchiveFeedback: (id) => unarchiveWithUpdate('feedback', id),
    unarchiveNotification: (id) => unarchiveWithUpdate('notification', id),
    
    deleteAppointment: (id) => deleteWithUpdate('appointment', id),
    deleteFeedback: (id) => deleteWithUpdate('feedback', id),
    deleteNotification: (id) => deleteWithUpdate('notification', id),

    // Bulk operations
    bulkArchive,

    // Utilities
    toggleShowArchived: () => setPreferences(prev => ({ ...prev, showArchived: !prev.showArchived })),
    clearError: () => setError(null),
    refresh: () => fetchArchivedData(true)
  };
};