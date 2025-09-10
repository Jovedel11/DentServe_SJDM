import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

export const useStaffNotifications = () => {
  const { user, profile, isStaff, isAdmin } = useAuth();
  
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

  // ✅ STAFF NOTIFICATION FETCH with proper filtering
  const fetchStaffNotifications = useCallback(async (options = {}) => {
    if (!isStaff() && !isAdmin()) {
      return { success: false, error: 'Staff or Admin access required' };
    }

    try {
      setLoading(true);
      setError(null);

      const { 
        readStatus = filter === 'all' ? null : filter === 'unread' ? false : true,
        limit = pagination.limit,
        offset = pagination.offset,
        refresh = false,
        notificationTypes = ['appointment_confirmed', 'appointment_cancelled', 'appointment_reminder']
      } = options;

      const { data, error } = await supabase.rpc('get_user_notifications', {
        p_user_id: null, // Uses current user context
        p_read_status: readStatus,
        p_notification_types: notificationTypes,
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
        throw new Error(data?.error || 'Failed to fetch staff notifications');
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
      const errorMsg = err?.message || 'Failed to load staff notifications';
      setError(errorMsg);
      console.error('Fetch staff notifications error:', err);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [isStaff, isAdmin, filter, pagination.limit, pagination.offset]);

  // ✅ MARK AS READ with staff context
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
        updatedCount: data.updated_count,
        message: data.message
      };

    } catch (err) {
      const errorMsg = err?.message || 'Failed to mark notifications as read';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, []);

  // ✅ COMPUTED VALUES for staff dashboard
  const statsAndFilters = useMemo(() => {
    const unreadCount = notifications.filter(n => !n.is_read).length;
    const todayCount = notifications.filter(n => {
      const notifDate = new Date(n.created_at).toDateString();
      const today = new Date().toDateString();
      return notifDate === today;
    }).length;

    const byType = {
      appointment_confirmed: notifications.filter(n => n.type === 'appointment_confirmed').length,
      appointment_cancelled: notifications.filter(n => n.type === 'appointment_cancelled').length,
      appointment_reminder: notifications.filter(n => n.type === 'appointment_reminder').length
    };

    const urgent = notifications.filter(n => n.priority === 1 && !n.is_read).length;

    return {
      unreadCount,
      todayCount,
      byType,
      urgent,
      total: notifications.length,
      read: notifications.length - unreadCount
    };
  }, [notifications]);

  // ✅ FILTER NOTIFICATIONS by type/priority
  const getFilteredNotifications = useCallback((filterType = 'all') => {
    switch (filterType) {
      case 'unread':
        return notifications.filter(n => !n.is_read);
      case 'urgent':
        return notifications.filter(n => n.priority === 1);
      case 'appointments':
        return notifications.filter(n => 
          ['appointment_confirmed', 'appointment_cancelled', 'appointment_reminder'].includes(n.type)
        );
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
    if (isStaff() || isAdmin()) {
      fetchStaffNotifications({ refresh: true });
    }
  }, [filter, isStaff, isAdmin]);

  // ✅ AUTO-REFRESH every 2 minutes (more frequent for staff)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isStaff() || isAdmin()) {
        fetchStaffNotifications({ refresh: true });
      }
    }, 2 * 60 * 1000); // 2 minutes

    return () => clearInterval(interval);
  }, [fetchStaffNotifications, isStaff, isAdmin]);

  return {
    // State
    notifications,
    loading,
    error,
    filter,
    pagination,
    stats: statsAndFilters,

    // Actions
    fetchStaffNotifications,
    markAsRead,
    markSingleAsRead: (id) => markAsRead([id]),
    markAllAsRead: () => markAsRead(notifications.filter(n => !n.is_read).map(n => n.id)),
    updateFilter: (newFilter) => {
      setFilter(newFilter);
      setPagination(prev => ({ ...prev, offset: 0 }));
    },
    refresh: () => fetchStaffNotifications({ refresh: true }),
    loadMore: () => {
      if (!loading && pagination.hasMore) {
        fetchStaffNotifications({ offset: pagination.offset });
      }
    },

    // Computed
    isEmpty: notifications.length === 0,
    hasUnread: statsAndFilters.unreadCount > 0,
    hasMore: pagination.hasMore,
    
    // Utilities
    getFilteredNotifications,
    getNotificationById: (id) => notifications.find(n => n.id === id),
    getUrgentNotifications: () => getFilteredNotifications('urgent'),
    getTodayNotifications: () => getFilteredNotifications('today')
  };
};