import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { useTreatmentPlanFollowUp } from './useTreatmentFollowUp';

export const useTreatmentPlans = () => {
  const { user, profile, isPatient, isStaff, isAdmin } = useAuth();

  const [state, setState] = useState({
    loading: false,
    error: null,
    ongoingTreatments: [],
    summary: null,
    selectedPlan: null,
    treatmentPlans: []
  });

  const followUpBooking = useTreatmentPlanFollowUp();

  const startFollowUpBooking = useCallback(async (treatmentPlanId) => {
    return await followUpBooking.getFollowUpBookingInfo(treatmentPlanId);
  }, [followUpBooking]);

  const getOngoingTreatments = useCallback(async (patientId = null, includePaused = false) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
  
      const { data, error } = await supabase.rpc('get_ongoing_treatments', {
        p_patient_id: patientId || (isPatient ? profile?.user_id : null),
        p_include_paused: includePaused
      });
  
      if (error) throw error;
  
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch ongoing treatments');
      }
  
      // ✅ CRITICAL FIX: Database returns 'ongoing_treatments' not 'treatments'
      const treatments = data.data?.ongoing_treatments || [];
      const summary = data.data?.summary || {
        total_active: 0,
        overdue_count: 0,
        scheduled_count: 0,
        needs_scheduling: 0,
        completion_avg: 0
      };
  
      setState(prev => ({
        ...prev,
        loading: false,
        ongoingTreatments: treatments,
        summary,
        treatmentPlans: treatments
      }));
  
      return { 
        success: true, 
        treatments,
        summary
      };
  
    } catch (err) {
      const errorMsg = err.message || 'Failed to fetch ongoing treatments';
      setState(prev => ({ ...prev, loading: false, error: errorMsg }));
      return { success: false, error: errorMsg };
    }
  }, [isPatient, profile?.user_id]);

  const createTreatmentPlan = useCallback(async (planData) => {
    if (!isStaff && !isAdmin) {
      return { success: false, error: 'Only staff can create treatment plans' };
    }
  
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
  
      const {
        patientId,
        clinicId,
        treatmentName,
        description,
        treatmentCategory,
        totalVisitsPlanned,
        followUpIntervalDays = 30,
        initialAppointmentId,
        sourceAppointmentId,
        diagnosis,
        assignedDoctorId,
        // ✅ NEW: Date parameters
        startDate,
        endDate,
        additionalNotes
      } = planData;
  
      if (!patientId || !clinicId || !treatmentName) {
        throw new Error('Patient ID, Clinic ID, and Treatment Name are required');
      }
  
      // ✅ NEW: Validate start date
      if (!startDate) {
        throw new Error('Start date is required');
      }
  
      const { data, error } = await supabase.rpc('create_treatment_plan', {
        p_patient_id: patientId,
        p_clinic_id: clinicId,
        p_treatment_name: treatmentName,
        p_description: description || null,
        p_treatment_category: treatmentCategory || null,
        p_total_visits_planned: totalVisitsPlanned || null,
        p_follow_up_interval_days: followUpIntervalDays,
        p_initial_appointment_id: initialAppointmentId || null,
        p_source_appointment_id: sourceAppointmentId || null,
        p_diagnosis: diagnosis || null,
        p_assigned_doctor_id: assignedDoctorId || null,
        // ✅ FIXED: Use correct parameter name
        p_start_date: startDate,
        p_expected_end_date: endDate || null,  // ✅ FIXED: Changed to p_expected_end_date
        p_additional_notes: additionalNotes || null
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to create treatment plan');
      }

      setState(prev => ({ ...prev, loading: false }));

      // Refresh treatments after creation
      if (isPatient) {
        await getOngoingTreatments();
      }

      return {
        success: true,
        treatmentPlan: data.data,
        message: data.message
      };

    } catch (err) {
      const errorMsg = err.message || 'Failed to create treatment plan';
      setState(prev => ({ ...prev, loading: false, error: errorMsg }));
      return { success: false, error: errorMsg };
    }
  }, [isStaff, isAdmin, isPatient, getOngoingTreatments]);

  const getTreatmentPlanDetails = useCallback(async (treatmentPlanId) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
  
      // ✅ USE THE EXISTING RPC FUNCTION
      const { data, error } = await supabase.rpc('get_treatment_plan_details', {
        p_treatment_plan_id: treatmentPlanId
      });
  
      if (error) throw error;
  
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch treatment plan details');
      }
  
      const planData = data.data;
  
      setState(prev => ({
        ...prev,
        loading: false,
        selectedPlan: planData
      }));
  
      return { success: true, plan: planData };
  
    } catch (err) {
      const errorMsg = err.message || 'Failed to fetch treatment plan details';
      setState(prev => ({ ...prev, loading: false, error: errorMsg }));
      return { success: false, error: errorMsg };
    }
  }, []);

  // Update Treatment Plan Status
  const updateTreatmentPlanStatus = useCallback(async (treatmentPlanId, status, notes = null) => {
    if (!isStaff && !isAdmin) {
      return { success: false, error: 'Only staff can update treatment plans' };
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const updateData = {
        status,
        updated_at: new Date().toISOString()
      };

      if (notes) {
        updateData.treatment_notes = notes;
      }

      // Auto-complete handling
      if (status === 'completed') {
        updateData.actual_end_date = new Date().toISOString().split('T')[0];
        updateData.progress_percentage = 100;
      } else if (status === 'cancelled') {
        updateData.actual_end_date = new Date().toISOString().split('T')[0];
      }

      const { data, error } = await supabase
        .from('treatment_plans')
        .update(updateData)
        .eq('id', treatmentPlanId)
        .select()
        .single();

      if (error) throw error;

      setState(prev => ({ ...prev, loading: false }));

      // Refresh treatments list
      await getOngoingTreatments();

      return {
        success: true,
        plan: data,
        message: `Treatment plan ${status} successfully`
      };

    } catch (err) {
      const errorMsg = err.message || 'Failed to update treatment plan';
      setState(prev => ({ ...prev, loading: false, error: errorMsg }));
      return { success: false, error: errorMsg };
    }
  }, [isStaff, isAdmin, getOngoingTreatments]);

  //  Link Appointment to Treatment Plan
  const linkAppointmentToPlan = useCallback(async (treatmentPlanId, appointmentId, visitNumber, visitPurpose = null) => {
    if (!isStaff && !isAdmin) {
      return { success: false, error: 'Only staff can link appointments' };
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // insert into treatment_plan_appointments
      const { data: tpaData, error: tpaError } = await supabase
        .from('treatment_plan_appointments')
        .insert({
          treatment_plan_id: treatmentPlanId,
          appointment_id: appointmentId,
          visit_number: visitNumber,
          visit_purpose: visitPurpose
        })
        .select()
        .single();

      if (tpaError) throw tpaError;

      //link appointment_services to treatment plan
      const { error: servicesError } = await supabase
        .from('appointment_services')
        .update({ treatment_plan_id: treatmentPlanId })
        .eq('appointment_id', appointmentId);

      if (servicesError) {
        console.warn('Failed to link appointment_services:', servicesError);
      }

      // treatment_plans.next_visit_appointment_id if needed
      const { data: appointment } = await supabase
        .from('appointments')
        .select('appointment_date, status')
        .eq('id', appointmentId)
        .single();

      if (appointment && appointment.status === 'confirmed') {
        await supabase
          .from('treatment_plans')
          .update({
            next_visit_appointment_id: appointmentId,
            next_visit_date: appointment.appointment_date
          })
          .eq('id', treatmentPlanId);
      }

      setState(prev => ({ ...prev, loading: false }));

      //Refresh treatments
      await getOngoingTreatments();

      return {
        success: true,
        data: tpaData,
        message: 'Appointment linked to treatment plan successfully'
      };

    } catch (err) {
      const errorMsg = err.message || 'Failed to link appointment';
      setState(prev => ({ ...prev, loading: false, error: errorMsg }));
      return { success: false, error: errorMsg };
    }
  }, [isStaff, isAdmin, getOngoingTreatments]);

  const getAppointmentsAwaitingTreatmentPlans = useCallback(async (options = {}) => {
    if (!isStaff && !isAdmin) {
      return { success: false, error: 'Only staff can access this' };
    }
  
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
  
      const {
        limit = 20,
        offset = 0
      } = options;
  
      // ✅ FIXED: Get clinic_id from role_specific_data
      const clinicId = profile?.role_specific_data?.clinic_id || null;
  
      // Use the new RPC function
      const { data, error } = await supabase.rpc('get_appointments_needing_treatment_plans', {
        p_clinic_id: clinicId,
        p_limit: limit,
        p_offset: offset
      });
  
      if (error) throw error;
  
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch appointments');
      }
  
      const appointments = data.data || [];
      const totalCount = data.total_count || 0;
  
      setState(prev => ({ ...prev, loading: false }));
  
      return {
        success: true,
        appointments,
        totalCount,
        hasMore: appointments.length === limit
      };
  
    } catch (err) {
      const errorMsg = err.message || 'Failed to fetch appointments';
      setState(prev => ({ ...prev, loading: false, error: errorMsg }));
      return { success: false, error: errorMsg };
    }
  }, [isStaff, isAdmin, profile?.role_specific_data?.clinic_id]);

    const createTreatmentPlanFromAppointment = useCallback(async (appointmentData) => {
    if (!isStaff && !isAdmin) {
      return { success: false, error: 'Only staff can create treatment plans' };
    }

    const {
      appointmentId,
      patientId,
      clinicId,
      doctorId,
      // From medical history
      recommendedTreatmentName,
      diagnosisSummary,
      recommendedVisits,
      // Optional overrides
      treatmentCategory,
      followUpIntervalDays,
      assignedDoctorId
    } = appointmentData;

    // Validate required fields
    if (!appointmentId || !patientId || !clinicId || !recommendedTreatmentName) {
      return {
        success: false,
        error: 'Missing required fields: appointmentId, patientId, clinicId, and treatment name are required'
      };
    }

    return await createTreatmentPlan({
      patientId,
      clinicId,
      treatmentName: recommendedTreatmentName,
      description: diagnosisSummary || null,
      treatmentCategory: treatmentCategory || null,
      totalVisitsPlanned: recommendedVisits || null,
      followUpIntervalDays: followUpIntervalDays || 30,
      initialAppointmentId: null, // Can be set separately
      sourceAppointmentId: appointmentId, // Link to the appointment that created this plan
      diagnosis: diagnosisSummary || null,
      assignedDoctorId: assignedDoctorId || doctorId // Default to appointment's doctor
    });
  }, [isStaff, isAdmin, createTreatmentPlan]);

  //Computed Values (Based on Database Response)
  const computed = useMemo(() => {
    const { ongoingTreatments, summary } = state;

    // Alert-based filtering
    const urgentTreatments = ongoingTreatments.filter(t => t.alert_level === 'urgent');
    const soonTreatments = ongoingTreatments.filter(t => t.alert_level === 'soon');
    const upcomingTreatments = ongoingTreatments.filter(t => t.alert_level === 'upcoming');

    // Status-based filtering
    const activeTreatments = ongoingTreatments.filter(t => t.status === 'active');
    const pausedTreatments = ongoingTreatments.filter(t => t.status === 'paused');

    return {
      // Counts
      totalTreatments: ongoingTreatments.length,
      activeTreatments: activeTreatments.length,
      pausedTreatments: pausedTreatments.length,
      
      // Alert-based
      urgentTreatments,
      soonTreatments,
      upcomingTreatments,
      hasUrgentTreatments: urgentTreatments.length > 0,
      
      // Database summary
      totalActive: summary?.total_active || 0,
      overdueCount: summary?.overdue_count || 0,
      scheduledCount: summary?.scheduled_count || 0,
      needsSchedulingCount: summary?.needs_scheduling || 0,
      completionAverage: summary?.completion_avg || 0,
      
      // Helpers
      hasActiveTreatments: activeTreatments.length > 0,
      isEmpty: ongoingTreatments.length === 0
    };
  }, [state.ongoingTreatments, state.summary]);

  //Auto-fetch on mount for patients
  useEffect(() => {
    if (user && isPatient) {
      getOngoingTreatments();
    }
  }, [user, isPatient]);

  return {
    // State
    ...state,
    ...computed,

    // Actions
    getOngoingTreatments,
    createTreatmentPlan,
    getTreatmentPlanDetails,
    updateTreatmentPlanStatus,
    linkAppointmentToPlan,
    getAppointmentsAwaitingTreatmentPlans,
    createTreatmentPlanFromAppointment,
    
    // Utilities
    refreshTreatments: () => getOngoingTreatments(),
    clearError: () => setState(prev => ({ ...prev, error: null })),
    
    // Helper methods
    getTreatmentById: (id) => state.ongoingTreatments.find(t => t.id === id),
    getTreatmentsByAlert: (alertLevel) => state.ongoingTreatments.filter(t => t.alert_level === alertLevel),

    followUpBooking,
    startFollowUpBooking,
    
    // Helper: Check if treatment needs follow-up booking
    needsFollowUpBooking: (treatmentId) => {
      const treatment = state.ongoingTreatments.find(t => t.id === treatmentId);
      return treatment && !treatment.next_visit_due && treatment.status === 'active';
    }
  };
};