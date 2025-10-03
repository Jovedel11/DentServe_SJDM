import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

/**
 * Treatment Plans Management Hook
 * Handles multi-visit treatment plans for ongoing care
 * Aligned with database functions: create_treatment_plan, get_ongoing_treatments
 */
export const useTreatmentPlans = () => {
  const { user, profile, isPatient, isStaff } = useAuth();

  const [state, setState] = useState({
    loading: false,
    error: null,
    treatmentPlans: [],
    ongoingTreatments: [],
    selectedPlan: null
  });

  // =====================================================
  // PATIENT: Get Ongoing Treatments
  // =====================================================
  const getOngoingTreatments = useCallback(async (patientId = null) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.rpc('get_ongoing_treatments', {
        p_patient_id: patientId || (isPatient ? profile?.user_id : null)
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch ongoing treatments');
      }

      const treatments = data.data?.treatments || [];

      setState(prev => ({
        ...prev,
        loading: false,
        ongoingTreatments: treatments,
        treatmentPlans: treatments
      }));

      return { success: true, treatments };

    } catch (err) {
      const errorMsg = err.message || 'Failed to fetch ongoing treatments';
      setState(prev => ({ ...prev, loading: false, error: errorMsg }));
      return { success: false, error: errorMsg };
    }
  }, [isPatient, profile?.user_id]);

  // =====================================================
  // STAFF: Create Treatment Plan
  // =====================================================
  const createTreatmentPlan = useCallback(async (planData) => {
    if (!isStaff) {
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

      // Validation
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

      // Optimistic update
      setState(prev => ({
        ...prev,
        loading: false,
        treatmentPlans: [...prev.treatmentPlans, data.data]
      }));

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
  }, [isStaff]);

  // =====================================================
  // Get Treatment Plan Details
  // =====================================================
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
          appointments:treatment_plan_appointments (
            id,
            visit_number,
            visit_purpose,
            is_completed,
            completion_notes,
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

  // =====================================================
  // Update Treatment Plan Status
  // =====================================================
  const updateTreatmentPlanStatus = useCallback(async (treatmentPlanId, status, notes = null) => {
    if (!isStaff) {
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

      // Optimistic update
      setState(prev => ({
        ...prev,
        loading: false,
        treatmentPlans: prev.treatmentPlans.map(plan =>
          plan.id === treatmentPlanId ? { ...plan, ...data } : plan
        ),
        ongoingTreatments: prev.ongoingTreatments.filter(plan => 
          plan.id !== treatmentPlanId || status === 'active'
        )
      }));

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
  }, [isStaff]);

  // =====================================================
  // Link Appointment to Treatment Plan
  // =====================================================
  const linkAppointmentToPlan = useCallback(async (treatmentPlanId, appointmentId, visitNumber, visitPurpose = null) => {
    if (!isStaff) {
      return { success: false, error: 'Only staff can link appointments' };
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase
        .from('treatment_plan_appointments')
        .insert({
          treatment_plan_id: treatmentPlanId,
          appointment_id: appointmentId,
          visit_number: visitNumber,
          visit_purpose: visitPurpose
        })
        .select()
        .single();

      if (error) throw error;

      // Also update appointment_services to link to treatment plan
      await supabase
        .from('appointment_services')
        .update({ treatment_plan_id: treatmentPlanId })
        .eq('appointment_id', appointmentId);

      setState(prev => ({ ...prev, loading: false }));

      return {
        success: true,
        data,
        message: 'Appointment linked to treatment plan successfully'
      };

    } catch (err) {
      const errorMsg = err.message || 'Failed to link appointment';
      setState(prev => ({ ...prev, loading: false, error: errorMsg }));
      return { success: false, error: errorMsg };
    }
  }, [isStaff]);

  // =====================================================
  // Computed Values
  // =====================================================
  const computed = useMemo(() => {
    const activePlans = state.treatmentPlans.filter(p => p.status === 'active');
    const completedPlans = state.treatmentPlans.filter(p => p.status === 'completed');

    return {
      activePlans,
      completedPlans,
      hasActiveTreatments: activePlans.length > 0,
      totalActivePlans: activePlans.length,
      totalCompletedPlans: completedPlans.length,
      
      // Treatment completion stats
      overallProgress: activePlans.length > 0
        ? Math.round(
            activePlans.reduce((sum, p) => sum + (p.progress_percentage || 0), 0) / activePlans.length
          )
        : 0
    };
  }, [state.treatmentPlans]);

  // =====================================================
  // Auto-fetch on mount for patients
  // =====================================================
  useEffect(() => {
    if (user && isPatient) {
      getOngoingTreatments();
    }
  }, [user, isPatient, getOngoingTreatments]);

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
    refreshTreatments: getOngoingTreatments,
    clearError: () => setState(prev => ({ ...prev, error: null }))
  };
};