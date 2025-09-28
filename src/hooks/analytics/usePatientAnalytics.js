import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/context/AuthProvider';

export const usePatientAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { user, profile, isPatient } = useAuth();

  // ✅ Fetch basic patient analytics
  const fetchPatientAnalytics = useCallback(async (userId = null) => {
    if (!user) {
      const error = 'Authentication required';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_patient_analytics', {
        p_user_id: userId // null uses current user
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      // ✅ This function returns direct JSONB, not wrapped in success/error
      if (!data || Object.keys(data).length === 0) {
        setAnalyticsData({});
        return { success: true, data: {} };
      }

      setAnalyticsData(data);

      return {
        success: true,
        data: data,
        totalAppointments: data.total_appointments || 0,
        completedAppointments: data.completed_appointments || 0,
        upcomingAppointments: data.upcoming_appointments || 0,
        favoriteClinic: data.favorite_clinic || null,
        lastAppointment: data.last_appointment || null
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch patient analytics';
      setError(errorMessage);
      console.error('Patient analytics error:', err);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ✅ Fetch patient health analytics
  const fetchHealthAnalytics = useCallback(async (patientId = null) => {
    if (!user) {
      const error = 'Authentication required';
      setError(error);
      return { success: false, error };
    }

    try {
      const { data, error: rpcError } = await supabase.rpc('get_patient_health_analytics', {
        p_patient_id: patientId
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      // ✅ This function returns JSON, not JSONB
      if (!data) {
        setHealthData({});
        return { success: true, data: {} };
      }

      setHealthData(data);

      return {
        success: true,
        data: data,
        healthScore: data.health_score || 0,
        improvementTrend: data.improvement_trend || 1.0,
        consistencyRating: data.consistency_rating || 0,
        lastVisit: data.last_visit || null,
        nextRecommendedVisit: data.next_recommended_visit || null
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch health analytics';
      setError(errorMessage);
      console.error('Health analytics error:', err);
      return {
        success: false,
        error: errorMessage
      };
    }
  }, [user]);

  // ✅ Combined fetch
  const fetchAllAnalytics = useCallback(async (userId = null, patientId = null) => {
    setLoading(true);
    try {
      const [analyticsResult, healthResult] = await Promise.all([
        fetchPatientAnalytics(userId),
        fetchHealthAnalytics(patientId)
      ]);

      return {
        success: analyticsResult.success && healthResult.success,
        analytics: analyticsResult,
        health: healthResult
      };
    } finally {
      setLoading(false);
    }
  }, [fetchPatientAnalytics, fetchHealthAnalytics]);

  // ✅ Computed values
  const getHealthStatus = useCallback(() => {
    if (!healthData) return 'unknown';
    
    const score = healthData.health_score || 0;
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'needs_attention';
  }, [healthData]);

  const getAppointmentStats = useCallback(() => {
    if (!analyticsData) return null;
    
    const total = analyticsData.total_appointments || 0;
    const completed = analyticsData.completed_appointments || 0;
    const upcoming = analyticsData.upcoming_appointments || 0;
    
    return {
      total,
      completed,
      upcoming,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      hasHistory: total > 0,
      hasUpcoming: upcoming > 0
    };
  }, [analyticsData]);

  return {
    // State
    analyticsData,
    healthData,
    loading,
    error,
    
    // Derived data
    appointmentStats: getAppointmentStats(),
    healthStatus: getHealthStatus(),
    favoriteClinic: analyticsData?.favorite_clinic,
    lastAppointment: analyticsData?.last_appointment,
    
    // Actions
    fetchPatientAnalytics,
    fetchHealthAnalytics,
    fetchAllAnalytics,
    refresh: () => fetchAllAnalytics(),
    clearError: () => setError(null)
  };
};