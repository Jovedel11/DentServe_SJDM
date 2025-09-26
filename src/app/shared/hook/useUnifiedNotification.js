import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

export const useUnifiedNotifications = () => {
  const { user, profile, isPatient, isStaff, isAdmin } = useAuth();
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    totalCount: 0,
    hasMore: false
  });

  // ✅ DETERMINE USER TYPE AND NOTIFICATION TYPES
  const userContext = useMemo(() => {
    if (!user || !profile) return null;
    
    const userType = profile.user_type;
    let notificationTypes = [];
    
    // Define notification types based on user role
    switch (userType) {
      case 'patient':
        notificationTypes = [
          'appointment_reminder',
          'appointment_confirmed',
          'appointment_cancelled',
          'feedback_request'
        ];
        break;
      case 'staff':
        notificationTypes = [
          'appointment_confirmed',
          'appointment_cancelled',
          'appointment_reminder',
          'feedback_request'
        ];
        break;
      case 'admin':
        notificationTypes = [
          'appointment_confirmed',
          'appointment_cancelled',
          'appointment_reminder',
          'feedback_request',
          'partnership_request'
        ];
        break;
      default:
        notificationTypes = [];
    }
    
    return {
      userType,
      notificationTypes,
      userId: profile.user_id || user.id,
      clinicId: profile.role_specific_data?.clinic_id || null
    };
  }, [user, profile, isPatient, isStaff, isAdmin]);

  // ✅ UNIFIED FETCH NOTIFICATIONS
  const fetchNotifications = useCallback(async (options = {}) => {
    if (!userContext) {
      return { success: false, error: 'User context not available' };
    }

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
        p_notification_types: userContext.notificationTypes,
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

      const notificationData = data.data;
      const newNotifications = notificationData.notifications || [];

      if (refresh || offset === 0) {
        setNotifications(newNotifications);
      } else {
        setNotifications(prev => [...prev, ...newNotifications]);
      }

      const metadata = notificationData.metadata || {};
      const counts = metadata.counts || {};

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
        totalCount: counts.total || 0,
        metadata
      };

    } catch (err) {
      const errorMsg = err?.message || 'Failed to load notifications';
      setError(errorMsg);
      console.error('Fetch unified notifications error:', err);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [userContext, filter, pagination.limit, pagination.offset]);

  // ✅ MARK AS READ
  const markAsRead = useCallback(async (notificationIds) => {
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return { success: false, error: 'Invalid notification IDs' };
    }

    try {
      const { data, error } = await supabase.rpc('mark_notifications_read', {
        p_notification_ids: notificationIds
      });

      if (error) throw new Error(error.message);

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to mark notifications as read');
      }

      // Update local state
      setNotifications(prev => prev.map(notif => 
        notificationIds.includes(notif.id) 
          ? { ...notif, is_read: true }
          : notif
      ));

      return {
        success: true,
        updatedCount: data.data?.updated_count || notificationIds.length,
        message: data.message || 'Notifications marked as read'
      };

    } catch (err) {
      const errorMsg = err?.message || 'Failed to mark notifications as read';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, []);

  // ✅ CREATE NOTIFICATION (for feedback and other events)
  const createNotification = useCallback(async (userId, type, appointmentId, customMessage = null) => {
    try {
      // Validate notification type
      if (!userContext?.notificationTypes.includes(type)) {
        throw new Error(`Invalid notification type: ${type} for user role: ${userContext?.userType}`);
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

      // Refresh notifications to include the new one
      fetchNotifications({ refresh: true });

      return { success: true, message: data.message || 'Notification created successfully' };
    } catch (err) {
      console.error('Create notification error:', err);
      return { success: false, error: err.message };
    }
  }, [userContext, fetchNotifications]);

  // ✅ COMPUTED VALUES
  const computedValues = useMemo(() => {
    const unreadCount = notifications.filter(n => !n.is_read).length;
    const todayCount = notifications.filter(n => {
      const notifDate = new Date(n.created_at).toDateString();
      const today = new Date().toDateString();
      return notifDate === today;
    }).length;

    const byType = userContext?.notificationTypes.reduce((acc, type) => {
      acc[type] = notifications.filter(n => n.notification_type === type).length;
      return acc;
    }, {}) || {};

    const urgent = notifications.filter(n => n.priority === 1 && !n.is_read).length;

    return {
      unreadCount,
      todayCount,
      byType,
      urgent,
      total: notifications.length,
      read: notifications.length - unreadCount,
      hasUnread: unreadCount > 0,
      isEmpty: notifications.length === 0
    };
  }, [notifications, userContext]);

  // ✅ FILTER NOTIFICATIONS
  const getFilteredNotifications = useCallback((filterType = 'all') => {
    switch (filterType) {
      case 'unread':
        return notifications.filter(n => !n.is_read);
      case 'urgent':
        return notifications.filter(n => n.priority === 1);
      case 'appointments':
        return notifications.filter(n => 
          ['appointment_confirmed', 'appointment_cancelled', 'appointment_reminder'].includes(n.notification_type)
        );
      case 'feedback':
        return notifications.filter(n => n.notification_type === 'feedback_request');
      case 'today':
        const today = new Date().toDateString();
        return notifications.filter(n => 
          new Date(n.created_at).toDateString() === today
        );
      default:
        return notifications;
    }
  }, [notifications]);

  // ✅ AUTO-FETCH on mount and filter changes
  useEffect(() => {
    if (userContext) {
      fetchNotifications({ refresh: true });
    }
  }, [filter, userContext?.userType]);

  // ✅ AUTO-REFRESH based on user type
  useEffect(() => {
    if (!userContext) return;

    // Different refresh intervals based on user type
    const refreshInterval = userContext.userType === 'staff' ? 2 * 60 * 1000 : 5 * 60 * 1000;
    
    const interval = setInterval(() => {
      fetchNotifications({ refresh: true });
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchNotifications, userContext]);

  return {
    // State
    notifications,
    loading,
    error,
    filter,
    pagination,
    userContext,
    
    // Computed
    ...computedValues,

    // Actions
    fetchNotifications,
    markAsRead,
    markSingleAsRead: (id) => markAsRead([id]),
    markAllAsRead: () => markAsRead(notifications.filter(n => !n.is_read).map(n => n.id)),
    createNotification,
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
    getFilteredNotifications,
    getNotificationById: (id) => notifications.find(n => n.id === id),
    getUrgentNotifications: () => getFilteredNotifications('urgent'),
    getTodayNotifications: () => getFilteredNotifications('today'),
    getAppointmentNotifications: () => getFilteredNotifications('appointments'),
    getFeedbackNotifications: () => getFilteredNotifications('feedback'),
    
    // Cleanup
    clearError: () => setError(null)
  };
};