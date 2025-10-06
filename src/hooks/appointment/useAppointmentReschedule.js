import { useState, useCallback } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

/**
 * ✅ ENHANCED Appointment Rescheduling Hook
 * 
 * FEATURES:
 * - Patient can reschedule own appointments (with policy check)
 * - Staff can reschedule any appointment at their clinic
 * - Availability checking
 * - Suggest alternative dates
 */
export const useAppointmentReschedule = () => {
  const { user, profile, isPatient, isStaff, isAdmin } = useAuth();

  const [state, setState] = useState({
    loading: false,
    checkingAvailability: false,
    error: null,
    availableSlots: [],
    rescheduleData: null
  });

  // ✅ Check if Appointment Can Be Rescheduled
  const canRescheduleAppointment = useCallback(async (appointmentId) => {
    try {
      // Get appointment details
      const { data: appointment, error: fetchError } = await supabase
        .from('appointments')
        .select('*, clinic:clinics(cancellation_policy_hours)')
        .eq('id', appointmentId)
        .single();

      if (fetchError) throw fetchError;

      // ✅ Staff can always reschedule
      if (isStaff || isAdmin) {
        return {
          canReschedule: true,
          reason: 'Staff override',
          appointment
        };
      }

      // ✅ Patient validation
      const { data: canCancel, error: cancelError } = await supabase.rpc('can_cancel_appointment', {
        p_appointment_id: appointmentId
      });

      if (cancelError) throw cancelError;

      const validStatuses = ['pending', 'confirmed'];
      const isValidStatus = validStatuses.includes(appointment.status);

      const policyHours = appointment.clinic?.cancellation_policy_hours || 24;
      const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
      const now = new Date();
      const hoursUntil = (appointmentDateTime - now) / (1000 * 60 * 60);
      const isWithinPolicy = hoursUntil > policyHours;

      return {
        canReschedule: canCancel && isValidStatus && isWithinPolicy,
        reason: !canCancel 
          ? 'Too close to appointment time'
          : !isValidStatus
          ? `Cannot reschedule ${appointment.status} appointments`
          : !isWithinPolicy
          ? `Must reschedule at least ${policyHours} hours before appointment`
          : 'Can reschedule',
        appointment,
        hoursUntil: Math.round(hoursUntil * 10) / 10,
        policyHours
      };

    } catch (err) {
      console.error('Error checking reschedule eligibility:', err);
      return {
        canReschedule: false,
        reason: 'Error checking reschedule policy',
        error: err.message
      };
    }
  }, [isStaff, isAdmin]);

  const getNextSevenDays = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    return dates;
  };

  // ✅ Get Available Slots for Rescheduling
  const getAvailableSlotsForReschedule = useCallback(async (
    appointmentId,
    newDate = null,
    alternativeDates = []
  ) => {
    try {
      setState(prev => ({ ...prev, checkingAvailability: true, error: null }));
  
      const { data: appointment, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          *,
          services:appointment_services(service_id)
        `)
        .eq('id', appointmentId)
        .single();
  
      if (fetchError) throw fetchError;

      const serviceIds = appointment.services?.map(s => s.service_id).filter(Boolean) || [];

      const datesToCheck = newDate 
        ? [newDate] 
        : alternativeDates.length > 0 
          ? alternativeDates 
          : getNextSevenDays();
  
      const availabilityPromises = datesToCheck.map(async (date) => {
        try {
          const { data, error } = await supabase.rpc('get_available_time_slots', {
            p_doctor_id: appointment.doctor_id,
            p_appointment_date: date,
            p_service_ids: serviceIds.length > 0 ? serviceIds : null
          });
  
          if (error) throw error;
  
          return {
            date,
            slots: data?.slots || [],
            available: (data?.slots || []).filter(s => s.available).length > 0
          };
        } catch (err) {
          console.error(`Error checking slots for ${date}:`, err);
          return { date, slots: [], available: false, error: err.message };
        }
      });
  
      const availabilityResults = await Promise.all(availabilityPromises);
  
      setState(prev => ({
        ...prev,
        checkingAvailability: false,
        availableSlots: availabilityResults,
        rescheduleData: {
          appointmentId,
          currentDate: appointment.appointment_date,
          currentTime: appointment.appointment_time,
          doctorId: appointment.doctor_id,
          clinicId: appointment.clinic_id,
          serviceIds,
          isConsultationOnly: serviceIds.length === 0
        }
      }));
  
      return {
        success: true,
        availability: availabilityResults,
        appointment
      };
  
    } catch (err) {
      const errorMsg = err.message || 'Failed to check availability';
      setState(prev => ({ ...prev, checkingAvailability: false, error: errorMsg }));
      return { success: false, error: errorMsg };
    }
  }, []);

  // ✅ Reschedule Appointment
  const rescheduleAppointment = useCallback(async (
    appointmentId,
    newDate,
    newTime,
    rescheduleReason = ''
  ) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Step 1: Verify can reschedule
      const eligibility = await canRescheduleAppointment(appointmentId);
      if (!eligibility.canReschedule) {
        throw new Error(eligibility.reason);
      }

      const appointment = eligibility.appointment;

      // Step 2: Check new slot availability
      const { data: isAvailable, error: availError } = await supabase.rpc('check_appointment_availability', {
        p_doctor_id: appointment.doctor_id,
        p_appointment_date: newDate,
        p_appointment_time: newTime,
        p_duration_minutes: appointment.duration_minutes,
        p_exclude_appointment_id: appointmentId
      });

      if (availError) throw availError;
      if (!isAvailable) {
        throw new Error('Selected time slot is no longer available');
      }

      // ✅ Step 3: Update with staff/patient context
      const updateNote = `Rescheduled from ${appointment.appointment_date} ${appointment.appointment_time}. Reason: ${rescheduleReason || (isStaff ? 'Staff adjustment' : 'Patient request')}. By: ${isStaff ? 'Staff' : 'Patient'}`;

      const { data: updatedAppointment, error: updateError } = await supabase
        .from('appointments')
        .update({
          appointment_date: newDate,
          appointment_time: newTime,
          notes: appointment.notes 
            ? `${appointment.notes}\n---\n${updateNote}` 
            : updateNote,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Step 4: Notification (optional - if function exists)
      try {
        await supabase.rpc('create_appointment_notification', {
          p_user_id: appointment.patient_id,
          p_notification_type: 'appointment_confirmed',
          p_appointment_id: appointmentId,
          p_custom_message: `Appointment rescheduled to ${newDate} at ${newTime}`
        });
      } catch (notifError) {
        console.warn('Notification failed:', notifError);
      }

      setState(prev => ({ ...prev, loading: false }));

      return {
        success: true,
        appointment: updatedAppointment,
        message: 'Appointment rescheduled successfully',
        oldDateTime: {
          date: appointment.appointment_date,
          time: appointment.appointment_time
        },
        newDateTime: {
          date: newDate,
          time: newTime
        }
      };

    } catch (err) {
      const errorMsg = err.message || 'Failed to reschedule appointment';
      setState(prev => ({ ...prev, loading: false, error: errorMsg }));
      return { success: false, error: errorMsg };
    }
  }, [canRescheduleAppointment, isStaff]);

  // ✅ STAFF: Suggest Reschedule Options
  const suggestRescheduleOptions = useCallback(async (appointmentId, numberOfDays = 7) => {
    if (!isStaff && !isAdmin) {
      return { success: false, error: 'Only staff can suggest reschedule options' };
    }

    try {
      const { data: appointment, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (error) throw error;

      const originalDate = new Date(appointment.appointment_date);
      const alternativeDates = [];
      
      for (let i = 1; i <= numberOfDays; i++) {
        const altDate = new Date(originalDate);
        altDate.setDate(altDate.getDate() + i);
        
        // Skip weekends (optional)
        if (altDate.getDay() !== 0 && altDate.getDay() !== 6) {
          alternativeDates.push(altDate.toISOString().split('T')[0]);
        }
      }

      return await getAvailableSlotsForReschedule(appointmentId, null, alternativeDates);

    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [isStaff, isAdmin, getAvailableSlotsForReschedule]);

  return {
    // State
    ...state,

    // Actions
    canRescheduleAppointment,
    getAvailableSlotsForReschedule,
    rescheduleAppointment,
    suggestRescheduleOptions,

    // Utilities
    clearError: () => setState(prev => ({ ...prev, error: null })),
    clearSlots: () => setState(prev => ({ ...prev, availableSlots: [], rescheduleData: null }))
  };
};