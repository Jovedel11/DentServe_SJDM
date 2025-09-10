// hooks/useArchiveManager.js - FULLY FIXED VERSION
import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient' 

export const useArchiveManager = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // ✅ Clear error helper
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // ✅ FIXED: Generic RPC call wrapper with proper error handling
  const callArchiveRPC = useCallback(async (action, params) => {
    setLoading(true)
    setError(null)

    try {
      // ✅ FIXED: Match your exact RPC signature
      const rpcParams = {
        p_action: action,
        p_item_type: params.itemType || null,
        p_item_id: params.itemId || null,
        p_item_ids: params.itemIds || null,
        p_scope_override: params.scopeOverride || null
      }

      console.log('🔄 Calling manage_user_archives with params:', rpcParams)

      const { data, error: rpcError } = await supabase.rpc('manage_user_archives', rpcParams)

      if (rpcError) {
        console.error('❌ RPC Error:', rpcError)
        throw new Error(rpcError.message || `Failed to ${action}`)
      }

      // ✅ FIXED: Your RPC returns data directly with success field
      if (!data || !data.success) {
        console.error('❌ Operation failed:', data)
        throw new Error(data?.error || `Operation ${action} failed`)
      }

      console.log('✅ Archive RPC success:', data)
      return data

    } catch (err) {
      const errorMessage = err.message || `Unknown error during ${action}`
      setError(errorMessage)
      console.error(`❌ Archive ${action} error:`, err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // ✅ FIXED: Archive single item with proper validation
  const archiveItem = useCallback(async (itemType, itemId, options = {}) => {
    if (!itemType || !itemId) {
      const error = new Error('Item type and ID are required')
      setError(error.message)
      throw error
    }

    console.log('🗃️ Archiving item:', { itemType, itemId, options })

    return await callArchiveRPC('archive', {
      itemType,
      itemId,
      scopeOverride: options.scopeOverride || null
    })
  }, [callArchiveRPC])

  // ✅ FIXED: Archive multiple items with validation
  const archiveItems = useCallback(async (itemType, itemIds, options = {}) => {
    if (!itemType || !Array.isArray(itemIds) || itemIds.length === 0) {
      const error = new Error('Item type and non-empty array of IDs are required')
      setError(error.message)
      throw error
    }

    console.log('🗃️ Archiving items:', { itemType, itemIds: itemIds.length, options })

    return await callArchiveRPC('archive', {
      itemType,
      itemIds,
      scopeOverride: options.scopeOverride || null
    })
  }, [callArchiveRPC])

  // ✅ FIXED: Unarchive item
  const unarchiveItem = useCallback(async (itemType, itemId, options = {}) => {
    if (!itemType || !itemId) {
      const error = new Error('Item type and ID are required')
      setError(error.message)
      throw error
    }

    console.log('🔄 Unarchiving item:', { itemType, itemId, options })

    return await callArchiveRPC('unarchive', {
      itemType,
      itemId,
      scopeOverride: options.scopeOverride || null
    })
  }, [callArchiveRPC])

  // ✅ FIXED: Hide item
  const hideItem = useCallback(async (itemType, itemId, options = {}) => {
    if (!itemType || !itemId) {
      const error = new Error('Item type and ID are required')
      setError(error.message)
      throw error
    }

    console.log('👁️ Hiding item:', { itemType, itemId, options })

    return await callArchiveRPC('hide', {
      itemType,
      itemId,
      scopeOverride: options.scopeOverride || null
    })
  }, [callArchiveRPC])

  // ✅ FIXED: List archived items with better error handling
  const listArchived = useCallback(async (itemType = null, options = {}) => {
    console.log('📋 Listing archived items:', { itemType, options })
    
    try {
      const result = await callArchiveRPC('list_archived', {
        itemType,
        scopeOverride: options.scopeOverride || null
      })
      
      console.log('📋 Archived items result:', result)
      return result
    } catch (error) {
      console.error('❌ Failed to list archived items:', error)
      return { success: false, error: error.message, data: [] }
    }
  }, [callArchiveRPC])

  // ✅ FIXED: List hidden items
  const listHidden = useCallback(async (itemType = null, options = {}) => {
    console.log('👁️ Listing hidden items:', { itemType, options })
    
    try {
      const result = await callArchiveRPC('list_hidden', {
        itemType,
        scopeOverride: options.scopeOverride || null
      })
      
      console.log('👁️ Hidden items result:', result)
      return result
    } catch (error) {
      console.error('❌ Failed to list hidden items:', error)
      return { success: false, error: error.message, data: [] }
    }
  }, [callArchiveRPC])

  // ✅ FIXED: Get permissions
  const getPermissions = useCallback(async () => {
    try {
      return await callArchiveRPC('get_permissions', {})
    } catch (err) {
      console.error('Failed to get archive permissions:', err)
      return { success: false, error: err.message }
    }
  }, [callArchiveRPC])

  // ✅ FIXED: Get stats
  const getStats = useCallback(async () => {
    try {
      return await callArchiveRPC('get_stats', {})
    } catch (err) {
      console.error('Failed to get archive stats:', err)
      return { success: false, error: err.message }
    }
  }, [callArchiveRPC])

  return {
    // State
    loading,
    error,
    clearError,

    // Core methods
    getPermissions,
    getStats,
    archiveItem,
    archiveItems,
    unarchiveItem,
    hideItem,
    listArchived,
    listHidden,

    // Convenience methods - Patient (FIXED parameter order)
    archiveAppointment: useCallback((appointmentId, options) => 
      archiveItem('appointment', appointmentId, options), [archiveItem]),
    archiveFeedback: useCallback((feedbackId, options) => 
      archiveItem('feedback', feedbackId, options), [archiveItem]),
    archiveNotification: useCallback((notificationId, options) => 
      archiveItem('notification', notificationId, options), [archiveItem]),

    // Convenience methods - Staff
    archiveClinicAppointment: useCallback((appointmentId, options) => 
      archiveItem('clinic_appointment', appointmentId, options), [archiveItem]),
    archiveClinicFeedback: useCallback((feedbackId, options) => 
      archiveItem('clinic_feedback', feedbackId, options), [archiveItem]),
    archivePatientCommunication: useCallback((communicationId, options) => 
      archiveItem('patient_communication', communicationId, options), [archiveItem]),

    // Convenience methods - Admin
    archiveUserAccount: useCallback((userId, options) => 
      archiveItem('user_account', userId, options), [archiveItem]),
    archiveClinicAccount: useCallback((clinicId, options) => 
      archiveItem('clinic_account', clinicId, options), [archiveItem]),
    archiveSystemNotification: useCallback((notificationId, options) => 
      archiveItem('system_notification', notificationId, options), [archiveItem]),

    // Batch methods
    archiveMultipleAppointments: useCallback((appointmentIds, options) => 
      archiveItems('appointment', appointmentIds, options), [archiveItems]),
    archiveMultipleNotifications: useCallback((notificationIds, options) => 
      archiveItems('notification', notificationIds, options), [archiveItems]),

    // Utility
    isLoading: loading,
    hasError: !!error
  }
}