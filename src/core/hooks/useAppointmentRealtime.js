import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../auth/context/AuthProvider';
import { supabase } from '../../lib/supabaseClient';

export const useAppointmentRealtime = (options = {}) => {
  const { user, profile, userRole } = useAuth();
  
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

  // Clean up subscriptions
  const cleanup = useCallback(() => {
    subscriptionsRef.current.forEach(subscription => {
      subscription.unsubscribe();
    });
    subscriptionsRef.current = [];
  }, []);

  // Setup appointments real-time subscription
  const setupAppointmentSubscription = useCallback(() => {
    if (!user || !enableAppointments) return;

    let appointmentSubscription;

    // Different subscription filters based on user role
    switch (userRole) {
      case 'patient':
        appointmentSubscription = supabase
          .channel('patient-appointments')
          .on(
            'postgres_changes',
            {
              event: '*', // INSERT, UPDATE, DELETE
              schema: 'public',
              table: 'appointments',
              filter: `patient_id=eq.${profile?.user_id}` // Use profile user_id
            },
            (payload) => {
              console.log('Patient appointment update:', payload);
              
              // Call the appropriate callback
              if (onAppointmentUpdate) {
                onAppointmentUpdate({
                  type: payload.eventType,
                  appointment: payload.new || payload.old,
                  old: payload.old
                });
              }

              // Specific status change callback
              if (payload.eventType === 'UPDATE' && onAppointmentStatusChange) {
                const oldStatus = payload.old?.status;
                const newStatus = payload.new?.status;
                
                if (oldStatus !== newStatus) {
                  onAppointmentStatusChange({
                    appointmentId: payload.new.id,
                    oldStatus,
                    newStatus,
                    appointment: payload.new
                  });
                }
              }
            }
          )
          .subscribe();
        break;

      case 'staff':
        const clinicId = profile?.role_specific_data?.clinic_id;
        if (clinicId) {
          appointmentSubscription = supabase
            .channel('staff-appointments')
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'appointments',
                filter: `clinic_id=eq.${clinicId}`
              },
              (payload) => {
                console.log('Staff appointment update:', payload);
                
                if (onAppointmentUpdate) {
                  onAppointmentUpdate({
                    type: payload.eventType,
                    appointment: payload.new || payload.old,
                    old: payload.old
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
                      appointment: payload.new
                    });
                  }
                }
              }
            )
            .subscribe();
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
                  old: payload.old
                });
              }
            }
          )
          .subscribe();
        break;
    }

    if (appointmentSubscription) {
      subscriptionsRef.current.push(appointmentSubscription);
    }
  }, [user, userRole, profile, enableAppointments, onAppointmentUpdate, onAppointmentStatusChange]);

  // Setup notifications real-time subscription
  const setupNotificationSubscription = useCallback(() => {
    if (!user || !enableNotifications) return;

    const notificationSubscription = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Only listen for new notifications
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile?.user_id}` // Use profile user_id
        },
        (payload) => {
          console.log('New notification received:', payload);
          
          if (onNotificationReceived) {
            onNotificationReceived({
              notification: payload.new,
              isNew: true
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
          filter: `user_id=eq.${profile?.user_id}`
        },
        (payload) => {
          console.log('Notification updated:', payload);
          
          if (onNotificationReceived) {
            onNotificationReceived({
              notification: payload.new,
              old: payload.old,
              isNew: false
            });
          }
        }
      )
      .subscribe();

    subscriptionsRef.current.push(notificationSubscription);
  }, [user, profile, enableNotifications, onNotificationReceived]);

  // Setup analytics real-time subscription (for admin)
  const setupAnalyticsSubscription = useCallback(() => {
    if (!user || !enableAnalytics || userRole !== 'admin') return;

    // Listen to clinic rating changes
    const clinicSubscription = supabase
      .channel('admin-analytics')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'clinics'
        },
        (payload) => {
          console.log('Clinic updated:', payload);
          
          if (onClinicRatingUpdate && payload.old?.rating !== payload.new?.rating) {
            onClinicRatingUpdate({
              clinicId: payload.new.id,
              oldRating: payload.old.rating,
              newRating: payload.new.rating,
              clinic: payload.new
            });
          }
        }
      )
      .subscribe();

    subscriptionsRef.current.push(clinicSubscription);
  }, [user, userRole, enableAnalytics, onClinicRatingUpdate]);

  // Setup feedback real-time subscription
  const setupFeedbackSubscription = useCallback(() => {
    if (!user || !enableFeedback) return;

    let feedbackSubscription;

    if (userRole === 'staff') {
      const clinicId = profile?.role_specific_data?.clinic_id;
      if (clinicId) {
        feedbackSubscription = supabase
          .channel('staff-feedback')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'feedback',
              filter: `clinic_id=eq.${clinicId}`
            },
            (payload) => {
              console.log('New feedback received:', payload);
              
              if (onNotificationReceived) {
                onNotificationReceived({
                  type: 'feedback_received',
                  feedback: payload.new,
                  isNew: true
                });
              }
            }
          )
          .subscribe();
      }
    } else if (userRole === 'patient') {
      feedbackSubscription = supabase
        .channel('patient-feedback')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'feedback',
            filter: `patient_id=eq.${profile?.user_id}`
          },
          (payload) => {
            console.log('Feedback response received:', payload);
            
            if (onNotificationReceived && payload.old?.response !== payload.new?.response) {
              onNotificationReceived({
                type: 'feedback_response',
                feedback: payload.new,
                isNew: true
              });
            }
          }
        )
        .subscribe();
    }

    if (feedbackSubscription) {
      subscriptionsRef.current.push(feedbackSubscription);
    }
  }, [user, userRole, profile, enableFeedback, onNotificationReceived]);

  // Initialize all subscriptions
  useEffect(() => {
    if (!user || !profile) return;

    cleanup(); // Clean up any existing subscriptions

    // Setup subscriptions based on enabled options
    setupAppointmentSubscription();
    setupNotificationSubscription();
    setupAnalyticsSubscription();
    setupFeedbackSubscription();

    // Cleanup on unmount or user change
    return cleanup;
  }, [user, profile, userRole, setupAppointmentSubscription, setupNotificationSubscription, setupAnalyticsSubscription, setupFeedbackSubscription]);

  // Manual subscription control
  const enableRealtimeUpdates = useCallback(() => {
    if (!user || !profile) return;
    
    cleanup();
    setupAppointmentSubscription();
    setupNotificationSubscription();
    setupAnalyticsSubscription();
    setupFeedbackSubscription();
  }, [user, profile, setupAppointmentSubscription, setupNotificationSubscription, setupAnalyticsSubscription, setupFeedbackSubscription]);

  const disableRealtimeUpdates = useCallback(() => {
    cleanup();
  }, [cleanup]);

  return {
    // Controls
    enableRealtimeUpdates,
    disableRealtimeUpdates,
    cleanup,

    // State
    isConnected: subscriptionsRef.current.length > 0,
    activeSubscriptions: subscriptionsRef.current.length,

    // Utilities
    getSubscriptionStatus: () => ({
      appointments: subscriptionsRef.current.some(sub => 
        sub.topic.includes('appointments')
      ),
      notifications: subscriptionsRef.current.some(sub => 
        sub.topic.includes('notifications')
      ),
      analytics: subscriptionsRef.current.some(sub => 
        sub.topic.includes('analytics')
      ),
      feedback: subscriptionsRef.current.some(sub => 
        sub.topic.includes('feedback')
      )
    })
  };
};