import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../auth/context/AuthProvider';
import { supabase } from '../../lib/supabaseClient';

export const useAppointmentRealtime = (options = {}) => {
  const { user, profile } = useAuth();
  
  const {
    onAppointmentUpdate,
    onNotificationReceived,
    onAppointmentStatusChange,
    onClinicRatingUpdate,
    enableAppointments = true,
    enableNotifications = true,
    enableAnalytics = false,
    enableFeedback = false
  } = options;

  const subscriptionsRef = useRef([]);

  // Get user details from current context
  const getUserDetails = useCallback(() => {
    if (!user || !profile) return null;

    return {
      userId: profile.user_id || user.id,
      userRole: profile.user_type,
      clinicId: profile.role_specific_data?.clinic_id
    };
  }, [user, profile]);

  // Clean up subscriptions
  const cleanup = useCallback(() => {
    subscriptionsRef.current.forEach(subscription => {
      try {
        supabase.removeChannel(subscription);
      } catch (error) {
        console.error('Error removing channel:', error);
      }
    });
    subscriptionsRef.current = [];
  }, []);

  // Setup appointments subscription with correct user ID
  const setupAppointmentSubscription = useCallback(() => {
    const userDetails = getUserDetails();
    if (!userDetails || !enableAppointments) return;

    const { userId, userRole, clinicId } = userDetails;
    let appointmentSubscription;

    switch (userRole) {
      case 'patient':
        appointmentSubscription = supabase
          .channel(`patient-appointments-${userId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'appointments',
              filter: `patient_id=eq.${userId}` // Use correct user ID
            },
            (payload) => {
              console.log('Patient appointment update:', payload);
              
              if (onAppointmentUpdate) {
                onAppointmentUpdate({
                  type: payload.eventType,
                  appointment: payload.new || payload.old,
                  old: payload.old,
                  isOwn: true
                });
              }

              if (payload.eventType === 'UPDATE' && onAppointmentStatusChange) {
                const oldStatus = payload.old?.status;
                const newStatus = payload.new?.status;
                
                if (oldStatus !== newStatus) {
                  onAppointmentStatusChange({
                    appointmentId: payload.new.id,
                    oldStatus,
                    newStatus,
                    appointment: payload.new,
                    userType: 'patient'
                  });
                }
              }
            }
          )
          .subscribe((status) => {
            console.log('Patient appointments subscription status:', status);
          });
        break;

      case 'staff':
        if (clinicId) {
          appointmentSubscription = supabase
            .channel(`staff-appointments-${clinicId}`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'appointments',
                filter: `clinic_id=eq.${clinicId}` // Use clinic ID from profile
              },
              (payload) => {
                console.log('Staff appointment update:', payload);
                
                if (onAppointmentUpdate) {
                  onAppointmentUpdate({
                    type: payload.eventType,
                    appointment: payload.new || payload.old,
                    old: payload.old,
                    clinicId: clinicId
                  });
                }

                if (payload.eventType === 'UPDATE' && onAppointmentStatusChange) {
                  const oldStatus = payload.old?.status;
                  const newStatus = payload.new?.status;
                  
                  if (oldStatus !== newStatus) {
                    onAppointmentStatusChange({
                      appointmentId: payload.new.id,
                      oldStatus,
                      newStatus,
                      appointment: payload.new,
                      userType: 'staff',
                      clinicId: clinicId
                    });
                  }
                }
              }
            )
            .subscribe((status) => {
              console.log('Staff appointments subscription status:', status);
            });
        }
        break;

      case 'admin':
        appointmentSubscription = supabase
          .channel('admin-appointments')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'appointments'
            },
            (payload) => {
              console.log('Admin appointment update:', payload);
              
              if (onAppointmentUpdate) {
                onAppointmentUpdate({
                  type: payload.eventType,
                  appointment: payload.new || payload.old,
                  old: payload.old,
                  userType: 'admin'
                });
              }
            }
          )
          .subscribe((status) => {
            console.log('Admin appointments subscription status:', status);
          });
        break;
    }

    if (appointmentSubscription) {
      subscriptionsRef.current.push(appointmentSubscription);
    }
  }, []);

  // Notifications subscription
  const setupNotificationSubscription = useCallback(() => {
    const userDetails = getUserDetails();
    if (!userDetails || !enableNotifications) return;

    const { userId } = userDetails;

    const notificationSubscription = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}` // Use correct user ID
        },
        (payload) => {
          console.log('New notification received:', payload);
          
          if (onNotificationReceived) {
            onNotificationReceived({
              notification: payload.new,
              isNew: true,
              userId: userId
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Notification updated:', payload);
          
          if (onNotificationReceived) {
            onNotificationReceived({
              notification: payload.new,
              old: payload.old,
              isNew: false,
              userId: userId
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Notifications subscription status:', status);
      });

    subscriptionsRef.current.push(notificationSubscription);
  }, [getUserDetails, enableNotifications, onNotificationReceived]);

  // Initialize subscriptions
  useEffect(() => {
    const userDetails = getUserDetails();
    if (!userDetails) return;

    cleanup(); // Clean up existing subscriptions

    setupAppointmentSubscription();
    setupNotificationSubscription();

    return cleanup;
  }, [user, profile, setupAppointmentSubscription, setupNotificationSubscription, cleanup]);

  return {
    // Controls
    enableRealtimeUpdates: useCallback(() => {
      cleanup();
      setupAppointmentSubscription();
      setupNotificationSubscription();
    }, [cleanup, setupAppointmentSubscription, setupNotificationSubscription]),
    
    disableRealtimeUpdates: cleanup,

    // State
    isConnected: subscriptionsRef.current.length > 0,
    activeSubscriptions: subscriptionsRef.current.length,
    userDetails: getUserDetails(),

    // Utilities
    getSubscriptionStatus: () => ({
      appointments: subscriptionsRef.current.some(sub => 
        sub.topic.includes('appointments')
      ),
      notifications: subscriptionsRef.current.some(sub => 
        sub.topic.includes('notifications')
      ),
      total: subscriptionsRef.current.length
    })
  };
};