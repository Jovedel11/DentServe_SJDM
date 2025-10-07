import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

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
        initialAppointmentId
      } = planData;

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

      //Refresh treatments after creation
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
  // Get Detailed Treatment Plan (Direct Query)
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

  const getAppointmentsAwaitingTreatmentPlans = useCallback(async () => {
    if (!isStaff && !isAdmin) {
      return { success: false, error: 'Only staff can access this' };
    }

    if (!profile?.clinic_id) {
      return { success: false, error: 'Clinic not loaded' };
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Get completed appointments with their services
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          symptoms,
          notes,
          created_at,
          patient_id,
          patient:users!appointments_patient_id_fkey (
            id,
            email,
            user_profiles (
              first_name,
              last_name,
              phone
            )
          ),
          doctor:doctors (
            id,
            first_name,
            last_name,
            specialization
          ),
          services:appointment_services (
            id,
            treatment_plan_id,
            service:services (
              id,
              name,
              category,
              duration_minutes
            )
          )
        `)
        .eq('clinic_id', profile.clinic_id)
        .eq('status', 'completed')
        .order('appointment_date', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Filter to only appointments where NO services have a treatment_plan_id
      const awaitingPlans = data.filter(apt => {
        // If no services, include the appointment
        if (!apt.services || apt.services.length === 0) return true;
        
        // Check if ALL services have no treatment_plan_id
        return apt.services.every(s => !s.treatment_plan_id);
      });

      // Format the data
      const formatted = awaitingPlans.map(apt => {
        const profiles = apt.patient?.user_profiles;
        return {
          ...apt,
          patient_name: profiles
            ? `${profiles.first_name} ${profiles.last_name}`
            : 'Unknown Patient',
          patient_email: apt.patient?.email || '',
          patient_phone: profiles?.phone || '',
          doctor_name: apt.doctor
            ? `Dr. ${apt.doctor.first_name} ${apt.doctor.last_name}`
            : 'Unassigned',
          services: apt.services
            ?.map(s => s.service)
            .filter(Boolean) || [],
        };
      });

      setState(prev => ({ ...prev, loading: false }));

      return {
        success: true,
        appointments: formatted,
        count: formatted.length
      };

    } catch (err) {
      const errorMsg = err.message || 'Failed to fetch appointments';
      setState(prev => ({ ...prev, loading: false, error: errorMsg }));
      return { success: false, error: errorMsg };
    }
  }, [isStaff, isAdmin, profile?.clinic_id]);

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
    // Utilities
    refreshTreatments: () => getOngoingTreatments(),
    clearError: () => setState(prev => ({ ...prev, error: null })),
    
    // Helper methods
    getTreatmentById: (id) => state.ongoingTreatments.find(t => t.id === id),
    getTreatmentsByAlert: (alertLevel) => state.ongoingTreatments.filter(t => t.alert_level === alertLevel)
  };
};