import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

/**
 * Core Archive Management Hook
 * Provides unified archive functionality across all data types
 */
export const useArchive = () => {
  const { user, profile, isPatient, isStaff, isAdmin } = useAuth();
  
  const [state, setState] = useState({
    loading: false,
    error: null,
    permissions: null,
    stats: null
  });

  // ✅ OPTIMIZED: Generic RPC call wrapper with proper error handling
  const callArchiveRPC = useCallback(async (functionName, params) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      console.log(`🔄 Calling ${functionName} with params:`, params);

      const { data, error: rpcError } = await supabase.rpc(functionName, params);

      if (rpcError) {
        console.error('❌ RPC Error:', rpcError);
        throw new Error(rpcError.message || `Failed to execute ${functionName}`);
      }

      // ✅ FIXED: Handle authentication response
      if (data?.authenticated === false) {
        throw new Error('Authentication required');
      }

      // ✅ CORRECTED: Check success properly
      if (!data || !data.success) {
        console.error('❌ Operation failed:', data);
        throw new Error(data?.error || `Operation ${functionName} failed`);
      }

      console.log('✅ Archive RPC success:', data);
      return data;

    } catch (err) {
      const errorMessage = err.message || `Unknown error during ${functionName}`;
      setState(prev => ({ ...prev, error: errorMessage }));
      console.error(`❌ Archive ${functionName} error:`, err);
      throw err;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  // ✅ ENHANCED: Role-based function selection
  const getArchiveFunction = useCallback(() => {
    if (isPatient) {
      return 'manage_patient_archives';
    } else if (isStaff || isAdmin) {
      return 'manage_user_archives';
    }
    throw new Error('Invalid user role for archive operations');
  }, [isPatient, isStaff, isAdmin]);

  // ✅ CORE: Archive single item
  const archiveItem = useCallback(async (itemType, itemId, options = {}) => {
    if (!itemType || !itemId) {
      throw new Error('Item type and ID are required');
    }

    const functionName = getArchiveFunction();
    const baseParams = {
      p_action: 'archive',
      p_item_type: itemType,
      p_item_id: itemId
    };

    // ✅ ENHANCED: Add role-specific parameters
    const params = isPatient 
      ? baseParams
      : { ...baseParams, p_scope_override: options.scopeOverride || null };

    return await callArchiveRPC(functionName, params);
  }, [callArchiveRPC, getArchiveFunction, isPatient]);

  // ✅ CORE: Archive multiple items
  const archiveItems = useCallback(async (itemType, itemIds, options = {}) => {
    if (!itemType || !Array.isArray(itemIds) || itemIds.length === 0) {
      throw new Error('Item type and non-empty array of IDs are required');
    }

    const functionName = getArchiveFunction();
    const baseParams = {
      p_action: 'archive',
      p_item_type: itemType,
      p_item_ids: itemIds
    };

    const params = isPatient 
      ? baseParams
      : { ...baseParams, p_scope_override: options.scopeOverride || null };

    return await callArchiveRPC(functionName, params);
  }, [callArchiveRPC, getArchiveFunction, isPatient]);

  // ✅ CORE: Unarchive item
  const unarchiveItem = useCallback(async (itemType, itemId, options = {}) => {
    if (!itemType || !itemId) {
      throw new Error('Item type and ID are required');
    }

    const functionName = getArchiveFunction();
    const baseParams = {
      p_action: 'unarchive',
      p_item_type: itemType,
      p_item_id: itemId
    };

    const params = isPatient 
      ? baseParams
      : { ...baseParams, p_scope_override: options.scopeOverride || null };

    return await callArchiveRPC(functionName, params);
  }, [callArchiveRPC, getArchiveFunction, isPatient]);

  // ✅ CORE: Hide item (permanent delete from user view)
  const hideItem = useCallback(async (itemType, itemId, options = {}) => {
    if (!itemType || !itemId) {
      throw new Error('Item type and ID are required');
    }

    const functionName = getArchiveFunction();
    const baseParams = {
      p_action: 'hide',
      p_item_type: itemType,
      p_item_id: itemId
    };

    const params = isPatient 
      ? baseParams
      : { ...baseParams, p_scope_override: options.scopeOverride || null };

    return await callArchiveRPC(functionName, params);
  }, [callArchiveRPC, getArchiveFunction, isPatient]);

  // ✅ ENHANCED: List archived items with proper filtering
  const listArchived = useCallback(async (itemType = null, options = {}) => {
    try {
      const functionName = getArchiveFunction();
      const baseParams = {
        p_action: 'list_archived',
        p_item_type: itemType
      };

      const params = isPatient 
        ? baseParams
        : { ...baseParams, p_scope_override: options.scopeOverride || null };

      const result = await callArchiveRPC(functionName, params);
      return result;
    } catch (error) {
      console.error('❌ Failed to list archived items:', error);
      return { success: false, error: error.message, data: [] };
    }
  }, [callArchiveRPC, getArchiveFunction, isPatient]);

  // ✅ ENHANCED: List hidden items
  const listHidden = useCallback(async (itemType = null, options = {}) => {
    try {
      const functionName = getArchiveFunction();
      const baseParams = {
        p_action: 'list_hidden',
        p_item_type: itemType
      };

      const params = isPatient 
        ? baseParams
        : { ...baseParams, p_scope_override: options.scopeOverride || null };

      const result = await callArchiveRPC(functionName, params);
      return result;
    } catch (error) {
      console.error('❌ Failed to list hidden items:', error);
      return { success: false, error: error.message, data: [] };
    }
  }, [callArchiveRPC, getArchiveFunction, isPatient]);

  // ✅ ENHANCED: Get archive statistics
  const getStats = useCallback(async () => {
    try {
      const functionName = getArchiveFunction();
      const params = { p_action: 'get_stats' };

      const result = await callArchiveRPC(functionName, params);
      if (result.success) {
        setState(prev => ({ ...prev, stats: result.data }));
      }
      return result;
    } catch (error) {
      console.error('❌ Failed to get archive stats:', error);
      return { success: false, error: error.message };
    }
  }, [callArchiveRPC, getArchiveFunction]);

  // ✅ ENHANCED: Get user permissions
  const getPermissions = useCallback(async () => {
    if (isPatient) {
      // Patient permissions are static
      return {
        success: true,
        data: {
          role: 'patient',
          allowed_item_types: ['appointment', 'feedback', 'notification'],
          scope_type: 'personal',
          capabilities: {
            can_archive_own_data: true,
            can_view_shared_archives: true,
            can_cascade_delete: false
          }
        }
      };
    }

    try {
      const result = await callArchiveRPC('manage_user_archives', {
        p_action: 'get_permissions'
      });
      
      if (result.success) {
        setState(prev => ({ ...prev, permissions: result.data }));
      }
      return result;
    } catch (error) {
      console.error('❌ Failed to get permissions:', error);
      return { success: false, error: error.message };
    }
  }, [callArchiveRPC, isPatient]);

  // ✅ ENHANCED: Validate permissions before operations
  const validatePermission = useCallback(async (itemType, itemId) => {
    try {
      const { data, error } = await supabase.rpc('validate_archive_permissions', {
        p_user_id: user?.id,
        p_user_role: isPatient ? 'patient' : isStaff ? 'staff' : 'admin',
        p_clinic_id: profile?.role_specific_data?.clinic_id || null,
        p_item_type: itemType,
        p_item_id: itemId
      });

      if (error) throw error;
      return { success: true, hasPermission: data };
    } catch (error) {
      console.error('❌ Permission validation failed:', error);
      return { success: false, error: error.message, hasPermission: false };
    }
  }, [user, isPatient, isStaff, profile]);

  // ✅ ENHANCED: Batch permission validation
  const validateBatchPermissions = useCallback(async (itemType, itemIds) => {
    try {
      const { data, error } = await supabase.rpc('validate_batch_archive_permissions', {
        p_user_id: user?.id,
        p_user_role: isPatient ? 'patient' : isStaff ? 'staff' : 'admin',
        p_clinic_id: profile?.role_specific_data?.clinic_id || null,
        p_item_type: itemType,
        p_item_ids: itemIds
      });

      if (error) throw error;
      return { success: true, validItems: data || [] };
    } catch (error) {
      console.error('❌ Batch permission validation failed:', error);
      return { success: false, error: error.message, validItems: [] };
    }
  }, [user, isPatient, isStaff, profile]);

  // ✅ COMPUTED: Archive capabilities
  const capabilities = useMemo(() => {
    return {
      canArchive: !!(user && (isPatient || isStaff || isAdmin)),
      canUnarchive: !!(user && (isPatient || isStaff || isAdmin)),
      canHide: !!(user && (isPatient || isStaff || isAdmin)),
      canViewStats: !!(user && (isPatient || isStaff || isAdmin)),
      canManagePreferences: isPatient || isAdmin,
      supportedTypes: isPatient 
        ? ['appointment', 'feedback', 'notification']
        : isStaff 
        ? ['appointment', 'feedback', 'notification', 'clinic_appointment', 'clinic_feedback', 'staff_notification', 'patient_communication']
        : ['appointment', 'feedback', 'notification', 'clinic_appointment', 'clinic_feedback', 'staff_notification', 'patient_communication', 'user_account', 'clinic_account', 'system_notification', 'analytics_data', 'partnership_request']
    };
  }, [user, isPatient, isStaff, isAdmin]);

  // ✅ AUTO-LOAD: Fetch permissions and stats on mount
  useEffect(() => {
    if (user && (isPatient || isStaff || isAdmin)) {
      Promise.all([
        getPermissions().catch(err => console.warn('Failed to load permissions:', err)),
        getStats().catch(err => console.warn('Failed to load stats:', err))
      ]);
    }
  }, [user, isPatient, isStaff, isAdmin]);

  return {
    // State
    loading: state.loading,
    error: state.error,
    permissions: state.permissions,
    stats: state.stats,
    capabilities,

    // Core operations
    archiveItem,
    archiveItems,
    unarchiveItem,
    hideItem,
    listArchived,
    listHidden,
    getStats,
    getPermissions,

    // Validation
    validatePermission,
    validateBatchPermissions,

    // Convenience methods for specific types
    archiveAppointment: (id, opts) => archiveItem('appointment', id, opts),
    archiveFeedback: (id, opts) => archiveItem('feedback', id, opts),
    archiveNotification: (id, opts) => archiveItem('notification', id, opts),
    
    // Staff-specific conveniences
    archiveClinicAppointment: (id, opts) => archiveItem('clinic_appointment', id, opts),
    archiveClinicFeedback: (id, opts) => archiveItem('clinic_feedback', id, opts),
    archivePatientCommunication: (id, opts) => archiveItem('patient_communication', id, opts),

    // Admin-specific conveniences
    archiveUserAccount: (id, opts) => archiveItem('user_account', id, opts),
    archiveClinicAccount: (id, opts) => archiveItem('clinic_account', id, opts),
    archiveSystemNotification: (id, opts) => archiveItem('system_notification', id, opts),

    // Batch operations
    archiveMultipleAppointments: (ids, opts) => archiveItems('appointment', ids, opts),
    archiveMultipleNotifications: (ids, opts) => archiveItems('notification', ids, opts),

    // Utilities
    clearError: () => setState(prev => ({ ...prev, error: null })),
    refresh: () => Promise.all([getPermissions(), getStats()]),
    isLoading: state.loading,
    hasError: !!state.error
  };
};