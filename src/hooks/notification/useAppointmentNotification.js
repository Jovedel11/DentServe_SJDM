import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

export const useAppointmentNotifications = () => {
  const { user } = useAuth();
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all');  
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    totalCount: 0,
    hasMore: false
  });

  // ✅ FIXED: Use only valid notification types from database enum
  const fetchNotifications = useCallback(async (options = {}) => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      setLoading(true);
      setError(null);

      const { 
        readStatus = filter === 'all' ? null : filter === 'unread' ? false : true,
        limit = pagination.limit,
        offset = pagination.offset,
        refresh = false
      } = options;

      // ✅ CORRECTED: Only use valid enum values from database
      const appointmentNotificationTypes = [
        'appointment_confirmed',
        'appointment_cancelled', 
        'appointment_reminder',
        'feedback_request',      // ✅ Staff receives this
        'feedback_response'      // ✅ NEW: Patient receives this
      ];

      const { data, error } = await supabase.rpc('get_user_notifications', {
        p_user_id: null, // Uses current user context
        p_read_status: readStatus,
        p_notification_types: appointmentNotificationTypes,
        p_limit: limit,
        p_offset: refresh ? 0 : offset,
        p_include_related_data: true
      });

      if (error) throw new Error(error.message);

      if (data?.authenticated === false) {
        setError('Authentication required');
        return { success: false, error: 'Authentication required' };
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch notifications');
      }

      // ✅ FIXED: Correct data structure from database response
      const notificationData = data.data;
      const newNotifications = notificationData.notifications || [];
      const metadata = notificationData.metadata || {};
      const counts = metadata.counts || {};

      if (refresh || offset === 0) {
        setNotifications(newNotifications);
      } else {
        setNotifications(prev => [...prev, ...newNotifications]);
      }

      // ✅ CORRECTED: Use proper field names from database response
      setUnreadCount(counts.unread || 0);
      setPagination(prev => ({
        ...prev,
        totalCount: counts.total || 0,
        hasMore: metadata.pagination?.has_more || false,
        offset: refresh ? newNotifications.length : prev.offset + newNotifications.length
      }));

      return {
        success: true,
        notifications: newNotifications,
        unreadCount: counts.unread || 0,
        totalCount: counts.total || 0
      };

    } catch (err) {
      const errorMsg = err?.message || 'Failed to load notifications';
      setError(errorMsg);
      console.error('Fetch notifications error:', err);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [user, filter, pagination.limit, pagination.offset]);

  // ✅ ENHANCED: Better mark as read handling
  const markAsRead = useCallback(async (notificationIds) => {
    if (!user || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return { success: false, error: 'Invalid notification IDs' };
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('mark_notifications_read', {
        p_notification_ids: notificationIds
      });

      if (error) throw new Error(error.message);

      if (data?.authenticated === false) {
        setError('Authentication required');
        return { success: false, error: 'Authentication required' };
      }

      if (!data?.success) {
        setError(data?.error || 'Failed to mark notifications as read');
        return { success: false, error: data?.error };
      }

      // Update local state
      setNotifications(prev => prev.map(notif => 
        notificationIds.includes(notif.id) 
          ? { ...notif, is_read: true }
          : notif
      ));

      // Update unread count
      const markedCount = notifications.filter(notif => 
        notificationIds.includes(notif.id) && !notif.is_read
      ).length;
      
      setUnreadCount(prev => Math.max(0, prev - markedCount));

      return {
        success: true,
        updated_count: data.updated_count || markedCount,
        message: data.message || 'Notifications marked as read'
      };

    } catch (err) {
      const errorMsg = err?.message || 'Failed to mark notifications as read';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [user, notifications]);

  // ✅ FIXED: Validate against correct enum values
  const createAppointmentNotification = useCallback(async (userId, type, appointmentId, customMessage = null) => {
    try {
      // ✅ CORRECTED: Only valid database enum values
      const validTypes = [
        'appointment_confirmed',
        'appointment_cancelled',
        'appointment_reminder',
        'feedback_request'
      ];

      if (!validTypes.includes(type)) {
        throw new Error(`Invalid notification type: ${type}. Valid types: ${validTypes.join(', ')}`);
      }

      const { data, error } = await supabase.rpc('create_appointment_notification', {
        p_user_id: userId,
        p_notification_type: type,
        p_appointment_id: appointmentId,
        p_custom_message: customMessage
      });

      if (error) throw new Error(error.message);

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to create notification');
      }

      return { success: true, message: data.message || 'Notification created successfully' };
    } catch (err) {
      console.error('Create notification error:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // ✅ CORRECTED: Use proper field name 'type' instead of 'notification_type'
  const getNotificationsByType = useCallback((type) => {
    return notifications.filter(notif => notif.type === type);
  }, [notifications]);

  // Get recent notifications (last 24 hours)
  const getRecentNotifications = useCallback(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    return notifications.filter(notif => 
      new Date(notif.created_at) >= yesterday
    );
  }, [notifications]);

  // ✅ FIXED: Updated stats with correct enum values including feedback_response
  const getStats = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    
    return {
      total: notifications.length,
      unread: unreadCount,
      read: notifications.length - unreadCount,
      todayCount: notifications.filter(notif => 
        notif.created_at?.split('T')[0] === today
      ).length,
      // ✅ FIXED: Use related_appointment_id instead of appointment_id
      appointmentRelated: notifications.filter(notif => 
        notif.related_appointment_id !== null
      ).length,
      byType: {
        appointment_confirmed: getNotificationsByType('appointment_confirmed').length,
        appointment_cancelled: getNotificationsByType('appointment_cancelled').length,
        appointment_reminder: getNotificationsByType('appointment_reminder').length,
        feedback_request: getNotificationsByType('feedback_request').length,
        feedback_response: getNotificationsByType('feedback_response').length,
        partnership_request: getNotificationsByType('partnership_request').length
      }
    };
  }, [notifications, unreadCount, getNotificationsByType]);

  // Auto-fetch on component mount and filter changes
  useEffect(() => {
    if (user) {
      fetchNotifications({ refresh: true });
    }
  }, [filter, user]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      fetchNotifications({ refresh: true });
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchNotifications, user]);
  
  return {
    // Data
    notifications,
    loading,
    error,
    unreadCount,
    filter,
    pagination,

    // Actions
    createAppointmentNotification,
    getStats, 
    getRecentNotifications,
    fetchNotifications,
    markAsRead,
    markSingleAsRead: (id) => markAsRead([id]),
    markAllAsRead: () => markAsRead(notifications.filter(n => !n.is_read).map(n => n.id)),
    updateFilter: (newFilter) => {
      setFilter(newFilter);
      setPagination(prev => ({ ...prev, offset: 0 }));
    },
    refresh: () => fetchNotifications({ refresh: true }),
    loadMore: () => {
      if (!loading && pagination.hasMore) {
        fetchNotifications({ offset: pagination.offset });
      }
    },

    // Utilities
    isEmpty: notifications.length === 0,
    hasUnread: unreadCount > 0,
    hasMore: pagination.hasMore,
    clearError: () => setError(null)
  };
};