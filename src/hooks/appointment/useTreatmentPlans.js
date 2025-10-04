import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

/**
 * ✅ ENHANCED Treatment Plans Management Hook
 * Fully aligned with database schema and functions
 * 
 * Database Functions Used:
 * - get_ongoing_treatments(p_patient_id, p_include_paused)
 * - create_treatment_plan(...)
 * - update_treatment_plan_progress(p_appointment_id) [Auto-triggered]
 * 
 * Key Features:
 * - Automatic progress tracking via database triggers
 * - Rich treatment data with progress, timeline, and appointments
 * - Alert system for overdue treatments
 * - Summary statistics
 */
export const useTreatmentPlans = () => {
  const { user, profile, isPatient, isStaff, isAdmin } = useAuth();

  const [state, setState] = useState({
    loading: false,
    error: null,
    ongoingTreatments: [],
    summary: null,
    selectedPlan: null,
    // Legacy compatibility
    treatmentPlans: []
  });

  // ====================================================================
  // ✅ PATIENT & STAFF: Get Ongoing Treatments (Database-Aligned)
  // ====================================================================
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
        // Legacy compatibility
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

  // ====================================================================
  // ✅ STAFF ONLY: Create Treatment Plan
  // ====================================================================
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
        initialAppointmentId
      } = planData;

      // ✅ Validation
      if (!patientId || !clinicId || !treatmentName) {
        throw new Error('Patient ID, Clinic ID, and Treatment Name are required');
      }

      const { data, error } = await supabase.rpc('create_treatment_plan', {
        p_patient_id: patientId,
        p_clinic_id: clinicId,
        p_treatment_name: treatmentName,
        p_description: description || null,
        p_treatment_category: treatmentCategory || null,
        p_total_visits_planned: totalVisitsPlanned || null,
        p_follow_up_interval_days: followUpIntervalDays,
        p_initial_appointment_id: initialAppointmentId || null
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to create treatment plan');
      }

      setState(prev => ({ ...prev, loading: false }));

      // ✅ Refresh treatments after creation
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

  // ====================================================================
  // ✅ Get Detailed Treatment Plan (Direct Query)
  // ====================================================================
  const getTreatmentPlanDetails = useCallback(async (treatmentPlanId) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase
        .from('treatment_plans')
        .select(`
          *,
          patient:users!treatment_plans_patient_id_fkey (
            id,
            email,
            user_profiles (first_name, last_name, phone)
          ),
          clinic:clinics (
            id,
            name,
            address,
            phone
          ),
          created_by:users!treatment_plans_created_by_staff_id_fkey (
            id,
            user_profiles (first_name, last_name)
          ),
          visits:treatment_plan_appointments (
            id,
            visit_number,
            visit_purpose,
            is_completed,
            completion_notes,
            recommended_next_visit_days,
            appointment:appointments (
              id,
              appointment_date,
              appointment_time,
              status,
              notes
            )
          )
        `)
        .eq('id', treatmentPlanId)
        .single();

      if (error) throw error;

      setState(prev => ({
        ...prev,
        loading: false,
        selectedPlan: data
      }));

      return { success: true, plan: data };

    } catch (err) {
      const errorMsg = err.message || 'Failed to fetch treatment plan details';
      setState(prev => ({ ...prev, loading: false, error: errorMsg }));
      return { success: false, error: errorMsg };
    }
  }, []);

  // ====================================================================
  // ✅ STAFF: Update Treatment Plan Status
  // ====================================================================
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

      // ✅ Auto-complete handling
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

      // ✅ Refresh treatments list
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

  // ====================================================================
  // ✅ STAFF: Link Appointment to Treatment Plan
  // ====================================================================
  const linkAppointmentToPlan = useCallback(async (treatmentPlanId, appointmentId, visitNumber, visitPurpose = null) => {
    if (!isStaff && !isAdmin) {
      return { success: false, error: 'Only staff can link appointments' };
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // ✅ First, insert into treatment_plan_appointments
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

      // ✅ Then, link appointment_services to treatment plan
      const { error: servicesError } = await supabase
        .from('appointment_services')
        .update({ treatment_plan_id: treatmentPlanId })
        .eq('appointment_id', appointmentId);

      if (servicesError) {
        console.warn('Failed to link appointment_services:', servicesError);
      }

      // ✅ Update treatment_plans.next_visit_appointment_id if needed
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

      // ✅ Refresh treatments
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

  // ====================================================================
  // ✅ Computed Values (Based on Database Response)
  // ====================================================================
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

  // ====================================================================
  // ✅ Auto-fetch on mount for patients
  // ====================================================================
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

    // Utilities
    refreshTreatments: () => getOngoingTreatments(),
    clearError: () => setState(prev => ({ ...prev, error: null })),
    
    // Helper methods
    getTreatmentById: (id) => state.ongoingTreatments.find(t => t.id === id),
    getTreatmentsByAlert: (alertLevel) => state.ongoingTreatments.filter(t => t.alert_level === alertLevel)
  };
};