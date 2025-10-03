import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

/**
 * Patient Health Analytics Hook
 * Provides health metrics, appointment statistics, and care insights
 * Aligned with: get_patient_health_analytics, get_patient_analytics
 */
export const usePatientHealthAnalytics = () => {
  const { user, profile, isPatient } = useAuth();

  const [state, setState] = useState({
    loading: false,
    error: null,
    healthAnalytics: null,
    patientAnalytics: null,
    reliabilityScore: null
  });

  // =====================================================
  // Get Comprehensive Health Analytics
  // =====================================================
  const getHealthAnalytics = useCallback(async (patientId = null) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const targetPatientId = patientId || (isPatient ? profile?.user_id : null);
      
      if (!targetPatientId) {
        throw new Error('Patient ID is required');
      }

      // Fetch both analytics in parallel
      const [healthResponse, analyticsResponse, reliabilityResponse] = await Promise.allSettled([
        supabase.rpc('get_patient_health_analytics', {
          p_patient_id: targetPatientId
        }),
        supabase.rpc('get_patient_analytics', {
          p_user_id: targetPatientId
        }),
        supabase.rpc('check_patient_reliability', {
          p_patient_id: targetPatientId,
          p_clinic_id: null // Check across all clinics
        })
      ]);

      // Process health analytics
      const healthData = healthResponse.status === 'fulfilled' && healthResponse.value.data
        ? healthResponse.value.data
        : null;

      // Process patient analytics
      const analyticsData = analyticsResponse.status === 'fulfilled' && analyticsResponse.value.data
        ? analyticsResponse.value.data.data
        : null;

      // Process reliability
      const reliabilityData = reliabilityResponse.status === 'fulfilled' && reliabilityResponse.value.data
        ? reliabilityResponse.value.data
        : null;

      setState(prev => ({
        ...prev,
        loading: false,
        healthAnalytics: healthData,
        patientAnalytics: analyticsData,
        reliabilityScore: reliabilityData
      }));

      return {
        success: true,
        healthAnalytics: healthData,
        patientAnalytics: analyticsData,
        reliabilityScore: reliabilityData
      };

    } catch (err) {
      const errorMsg = err.message || 'Failed to fetch health analytics';
      setState(prev => ({ ...prev, loading: false, error: errorMsg }));
      return { success: false, error: errorMsg };
    }
  }, [isPatient, profile?.user_id]);

  // =====================================================
  // Get Appointment History Summary
  // =====================================================
  const getAppointmentHistorySummary = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('status, appointment_date, created_at')
        .eq('patient_id', profile?.user_id)
        .order('appointment_date', { ascending: false });

      if (error) throw error;

      // Calculate summary statistics
      const summary = {
        total: data.length,
        completed: data.filter(a => a.status === 'completed').length,
        cancelled: data.filter(a => a.status === 'cancelled').length,
        noShow: data.filter(a => a.status === 'no_show').length,
        upcoming: data.filter(a => 
          a.status === 'confirmed' && new Date(a.appointment_date) > new Date()
        ).length,
        recentAppointments: data.slice(0, 5)
      };

      return { success: true, summary };

    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [profile?.user_id]);

  // =====================================================
  // Computed Analytics Insights
  // =====================================================
  const insights = useMemo(() => {
    if (!state.healthAnalytics && !state.patientAnalytics) {
      return null;
    }

    const health = state.healthAnalytics || {};
    const analytics = state.patientAnalytics || {};
    const reliability = state.reliabilityScore || {};

    return {
      // Health Score (0-100)
      healthScore: health.health_score || 0,
      healthStatus: health.health_score >= 80 ? 'Excellent' :
                    health.health_score >= 60 ? 'Good' :
                    health.health_score >= 40 ? 'Fair' : 'Needs Attention',

      // Appointment Metrics
      totalAppointments: analytics.total_appointments || 0,
      completionRate: analytics.completion_rate || 0,
      averageRating: analytics.average_feedback_rating || 0,

      // Reliability Metrics
      reliabilityStatus: reliability.reliable ? 'Reliable' : 'Needs Improvement',
      riskLevel: reliability.reason || 'unknown',
      attendanceRecord: {
        completed: reliability.data?.total_appointments || 0,
        noShows: reliability.data?.no_show_count || 0,
        cancellations: reliability.data?.patient_cancelled_count || 0,
        completionRate: reliability.data?.completion_rate || 0
      },

      // Treatment Progress
      ongoingTreatments: health.active_treatments_count || 0,
      treatmentAdherence: health.treatment_adherence_rate || 0,

      // Care Recommendations
      recommendations: [
        health.health_score < 60 && 'Schedule a comprehensive check-up',
        reliability.data?.recent_no_shows >= 2 && 'Improve appointment attendance',
        health.active_treatments_count > 0 && 'Continue with ongoing treatment plans',
        analytics.total_appointments === 0 && 'Schedule your first appointment for a dental check-up'
      ].filter(Boolean)
    };
  }, [state.healthAnalytics, state.patientAnalytics, state.reliabilityScore]);

  // =====================================================
  // Auto-fetch on mount for patients
  // =====================================================
  useEffect(() => {
    if (user && isPatient && profile?.user_id) {
      getHealthAnalytics();
    }
  }, [user, isPatient, profile?.user_id, getHealthAnalytics]);

  return {
    // State
    ...state,
    insights,

    // Actions
    getHealthAnalytics,
    getAppointmentHistorySummary,
    refreshAnalytics: getHealthAnalytics,

    // Utilities
    clearError: () => setState(prev => ({ ...prev, error: null })),
    hasData: Boolean(state.healthAnalytics || state.patientAnalytics)
  };
};