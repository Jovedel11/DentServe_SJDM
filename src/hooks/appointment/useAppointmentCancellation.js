import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../auth/context/AuthProvider';
import { usePatientAppointments } from './usePatientAppointment';
import {
  notifyStaffAppointmentCancelled,
  notifyPatientAppointmentCancelled,
  notifyPatientTreatmentVisitCancelled,  
} from '@/services/emailService';

export const useAppointmentCancellation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { userRole, user } = useAuth();  // ✅ ADD 'user' here

  // ✅ Use the hook correctly - get the utility function
  const { getAppointmentDetails } = usePatientAppointments();

  const checkCancellationEligibility = useCallback(async (appointmentId) => {
    try {
      if (!appointmentId) {
        return { canCancel: false, reason: 'Invalid appointment ID' };
      }

      const { data, error: rpcError } = await supabase.rpc('can_cancel_appointment', {
        p_appointment_id: appointmentId
      });

      if (rpcError) {
        console.error('Cancellation check error:', rpcError);
        return { canCancel: false, reason: 'Unable to check cancellation policy' };
      }

      return { 
        canCancel: data, 
        reason: data ? 'Can be cancelled' : 'Outside cancellation window'
      };

    } catch (err) {
      console.error('Error checking cancellation eligibility:', err);
      return { canCancel: false, reason: 'Error checking policy' };
    }
  }, []);

  const cancelAppointment = useCallback(async (appointmentId, cancellationReason, cancelledBy = null) => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 [CANCEL HOOK] Starting cancellation...', {
        appointmentId,
        reason: cancellationReason,
        userRole
      });

      if (!appointmentId) {
        throw new Error('Appointment ID is required');
      }

      if (!cancellationReason || cancellationReason.trim() === '') {
        throw new Error('Cancellation reason is required');
      }

      // ✅ FIX: First try to get appointment from the hook's cache
      console.log('📋 [CANCEL HOOK] Fetching appointment details...');
      
      let appointmentDetails = getAppointmentDetails(appointmentId);

      // ✅ If not in cache, fetch directly from database with all needed relations
      if (!appointmentDetails) {
        console.log('⚠️ [CANCEL HOOK] Appointment not in cache, fetching from DB...');
        
        const { data: dbAppointment, error: fetchError } = await supabase
          .from('appointments')
          .select(`
            id,
            appointment_date,
            appointment_time,
            patient_id,
            status,
            clinics:clinic_id (
              id,
              name,
              email,
              phone
            ),
            doctors:doctor_id (
              id,
              first_name,
              last_name
            ),
            treatment_plan_appointments (
              visit_number,
              treatment_plans:treatment_plan_id (
                id,
                treatment_name,
                treatment_category,
                status,
                progress_percentage,
                visits_completed,
                total_visits_planned
              )
            )
          `)
          .eq('id', appointmentId)
          .single();

        if (fetchError) {
          console.error('❌ [CANCEL HOOK] Failed to fetch appointment:', fetchError);
          throw new Error('Failed to fetch appointment details: ' + fetchError.message);
        }

        if (!dbAppointment) {
          throw new Error('Appointment not found');
        }

        appointmentDetails = dbAppointment;
      }

      console.log('✅ [CANCEL HOOK] Appointment details fetched:', {
        id: appointmentDetails.id,
        date: appointmentDetails.appointment_date,
        time: appointmentDetails.appointment_time,
        clinicName: appointmentDetails.clinics?.name || appointmentDetails.clinic?.name,
        clinicEmail: appointmentDetails.clinics?.email || appointmentDetails.clinic?.email
      });

// ✅ FIX: Properly handle patient data fetching for both patient and staff cancellations
console.log('👤 [CANCEL HOOK] Fetching patient data...');

let patientData;
let patientError;

if (userRole === 'patient') {
  // Patient is canceling their own appointment
  // Query by auth_user_id since user.id is the Supabase Auth UUID
  const authUserId = user?.id;
  
  if (!authUserId) {
    throw new Error('Authentication user ID not found. Please log in again.');
  }

  console.log('🔍 [CANCEL HOOK] Patient canceling - querying by auth_user_id:', authUserId);

  const result = await supabase
    .from('users')
    .select(`
      id,
      email,
      phone,
      user_profiles (
        first_name,
        last_name
      )
    `)
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  
  patientData = result.data;
  patientError = result.error;
  
} else {
  // Staff is canceling patient's appointment
  // appointmentDetails.patient_id is already the public.users.id
  const patientUserId = appointmentDetails.patient_id;
  
  if (!patientUserId) {
    throw new Error('Patient ID not found in appointment details.');
  }

  console.log('🔍 [CANCEL HOOK] Staff canceling - querying by users.id:', patientUserId);

  const result = await supabase
    .from('users')
    .select(`
      id,
      email,
      phone,
      user_profiles (
        first_name,
        last_name
      )
    `)
    .eq('id', patientUserId)  // ✅ Use public.users.id for staff queries
    .maybeSingle();
  
  patientData = result.data;
  patientError = result.error;
}

if (patientError) {
  console.error('❌ [CANCEL HOOK] Patient fetch error:', patientError);
  throw new Error('Failed to fetch patient data: ' + patientError.message);
}

if (!patientData) {
  console.error('❌ [CANCEL HOOK] No patient data returned. Query details:', {
    userRole,
    authUserId: user?.id,
    appointmentPatientId: appointmentDetails.patient_id
  });
  throw new Error('Patient data not found. User may not exist in database.');
}

// ✅ Handle potential array or null user_profiles
const profileData = Array.isArray(patientData.user_profiles) 
  ? patientData.user_profiles[0] 
  : patientData.user_profiles;

if (!profileData) {
  throw new Error('Patient profile not found. User may not have completed profile setup.');
}

// Extract patient info
const patientProfile = {
  email: patientData.email,
  phone: patientData.phone,
  first_name: profileData.first_name,
  last_name: profileData.last_name
};

console.log('✅ [CANCEL HOOK] Patient data fetched:', {
  userId: patientData.id,
  email: patientProfile.email,
  name: `${patientProfile.first_name} ${patientProfile.last_name}`,
  fetchedBy: userRole
});

      // Check eligibility first for patients
      if (userRole === 'patient') {
        console.log('👤 [CANCEL HOOK] Checking patient eligibility...');
        const eligibility = await checkCancellationEligibility(appointmentId);
        if (!eligibility.canCancel) {
          throw new Error(`Cannot cancel appointment: ${eligibility.reason}`);
        }
        console.log('✅ [CANCEL HOOK] Patient eligible to cancel');
      }

      // Call RPC to cancel
      console.log('📞 [CANCEL HOOK] Calling cancel_appointment RPC...');
      
      const { data, error: rpcError } = await supabase.rpc('cancel_appointment', {
        p_appointment_id: appointmentId,
        p_cancellation_reason: cancellationReason,
        p_cancelled_by: cancelledBy
      });

      if (rpcError) {
        console.error('❌ [CANCEL HOOK] RPC error:', rpcError);
        throw new Error(rpcError.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to cancel appointment');
      }

      console.log('✅ [CANCEL HOOK] RPC cancellation successful:', data);

      // ✅ Check if this appointment is part of a treatment plan
      const treatmentPlanLink = appointmentDetails.treatment_plan_appointments?.[0] || 
                               appointmentDetails.treatment_plan;
      const isPartOfTreatmentPlan = !!treatmentPlanLink;

      console.log('🔍 [CANCEL HOOK] Treatment plan check:', {
        isPartOfTreatmentPlan,
        treatmentPlanLink
      });

      // ✅ SEND EMAIL NOTIFICATIONS
      console.log('📧 [CANCEL HOOK] Starting email notifications...');

      try {
        let clinicEmail = appointmentDetails.clinics?.email || appointmentDetails.clinic?.email;
        const clinicData = appointmentDetails.clinics || appointmentDetails.clinic;
      
        // ✅ FIX: Fetch clinic email if missing from appointment data
        if (!clinicEmail) {
          const clinicId = clinicData?.id;
          
          if (clinicId) {
            console.log('🔍 [CANCEL HOOK] Clinic email missing in appointment data, fetching from database...');
            const { data: fetchedClinic, error: clinicError } = await supabase
              .from('clinics')
              .select('email')
              .eq('id', clinicId)
              .maybeSingle();
            
            if (!clinicError && fetchedClinic?.email) {
              clinicEmail = fetchedClinic.email;
              console.log('✅ [CANCEL HOOK] Clinic email fetched:', clinicEmail);
            } else {
              console.error('❌ [CANCEL HOOK] Failed to fetch clinic email:', clinicError);
            }
          }
        }
      
        if (!clinicEmail) {
          console.warn('⚠️ [CANCEL HOOK] No staff email available for clinic:', {
            clinicName: clinicData?.name,
            clinicId: clinicData?.id
          });
          console.warn('⚠️ [CANCEL HOOK] Email notification to staff will be skipped, but cancellation will proceed.');
        }
      
        const patientFullName = `${patientProfile.first_name || ''} ${patientProfile.last_name || ''}`.trim();
        const doctorData = appointmentDetails.doctors || appointmentDetails.doctor;
        const doctorFullName = doctorData
          ? `Dr. ${doctorData.first_name} ${doctorData.last_name}`.trim()
          : 'Unknown Doctor';
      
        if (userRole === 'patient') {
          console.log('📧 [CANCEL HOOK] Patient cancelled - notifying staff...');
          
          if (clinicEmail) {
            const emailPayload = {
              staff_email: clinicEmail,
              patient: {
                name: patientFullName,
                email: patientProfile.email,
                phone: patientProfile.phone
              },
              appointment: {
                date: appointmentDetails.appointment_date,
                time: appointmentDetails.appointment_time
              },
              clinic: {
                name: clinicData?.name || 'Unknown Clinic'
              },
              doctor: {
                name: doctorFullName
              },
              cancellation: {
                reason: cancellationReason,
                cancelled_at: new Date().toISOString()
              }
            };
      
            console.log('📧 [CANCEL HOOK] Staff email payload:', JSON.stringify(emailPayload, null, 2));
      
            const emailResult = await notifyStaffAppointmentCancelled(emailPayload);
      
            if (!emailResult?.success) {
              console.error('❌ [CANCEL HOOK] Failed to send staff email:', emailResult?.error);
            } else {
              console.log('✅ [CANCEL HOOK] Staff email sent successfully');
            }
          } else {
            console.warn('⚠️ [CANCEL HOOK] Skipping staff email - no email address available');
          }

          // Treatment plan email to patient
          if (isPartOfTreatmentPlan) {
            console.log('📧 [CANCEL HOOK] Sending treatment impact email to patient...');
            
            const treatmentData = treatmentPlanLink.treatment_plans || treatmentPlanLink;
            
            const treatmentEmailPayload = {
              patient: {
                email: patientProfile.email,
                first_name: patientProfile.first_name
              },
              treatmentPlan: {
                treatment_name: treatmentData.treatment_name,
                treatment_category: treatmentData.treatment_category,
                progress_percentage: treatmentData.progress_percentage || 0,
                visits_completed: treatmentData.visits_completed || 0,
                total_visits_planned: treatmentData.total_visits_planned || 0
              },
              appointment: {
                date: appointmentDetails.appointment_date,
                time: appointmentDetails.appointment_time
              },
              clinic: {
                name: clinicData?.name || 'Unknown Clinic',
                phone: clinicData?.phone || 'Not provided',
                email: clinicEmail || 'Not provided'
              },
              doctor: {
                name: doctorFullName
              },
              cancellation: {
                reason: cancellationReason,
                cancelled_at: new Date().toISOString(),
                visit_number: treatmentPlanLink.visit_number
              },
              impactNotes: 'This cancellation will delay your treatment progress. Please reschedule as soon as possible.'
            };

            console.log('📧 [CANCEL HOOK] Treatment email payload:', JSON.stringify(treatmentEmailPayload, null, 2));

            const treatmentEmailResult = await notifyPatientTreatmentVisitCancelled(treatmentEmailPayload);

            if (!treatmentEmailResult?.success) {
              console.error('❌ [CANCEL HOOK] Failed to send treatment email:', treatmentEmailResult?.error);
            } else {
              console.log('✅ [CANCEL HOOK] Treatment email sent successfully');
            }
          }

        } else if (userRole === 'staff') {
          console.log('📧 [CANCEL HOOK] Staff cancelled - notifying patient...');
          
          const patientEmailPayload = {
            patient: {
              email: patientProfile.email,
              first_name: patientProfile.first_name
            },
            appointment: {
              date: appointmentDetails.appointment_date,
              time: appointmentDetails.appointment_time
            },
            clinic: {
              name: clinicData?.name || 'Unknown Clinic',
              phone: clinicData?.phone || 'Not provided',
              email: clinicEmail || 'Not provided'
            },
            doctor: {
              name: doctorFullName
            },
            cancellation: {
              reason: cancellationReason
            }
          };

          console.log('📧 [CANCEL HOOK] Patient email payload:', JSON.stringify(patientEmailPayload, null, 2));

          const emailResult = await notifyPatientAppointmentCancelled(patientEmailPayload);

          if (!emailResult?.success) {
            console.error('❌ [CANCEL HOOK] Failed to send patient email:', emailResult?.error);
          } else {
            console.log('✅ [CANCEL HOOK] Patient email sent successfully');
          }

          // Treatment plan impact email
          if (isPartOfTreatmentPlan) {
            console.log('📧 [CANCEL HOOK] Sending treatment impact email...');
            
            const treatmentData = treatmentPlanLink.treatment_plans || treatmentPlanLink;
            
            const treatmentEmailPayload = {
              patient: {
                email: patientProfile.email,
                first_name: patientProfile.first_name
              },
              treatmentPlan: {
                treatment_name: treatmentData.treatment_name,
                treatment_category: treatmentData.treatment_category,
                progress_percentage: treatmentData.progress_percentage || 0,
                visits_completed: treatmentData.visits_completed || 0,
                total_visits_planned: treatmentData.total_visits_planned || 0
              },
              appointment: {
                date: appointmentDetails.appointment_date,
                time: appointmentDetails.appointment_time
              },
              clinic: {
                name: clinicData?.name || 'Unknown Clinic',
                phone: clinicData?.phone || 'Not provided',
                email: clinicEmail || 'Not provided'
              },
              doctor: {
                name: doctorFullName
              },
              cancellation: {
                reason: cancellationReason,
                cancelled_at: new Date().toISOString(),
                visit_number: treatmentPlanLink.visit_number
              },
              impactNotes: 'Please contact us to reschedule this treatment visit as soon as possible.'
            };

            console.log('📧 [CANCEL HOOK] Treatment email payload:', JSON.stringify(treatmentEmailPayload, null, 2));

            const treatmentEmailResult = await notifyPatientTreatmentVisitCancelled(treatmentEmailPayload);

            if (!treatmentEmailResult?.success) {
              console.error('❌ [CANCEL HOOK] Failed to send treatment email:', treatmentEmailResult?.error);
            } else {
              console.log('✅ [CANCEL HOOK] Treatment email sent successfully');
            }
          }
        }

        console.log('✅ [CANCEL HOOK] Email notifications completed');

      } catch (emailError) {
        // Don't fail entire operation if email fails
        console.error('❌ [CANCEL HOOK] Email notification error:', emailError);
        console.warn('⚠️ [CANCEL HOOK] Appointment cancelled but email notification failed');
      }

      console.log('✅ [CANCEL HOOK] Cancellation process completed successfully');

      return {
        success: true,
        data: data.data,
        message: data.data?.treatment_plan_cleaned 
          ? 'Appointment cancelled and treatment plan updated successfully'
          : data.message || 'Appointment cancelled successfully',
        treatmentPlanCleaned: data.data?.treatment_plan_cleaned || false,
        wasPartOfTreatmentPlan: isPartOfTreatmentPlan
      };

    } catch (err) {
      console.error('❌ [CANCEL HOOK] Error:', err);
      const errorMessage = err.message || 'Failed to cancel appointment';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [userRole, user, checkCancellationEligibility, getAppointmentDetails]);

  return {
    // State
    loading,
    error,
    
    // Actions
    checkCancellationEligibility,
    cancelAppointment
  };
};