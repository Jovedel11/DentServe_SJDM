import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

export const useNotificationSystem = () => {
  const { user } = useAuth();
  
  const [state, setState] = useState({
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null,
    filter: 'all'
  });

  // 🎯 FETCH NOTIFICATIONS (Role-based)
  const fetchNotifications = useCallback(async (options = {}) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.rpc('get_user_notifications', {
        p_user_id: null, // Uses current user context
        p_read_status: options.readStatus || null,
        p_notification_types: options.types || null,
        p_limit: options.limit || 20,
        p_offset: options.offset || 0
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error);

      const notifications = data.data.notifications || [];
      const unreadCount = data.data.unread_count || 0;

      setState(prev => ({
        ...prev,
        notifications,
        unreadCount,
        loading: false
      }));

      return { success: true, notifications, unreadCount };
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err.message }));
      return { success: false, error: err.message };
    }
  }, []);

  // 🎯 MARK AS READ
  const markAsRead = useCallback(async (notificationIds) => {
    try {
      const { data, error } = await supabase.rpc('mark_notifications_read', {
        p_notification_ids: Array.isArray(notificationIds) ? notificationIds : [notificationIds]
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error);

      // Update local state
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(notif => 
          notificationIds.includes(notif.id) 
            ? { ...notif, is_read: true }
            : notif
        ),
        unreadCount: Math.max(0, prev.unreadCount - (Array.isArray(notificationIds) ? notificationIds.length : 1))
      }));

      return { success: true };
    } catch (err) {
      setState(prev => ({ ...prev, error: err.message }));
      return { success: false, error: err.message };
    }
  }, []);

  // 🎯 CREATE NOTIFICATION
  const createNotification = useCallback(async (userId, type, appointmentId, message) => {
    try {
      const { data, error } = await supabase.rpc('create_appointment_notification', {
        p_user_id: userId,
        p_notification_type: type,
        p_appointment_id: appointmentId,
        p_custom_message: message
      });

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  // 🎯 AUTO-REFRESH
  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      const interval = setInterval(() => {
        fetchNotifications({ refresh: true });
      }, 60000); // 1 minute

      return () => clearInterval(interval);
    }
  }, [user, fetchNotifications]);

  return {
    // State
    ...state,
    
    // Actions
    fetchNotifications,
    markAsRead,
    createNotification,
    markAllAsRead: () => markAsRead(state.notifications.filter(n => !n.is_read).map(n => n.id)),
    
    // Computed
    hasUnread: state.unreadCount > 0,
    urgentNotifications: state.notifications.filter(n => n.priority === 1 && !n.is_read),
    todayNotifications: state.notifications.filter(n => {
      const today = new Date().toDateString();
      return new Date(n.created_at).toDateString() === today;
    })
  };
};