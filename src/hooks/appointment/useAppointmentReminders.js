import { useState, useCallback } from 'react';
import { 
  sendAppointmentReminder, 
  sendBulkAppointmentReminders,
  sendDailyStaffDigest,
  sendTreatmentFollowUpReminder
} from '@/services/emailService';
import { useAuth } from '@/auth/context/AuthProvider';

export const useAppointmentReminders = () => {
  const { isStaff, isAdmin, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastSent, setLastSent] = useState(null);

  /**
   * Send single appointment reminder
   */
  const sendSingleReminder = useCallback(async (appointment) => {
    if (!isStaff && !isAdmin) {
      return { success: false, error: 'Access denied' };
    }

    try {
      setLoading(true);
      setError(null);

      const result = await sendAppointmentReminder({
        patient: {
          email: appointment.patient?.email,
          first_name: appointment.patient?.first_name || appointment.patient?.name?.split(' ')[0]
        },
        appointment: {
          date: appointment.appointment_date,
          time: appointment.appointment_time,
          duration_minutes: appointment.duration_minutes
        },
        clinic: {
          name: appointment.clinic?.name,
          address: appointment.clinic?.address,
          phone: appointment.clinic?.phone,
          email: appointment.clinic?.email,
          cancellation_policy_hours: appointment.clinic?.cancellation_policy_hours
        },
        doctor: {
          name: appointment.doctor?.name
        },
        services: appointment.services || []
      });

      if (result.success) {
        setLastSent({ appointmentId: appointment.id, timestamp: new Date() });
      }

      return result;
    } catch (err) {
      const errorMsg = err.message || 'Failed to send reminder';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [isStaff, isAdmin]);

  /**
   * Send bulk reminders for tomorrow's appointments
   */
  const sendTomorrowReminders = useCallback(async (appointments) => {
    if (!isStaff && !isAdmin) {
      return { success: false, error: 'Access denied' };
    }

    try {
      setLoading(true);
      setError(null);

      const formattedAppointments = appointments.map(apt => ({
        patient: {
          email: apt.patient?.email,
          first_name: apt.patient?.first_name || apt.patient?.name?.split(' ')[0]
        },
        appointment: {
          date: apt.appointment_date,
          time: apt.appointment_time,
          duration_minutes: apt.duration_minutes
        },
        clinic: {
          name: apt.clinic?.name,
          address: apt.clinic?.address,
          phone: apt.clinic?.phone,
          email: apt.clinic?.email,
          cancellation_policy_hours: apt.clinic?.cancellation_policy_hours
        },
        doctor: {
          name: apt.doctor?.name
        },
        services: apt.services || []
      }));

      const result = await sendBulkAppointmentReminders(formattedAppointments);

      if (result.success) {
        setLastSent({ 
          type: 'bulk',
          count: result.successful,
          timestamp: new Date() 
        });
      }

      return result;
    } catch (err) {
      const errorMsg = err.message || 'Failed to send bulk reminders';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [isStaff, isAdmin]);

  /**
   * Send daily digest to staff
   */
  const sendStaffDigest = useCallback(async (todayAppointments, stats, pendingActions = []) => {
    if (!isStaff && !isAdmin) {
      return { success: false, error: 'Access denied' };
    }

    try {
      setLoading(true);
      setError(null);

      const result = await sendDailyStaffDigest({
        staff: {
          email: profile?.email || profile?.user_profiles?.email,
          first_name: profile?.first_name || profile?.user_profiles?.first_name
        },
        clinic: {
          name: profile?.role_specific_data?.clinic_name || 'Clinic'
        },
        todayAppointments: todayAppointments.map(apt => ({
          appointment_time: apt.appointment_time,
          status: apt.status,
          patient_name: apt.patient?.name || `${apt.patient?.first_name} ${apt.patient?.last_name}`.trim(),
          doctor_name: apt.doctor?.name,
          services: apt.services || [],
          patient_reliability: apt.patient_reliability
        })),
        stats,
        pendingActions
      });

      if (result.success) {
        setLastSent({ 
          type: 'digest',
          timestamp: new Date() 
        });
      }

      return result;
    } catch (err) {
      const errorMsg = err.message || 'Failed to send staff digest';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [isStaff, isAdmin, profile]);

  /**
   * Send treatment follow-up reminder
   */
  const sendTreatmentReminder = useCallback(async (treatment, patient, clinic, doctor) => {
    if (!isStaff && !isAdmin) {
      return { success: false, error: 'Access denied' };
    }

    try {
      setLoading(true);
      setError(null);

      const result = await sendTreatmentFollowUpReminder({
        patient: {
          email: patient.email,
          first_name: patient.first_name
        },
        treatmentPlan: {
          treatment_name: treatment.treatment_name,
          progress_percentage: treatment.progress_percentage,
          visits_completed: treatment.visits_completed,
          total_visits_planned: treatment.total_visits_planned
        },
        clinic: {
          name: clinic.name,
          phone: clinic.phone,
          email: clinic.email
        },
        doctor: {
          name: doctor.name
        },
        recommendedDate: treatment.next_visit_date || treatment.recommended_next_visit
      });

      if (result.success) {
        setLastSent({ 
          treatmentId: treatment.id,
          timestamp: new Date() 
        });
      }

      return result;
    } catch (err) {
      const errorMsg = err.message || 'Failed to send treatment reminder';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [isStaff, isAdmin]);

  return {
    loading,
    error,
    lastSent,
    sendSingleReminder,
    sendTomorrowReminders,
    sendStaffDigest,
    sendTreatmentReminder,
    clearError: () => setError(null)
  };
};