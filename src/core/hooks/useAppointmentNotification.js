import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../auth/context/AuthProvider';
import { supabase } from '../../lib/supabaseClient';

export const useAppointmentNotifications = () => {
  const { user, profile } = useAuth();
  
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

  //Fetch notifications
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

      const { data, error } = await supabase.rpc('get_user_notifications', {
        p_user_id: null, // Uses current user context
        p_read_status: readStatus,
        p_limit: limit,
        p_offset: refresh ? 0 : offset
      });

      if (error) throw new Error(error.message);

      if (data?.authenticated === false) {
        setError('Authentication required');
        return { success: false, error: 'Authentication required' };
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch notifications');
      }

      const notificationData = data.data;
      const newNotifications = notificationData.notifications || [];

      if (refresh || offset === 0) {
        setNotifications(newNotifications);
      } else {
        setNotifications(prev => [...prev, ...newNotifications]);
      }

      setUnreadCount(notificationData.unread_count || 0);
      setPagination(prev => ({
        ...prev,
        totalCount: notificationData.total_count || 0,
        hasMore: newNotifications.length === limit,
        offset: refresh ? newNotifications.length : prev.offset + newNotifications.length
      }));

      return {
        success: true,
        notifications: newNotifications,
        unreadCount: notificationData.unread_count,
        totalCount: notificationData.total_count
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

  // Mark as read
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
        updatedCount: data.updated_count,
        message: data.message
      };

    } catch (err) {
      const errorMsg = err?.message || 'Failed to mark notifications as read';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [user, notifications]);

  // Create appointment notification (for system use)
  const createAppointmentNotification = useCallback(async (userId, type, appointmentId, customMessage = null) => {
    try {
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

      return { success: true, message: data.message };
    } catch (err) {
      console.error('Create notification error:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Get notifications by type
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

  // Get notification statistics
  const getStats = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    
    return {
      total: notifications.length,
      unread: unreadCount,
      read: notifications.length - unreadCount,
      todayCount: notifications.filter(notif => 
        notif.created_at.split('T')[0] === today
      ).length,
      appointmentRelated: notifications.filter(notif => 
        notif.appointment_id !== null
      ).length,
      byType: {
        appointment_confirmed: getNotificationsByType('appointment_confirmed').length,
        appointment_cancelled: getNotificationsByType('appointment_cancelled').length,
        appointment_reminder: getNotificationsByType('appointment_reminder').length,
        feedback_request: getNotificationsByType('feedback_request').length,
        partnership_request: getNotificationsByType('partnership_request').length
      }
    };
  }, [notifications, unreadCount, getNotificationsByType]);

  // Auto-fetch on component mount and filter changes
  useEffect(() => {
    fetchNotifications({ refresh: true });
  }, [filter]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications({ refresh: true });
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchNotifications]);
  
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
    fetchNotifications, // with return values
    markAsRead,         // with return values
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

    //computed values
    // stats: {
    //   total: notifications.length,
    //   unread: unreadCount,
    //   read: notifications.length - unreadCount,
    //   todayCount: notifications.filter(n => 
    //     new Date(n.created_at).toDateString() === new Date().toDateString()
    //   ).length,
    //   byType: {
    //     appointment_confirmed: notifications.filter(n => n.type === 'appointment_confirmed').length,
    //     appointment_cancelled: notifications.filter(n => n.type === 'appointment_cancelled').length,
    //     appointment_reminder: notifications.filter(n => n.type === 'appointment_reminder').length,
    //     feedback_request: notifications.filter(n => n.type === 'feedback_request').length
    //   }
    // },

    // Utilities
    isEmpty: notifications.length === 0,
    hasUnread: unreadCount > 0,
    hasMore: pagination.hasMore
  };
};