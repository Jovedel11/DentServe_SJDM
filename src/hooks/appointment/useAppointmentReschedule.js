import { useState, useCallback } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { 
  notifyPatientAppointmentRescheduled,
  notifyStaffAppointmentRescheduled 
} from '@/services/emailService';

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

const rescheduleAppointment = useCallback(async (
  appointmentId,
  newDate,
  newTime,
  rescheduleReason = ''
) => {
  try {
    setState(prev => ({ ...prev, loading: true, error: null }));

    // ✅ Step 1: Verify can reschedule
    const eligibility = await canRescheduleAppointment(appointmentId);
    if (!eligibility.canReschedule) {
      throw new Error(eligibility.reason);
    }

    const appointment = eligibility.appointment;

    // ✅ Step 2: Call the DATABASE FUNCTION (not direct update!)
    const { data: result, error: rpcError } = await supabase.rpc('reschedule_appointment', {
      p_appointment_id: appointmentId,
      p_new_date: newDate,
      p_new_time: newTime,
      p_reschedule_reason: rescheduleReason || null
    });

    if (rpcError) {
      console.error('❌ RPC Error:', rpcError);
      throw new Error(rpcError.message);
    }

    if (!result?.success) {
      throw new Error(result?.error || 'Failed to reschedule appointment');
    }

    console.log('✅ Appointment rescheduled via database function:', result);

    // ✅ Step 3: Send email notifications
    try {
      // Fetch complete appointment data for email
      const { data: fullAppointment, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:users!appointments_patient_id_fkey (
            email,
            phone,
            user_profiles!inner (
              first_name,
              last_name
            )
          ),
          clinic:clinics!inner (
            name,
            email,
            phone,
            address
          ),
          doctor:doctors (
            first_name,
            last_name
          )
        `)
        .eq('id', appointmentId)
        .single();

      if (fetchError) {
        console.warn('⚠️ Could not fetch appointment for email:', fetchError);
      } else if (fullAppointment) {
        if (isStaff || isAdmin) {
          // Staff rescheduled → notify patient
          const emailResult = await notifyPatientAppointmentRescheduled({
            patient: {
              email: fullAppointment.patient?.email,
              first_name: fullAppointment.patient?.user_profiles?.first_name
            },
            appointment: {
              date: newDate,
              time: newTime
            },
            clinic: {
              name: fullAppointment.clinic?.name,
              phone: fullAppointment.clinic?.phone,
              email: fullAppointment.clinic?.email,
              address: fullAppointment.clinic?.address
            },
            doctor: {
              name: fullAppointment.doctor 
                ? `Dr. ${fullAppointment.doctor.first_name} ${fullAppointment.doctor.last_name}`
                : 'Doctor'
            },
            oldDate: result.data.old_date,
            oldTime: result.data.old_time,
            newDate,
            newTime,
            reason: rescheduleReason || null
          });

          if (!emailResult.success) {
            console.warn('⚠️ Failed to send reschedule email to patient:', emailResult.error);
          } else {
            console.log('✅ Patient email sent successfully');
          }
        } else if (isPatient) {
          // Patient rescheduled → notify staff
          const emailResult = await notifyStaffAppointmentRescheduled({
            staff_email: fullAppointment.clinic?.email,
            patient: {
              name: `${fullAppointment.patient?.user_profiles?.first_name} ${fullAppointment.patient?.user_profiles?.last_name}`,
              email: fullAppointment.patient?.email
            },
            appointment: {
              date: newDate,
              time: newTime
            },
            clinic: {
              name: fullAppointment.clinic?.name
            },
            doctor: {
              name: fullAppointment.doctor 
                ? `Dr. ${fullAppointment.doctor.first_name} ${fullAppointment.doctor.last_name}`
                : 'Doctor'
            },
            oldDate: result.data.old_date,
            oldTime: result.data.old_time,
            newDate,
            newTime,
            reason: rescheduleReason || null
          });

          if (!emailResult.success) {
            console.warn('⚠️ Failed to send reschedule email to staff:', emailResult.error);
          } else {
            console.log('✅ Staff email sent successfully');
          }
        }
      }
    } catch (emailError) {
      // Email errors shouldn't break the reschedule flow
      console.error('❌ Email notification error (non-fatal):', emailError);
    }

    setState(prev => ({ ...prev, loading: false }));

    return {
      success: true,
      appointment: result.data,
      message: result.message || 'Appointment rescheduled successfully',
      oldDateTime: {
        date: result.data.old_date,
        time: result.data.old_time
      },
      newDateTime: {
        date: newDate,
        time: newTime
      }
    };

  } catch (err) {
    const errorMsg = err.message || 'Failed to reschedule appointment';
    setState(prev => ({ ...prev, loading: false, error: errorMsg }));
    console.error('❌ Reschedule error:', err);
    return { success: false, error: errorMsg };
  }
}, [canRescheduleAppointment, isStaff, isAdmin, isPatient]);

  // Suggest Reschedule Options
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