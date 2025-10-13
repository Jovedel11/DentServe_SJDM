import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { useTreatmentPlanFollowUp } from './useTreatmentFollowUp';
import { notifyPatientTreatmentPlanCreated, notifyPatientTreatmentCompleted } from '@/services/emailService';

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

      const treatmentPlan = data.data;
      if (treatmentPlan && planData.patientEmail) {
        const emailResult = await notifyPatientTreatmentPlanCreated({
          patient: {
            email: planData.patientEmail,
            first_name: planData.patientFirstName
          },
          treatmentPlan: {
            treatment_name: treatmentPlan.treatment_name,
            treatment_category: treatmentPlan.treatment_category,
            description: treatmentPlan.description,
            diagnosis: treatmentPlan.diagnosis,
            total_visits_planned: treatmentPlan.total_visits_planned,
            expected_end_date: treatmentPlan.expected_end_date
          },
          clinic: {
            name: planData.clinicName,
            phone: planData.clinicPhone,
            email: planData.clinicEmail
          },
          doctor: {
            name: planData.doctorName
          }
        });
    
        if (!emailResult.success) {
          console.warn('⚠️ Failed to send treatment plan email:', emailResult.error);
        }
      }
    
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
  
      // ✅ STEP 1: Build update data FIRST
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
  
      // ✅ STEP 2: Execute query with joins for email data
      const { data, error } = await supabase
        .from('treatment_plans')
        .update(updateData)
        .eq('id', treatmentPlanId)
        .select(`
          *,
          patient:patients!inner (
            user_profiles!inner (
              email,
              first_name
            )
          ),
          clinic:clinics!inner (name),
          doctor:doctors (
            first_name,
            last_name
          )
        `)
        .single();
  
      if (error) throw error;
  
      setState(prev => ({ ...prev, loading: false }));
  
      // ✅ STEP 3: Send completion email ONCE (not twice!)
      if (status === 'completed' && data) {
        const emailResult = await notifyPatientTreatmentCompleted({
          patient: {
            email: data.patient?.user_profiles?.email,
            first_name: data.patient?.user_profiles?.first_name
          },
          treatmentPlan: {
            treatment_name: data.treatment_name,
            start_date: data.start_date,
            completed_at: data.completed_at || data.actual_end_date,
            visits_completed: data.visits_completed,
            treatment_notes: notes || data.treatment_notes
          },
          clinic: {
            name: data.clinic?.name
          },
          doctor: {
            name: data.doctor ? `Dr. ${data.doctor.first_name} ${data.doctor.last_name}` : 'Doctor'
          }
        });
      
        if (!emailResult.success) {
          console.warn('⚠️ Failed to send treatment completion email:', emailResult.error);
        }
      }
  
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
  
      // ✅ NEW: Check if appointment is already linked to THIS treatment plan
      const { data: existingLink, error: checkError } = await supabase
        .from('treatment_plan_appointments')
        .select('id, visit_number, treatment_plan_id')
        .eq('appointment_id', appointmentId)
        .eq('treatment_plan_id', treatmentPlanId)
        .maybeSingle();
  
      if (checkError && checkError.code !== 'PGRST116') {  // PGRST116 = no rows
        throw checkError;
      }
  
      if (existingLink) {
        setState(prev => ({ ...prev, loading: false }));
        return {
          success: false,
          error: 'This appointment is already linked to this treatment plan',
          existing: existingLink,
          reason: 'duplicate_link'
        };
      }
  
      // ✅ NEW: Check if appointment is linked to ANY other treatment plan
      const { data: otherPlanLink, error: otherCheckError } = await supabase
        .from('treatment_plan_appointments')
        .select('id, visit_number, treatment_plan:treatment_plans!inner(id, treatment_name, status)')
        .eq('appointment_id', appointmentId)
        .neq('treatment_plan_id', treatmentPlanId)
        .maybeSingle();
  
      if (otherCheckError && otherCheckError.code !== 'PGRST116') {
        throw otherCheckError;
      }
  
      if (otherPlanLink && otherPlanLink.treatment_plan?.status === 'active') {
        setState(prev => ({ ...prev, loading: false }));
        return {
          success: false,
          error: `This appointment is already linked to treatment plan "${otherPlanLink.treatment_plan.treatment_name}"`,
          existing: otherPlanLink,
          reason: 'linked_to_different_plan'
        };
      }
  
      // Insert into treatment_plan_appointments
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
  
      // Link appointment_services to treatment plan
      const { error: servicesError } = await supabase
        .from('appointment_services')
        .update({ treatment_plan_id: treatmentPlanId })
        .eq('appointment_id', appointmentId);
  
      if (servicesError) {
        console.warn('Failed to link appointment_services:', servicesError);
      }
  
      // Update treatment_plans.next_visit_appointment_id if needed
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
  
      // Refresh treatments
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
      recommendedTreatmentName,
      diagnosisSummary,
      recommendedVisits,
      treatmentCategory,
      followUpIntervalDays,
      assignedDoctorId,
      patientEmail,
      patientFirstName,
      clinicName,
      clinicPhone,
      clinicEmail,
      doctorName
    } = appointmentData;
  
    // Validate required fields
    if (!appointmentId || !patientId || !clinicId || !recommendedTreatmentName) {
      return {
        success: false,
        error: 'Missing required fields: appointmentId, patientId, clinicId, and treatment name are required'
      };
    }
  
    // ✅ NEW: Check if appointment already has a treatment plan
    try {
      const { data: existingPlans, error: checkError } = await supabase
        .from('treatment_plans')
        .select('id, treatment_name, status, created_at')
        .eq('source_appointment_id', appointmentId)
        .in('status', ['active', 'paused']);
  
      if (checkError) {
        console.error('Error checking existing treatment plans:', checkError);
        // Continue anyway - the database function will handle it
      }
  
      if (existingPlans && existingPlans.length > 0) {
        const existing = existingPlans[0];
        return {
          success: false,
          error: `Treatment plan "${existing.treatment_name}" already exists for this appointment`,
          existing: existing,
          reason: 'duplicate_treatment_plan',
          suggestion: 'Use the existing treatment plan or cancel it before creating a new one'
        };
      }
    } catch (err) {
      console.warn('Pre-check failed, proceeding with creation:', err);
    }
  
    return await createTreatmentPlan({
      patientId,
      clinicId,
      treatmentName: recommendedTreatmentName,
      description: diagnosisSummary || null,
      treatmentCategory: treatmentCategory || null,
      totalVisitsPlanned: recommendedVisits || null,
      followUpIntervalDays: followUpIntervalDays || 30,
      initialAppointmentId: null,
      sourceAppointmentId: appointmentId,
      diagnosis: diagnosisSummary || null,
      assignedDoctorId: assignedDoctorId || doctorId,
      startDate: new Date().toISOString().split('T')[0],
      patientEmail,
      patientFirstName,
      clinicName,
      clinicPhone,
      clinicEmail,
      doctorName
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