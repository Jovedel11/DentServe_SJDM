import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

export const useUnifiedNotificationSystem = () => {
  const { user, profile, isPatient, isStaff, isAdmin } = useAuth();
  
  const [state, setState] = useState({
    notifications: [],
    allNotifications: [], // ✅ NEW: Store all notifications
    unreadCount: 0,
    loading: false,
    error: null,
    filter: 'all',
    pagination: {
      limit: 20,
      offset: 0,
      hasMore: false,
      totalCount: 0
    },
    realtimeConnected: false
  });

  // ✅ ENHANCED: Fetch notifications with "load all" option
  const fetchNotifications = useCallback(async (options = {}) => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      setState(prev => ({ ...prev, loading: !options.loadMore, error: null }));

      const {
        readStatus = null,
        types = null,
        limit = options.loadAll ? 1000 : state.pagination.limit, // ✅ Load all when requested
        offset = options.refresh ? 0 : (options.loadMore ? state.pagination.offset : 0),
        includeRelatedData = true
      } = options;

      console.log('🔄 Fetching notifications...', { readStatus, types, limit, offset, loadAll: options.loadAll });

      const { data, error } = await supabase.rpc('get_user_notifications', {
        p_user_id: null,
        p_read_status: readStatus,
        p_notification_types: types,
        p_limit: limit,
        p_offset: offset,
        p_include_related_data: includeRelatedData
      });

      if (error) throw error;
      if (data?.authenticated === false) throw new Error('Authentication required');
      if (!data?.success) throw new Error(data?.error || 'Failed to fetch notifications');

      const notificationData = data.data;
      const newNotifications = notificationData.notifications || [];
      const metadata = notificationData.metadata || {};
      const counts = metadata.counts || {};

      // ✅ ENHANCED: Process notifications with feedback metadata
      const processedNotifications = newNotifications.map(notification => {
        // Extract feedback metadata from notification message and related data
        let feedbackMetadata = null;
        
        if (notification.type === 'feedback_request') {
          // Try to extract feedback info from the message
          const ratingMatch = notification.message?.match(/(\d+)-star/);
          const rating = ratingMatch ? parseInt(ratingMatch[1]) : null;
          
          feedbackMetadata = {
            feedback_id: notification.id, // Use notification ID as fallback
            rating: rating,
            comment: notification.message,
            feedback_type: 'general',
            is_anonymous: false,
            patient: notification.related_data?.patient,
            clinic: notification.related_data?.clinic,
            doctor: notification.related_data?.doctor,
            appointment: notification.related_data?.appointment
          };
        }

        return {
          ...notification,
          metadata: {
            ...notification.metadata,
            ...feedbackMetadata
          }
        };
      });

      setState(prev => ({
        ...prev,
        loading: false,
        notifications: options.refresh || !options.loadMore 
          ? processedNotifications.slice(0, options.loadAll ? processedNotifications.length : 8) // ✅ Limit preview
          : [...prev.notifications, ...processedNotifications],
        allNotifications: options.loadAll 
          ? processedNotifications 
          : (options.refresh ? processedNotifications : prev.allNotifications), // ✅ Store all
        unreadCount: counts.unread || 0,
        pagination: {
          ...prev.pagination,
          totalCount: counts.total || 0,
          hasMore: metadata.pagination?.has_more || false,
          offset: options.refresh ? processedNotifications.length : prev.pagination.offset + processedNotifications.length
        }
      }));

      console.log('✅ Notifications fetched:', { 
        count: processedNotifications.length, 
        unread: counts.unread,
        total: counts.total,
        loadAll: options.loadAll
      });

      return {
        success: true,
        notifications: processedNotifications,
        unreadCount: counts.unread || 0,
        totalCount: counts.total || 0,
        metadata
      };

    } catch (err) {
      const errorMsg = err?.message || 'Failed to load notifications';
      setState(prev => ({ ...prev, loading: false, error: errorMsg }));
      console.error('❌ Fetch notifications error:', err);
      return { success: false, error: errorMsg };
    }
  }, [user]);

  // ✅ NEW: Load all notifications
  const loadAllNotifications = useCallback(async () => {
    return await fetchNotifications({ loadAll: true, refresh: true });
  }, [fetchNotifications]);

  // ✅ MARK NOTIFICATIONS AS READ
  const markAsRead = useCallback(async (notificationIds) => {
    if (!user || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return { success: false, error: 'Invalid notification IDs' };
    }

    try {
      console.log('🔄 Marking notifications as read...', notificationIds);

      const { data, error } = await supabase.rpc('mark_notifications_read', {
        p_notification_ids: notificationIds
      });

      if (error) throw error;
      if (data?.authenticated === false) throw new Error('Authentication required');
      if (!data?.success) throw new Error(data?.error || 'Failed to mark notifications as read');

      // Update local state for both notifications arrays
      setState(prev => {
        const updateNotifications = (notifications) => 
          notifications.map(notif => 
            notificationIds.includes(notif.id) 
              ? { ...notif, is_read: true }
              : notif
          );

        const markedCount = prev.notifications.filter(notif => 
          notificationIds.includes(notif.id) && !notif.is_read
        ).length;

        return {
          ...prev,
          notifications: updateNotifications(prev.notifications),
          allNotifications: updateNotifications(prev.allNotifications),
          unreadCount: Math.max(0, prev.unreadCount - markedCount)
        };
      });

      console.log('✅ Notifications marked as read:', data.updated_count || notificationIds.length);

      return {
        success: true,
        updated_count: data.updated_count || notificationIds.length,
        message: data.message || 'Notifications marked as read'
      };

    } catch (err) {
      const errorMsg = err?.message || 'Failed to mark notifications as read';
      setState(prev => ({ ...prev, error: errorMsg }));
      console.error('❌ Mark as read error:', err);
      return { success: false, error: errorMsg };
    }
  }, [user]);

  // ✅ RESPOND TO FEEDBACK (Enhanced with proper feedback ID extraction)
  const respondToFeedback = useCallback(async (feedbackId, response) => {
    if (!isStaff && !isAdmin) {
      return { success: false, error: 'Staff or Admin access required' };
    }

    try {
      console.log('🔄 Responding to feedback...', feedbackId);

      const { data, error } = await supabase.rpc('respond_to_feedback', {
        p_feedback_id: feedbackId,
        p_response: response
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to respond to feedback');

      console.log('✅ Feedback response submitted successfully');

      // Refresh notifications to show updated status
      await fetchNotifications({ refresh: true });

      return {
        success: true,
        data: data.data,
        message: data.message || 'Response submitted successfully'
      };

    } catch (err) {
      const errorMsg = err?.message || 'Failed to respond to feedback';
      console.error('❌ Respond to feedback error:', err);
      return { success: false, error: errorMsg };
    }
  }, [isStaff, isAdmin, fetchNotifications]);

  // ✅ GET FEEDBACK DETAILS (NEW)
const getFeedbackDetails = useCallback(async (feedbackId) => {
  try {
const { data, error } = await supabase
  .from("feedback")
  .select(`
    id,
    feedback_type,
    rating,
    comment,
    created_at,
    patient:users!feedback_patient_id_fkey (
      id,
      user_profile:user_profiles (
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
      name
    ),
    appointment:appointments (
      id,
      appointment_date,
      appointment_time
    ),
    responder:users!feedback_responded_by_fkey (
      id,
      user_profile:user_profiles(
        id,
        first_name,
        last_name,
        user_type
      )
    )
  `)
  .eq("id", feedbackId)
  .maybeSingle();  // prevent PGRST116

  if (data) {
  console.log("Patient:", data.patient?.user_profile ?? "No patient profile");
  console.log("Doctor:", data.doctor ?? "No doctor linked");
}



    if (error) throw error;

    return {
      success: true,
      data: {
        ...data,
        patient_name: data.patient?.user_profile
          ? `${data.patient.user_profile.first_name} ${data.patient.user_profile.last_name}`
          : null,
        doctor_name: data.doctor
          ? `${data.doctor.first_name} ${data.doctor.last_name}`
          : null,
        responder_name: data.responder?.user_profile
          ? `${data.responder.user_profile.first_name} ${data.responder.user_profile.last_name}`
          : null,
        responder_type: data.responder?.user_profile?.user_type || null
      }
    };
  } catch (err) {
    console.error("❌ Get feedback details error:", err);
    return { success: false, error: err.message };
  }
}, []);

const getNotificationNavigationPath = useCallback((notification) => {
  if (!notification) return null;

  const userBasePath = isPatient ? '/patient' : (isStaff || isAdmin) ? '/staff' : '';

  switch (notification.type) {
    case 'appointment_confirmed':
    case 'appointment_cancelled':
    case 'appointment_reminder':
      // Navigate to appointments page
      if (notification.related_appointment_id) {
        return `${userBasePath}/appointments`;
      }
      return `${userBasePath}/appointments`;

    case 'feedback_request':
      // Staff: Navigate to feedback management
      if (isStaff || isAdmin) {
        return `/staff/feedback`;
      }
      return null;

    case 'feedback_response':
      // Patient: Navigate to their feedback history
      if (isPatient) {
        return `/patient/feedback`;
      }
      return null;

    case 'partnership_request':
      // Admin only
      if (isAdmin) {
        return `/admin/partnerships`;
      }
      return null;

    default:
      return userBasePath;
  }
}, [isPatient, isStaff, isAdmin]);


  // ✅ REAL-TIME SUBSCRIPTION SETUP
  useEffect(() => {
    if (!user) return;

    console.log('🔄 Setting up real-time notification subscription...');

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, 
        (payload) => {
          console.log('🔔 New notification received:', payload.new);
          
          setState(prev => ({
            ...prev,
            notifications: [payload.new, ...prev.notifications.slice(0, 7)], // Keep preview limit
            allNotifications: [payload.new, ...prev.allNotifications],
            unreadCount: prev.unreadCount + 1
          }));
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Notification updated:', payload.new);
          
          setState(prev => ({
            ...prev,
            notifications: prev.notifications.map(notif =>
              notif.id === payload.new.id ? payload.new : notif
            ),
            allNotifications: prev.allNotifications.map(notif =>
              notif.id === payload.new.id ? payload.new : notif
            )
          }));
        }
      )
      .subscribe((status) => {
        console.log('📡 Notification subscription status:', status);
        setState(prev => ({
          ...prev,
          realtimeConnected: status === 'SUBSCRIBED'
        }));
      });

    return () => {
      console.log('🔄 Cleaning up notification subscription...');
      supabase.removeChannel(channel);
    };
  }, [user]);

  // ✅ COMPUTED VALUES
  const computedData = useMemo(() => {
    const { notifications, allNotifications } = state;

    const processNotifications = (notifs) => ({
      appointmentNotifications: notifs.filter(n => 
        ['appointment_confirmed', 'appointment_cancelled', 'appointment_reminder'].includes(n.type)
      ),
      feedbackNotifications: notifs.filter(n => n.type === 'feedback_request'),
      partnershipNotifications: notifs.filter(n => n.type === 'partnership_request'),
      urgentNotifications: notifs.filter(n => 
        !n.is_read && (
          n.priority === 1 || 
          (n.type === 'feedback_request' && n.metadata?.rating <= 2)
        )
      ),
      todayNotifications: (() => {
        const today = new Date().toDateString();
        return notifs.filter(n => new Date(n.created_at).toDateString() === today);
      })()
    });

    const previewData = processNotifications(notifications);
    const allData = processNotifications(allNotifications);

    return {
      // Preview data (for bell dropdown)
      ...previewData,
      
      // All data (for modal)
      allAppointmentNotifications: allData.appointmentNotifications,
      allFeedbackNotifications: allData.feedbackNotifications,
      allPartnershipNotifications: allData.partnershipNotifications,
      allUrgentNotifications: allData.urgentNotifications,
      allTodayNotifications: allData.todayNotifications,
      
      stats: {
        total: allNotifications.length,
        unread: state.unreadCount,
        read: allNotifications.length - state.unreadCount,
        urgent: allData.urgentNotifications.length,
        today: allData.todayNotifications.length,
        appointments: allData.appointmentNotifications.length,
        feedback: allData.feedbackNotifications.length,
        partnerships: allData.partnershipNotifications.length
      }
    };
  }, [state.notifications, state.allNotifications, state.unreadCount]);

  // ✅ AUTO-FETCH ON MOUNT
  useEffect(() => {
    if (user) {
      fetchNotifications({ refresh: true });
    }
  }, [user, fetchNotifications]);

  // ✅ PERIODIC REFRESH
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      fetchNotifications({ refresh: true });
    }, (isStaff || isAdmin) ? 2 * 60 * 1000 : 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, isStaff, isAdmin, fetchNotifications]);

  return {
    // State
    ...state,
    ...computedData,

    // Actions
    fetchNotifications,
    loadAllNotifications, // ✅ NEW
    markAsRead,
    respondToFeedback,
    getFeedbackDetails, // ✅ NEW
    markSingleAsRead: (id) => markAsRead([id]),
    markAllAsRead: () => markAsRead(state.allNotifications.filter(n => !n.is_read).map(n => n.id)),
    loadMore: () => {
      if (!state.loading && state.pagination.hasMore) {
        return fetchNotifications({ loadMore: true });
      }
    },
    refresh: () => fetchNotifications({ refresh: true }),

    // Utilities
    hasUnread: state.unreadCount > 0,
    isEmpty: state.notifications.length === 0,
    hasMore: state.pagination.hasMore,
    isConnected: state.realtimeConnected,
    clearError: () => setState(prev => ({ ...prev, error: null })),
    
    // Role-based capabilities
    canRespondToFeedback: isStaff || isAdmin,
    canModerate: isAdmin,
    getNotificationNavigationPath,
    
    // Getters
    getNotificationById: (id) => state.allNotifications.find(n => n.id === id),
    getNotificationsByType: (type) => state.allNotifications.filter(n => n.type === type),
    getUnreadNotifications: () => state.allNotifications.filter(n => !n.is_read)
  };
};