import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/context/AuthProvider';

export const useStaffAnalytics = () => {
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { isStaff, isAdmin, profile } = useAuth();

  const fetchStaffPerformance = useCallback(async (options = {}) => {
    // ✅ Role validation
    if (!isStaff() && !isAdmin()) {
      const error = 'Access denied: Staff or Admin required';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      const {
        staffId = null,
        dateFrom = null,
        dateTo = null,
        includeComparisons = false
      } = options;

      // ✅ Date validation
      if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
        throw new Error('Start date must be before end date');
      }

      // ✅ Default to last 30 days if no dates provided
      const defaultDateFrom = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const defaultDateTo = dateTo || new Date().toISOString().split('T')[0];

      const { data, error: rpcError } = await supabase.rpc('get_staff_performance_analytics', {
        p_staff_id: staffId,
        p_date_from: defaultDateFrom,
        p_date_to: defaultDateTo,
        p_include_comparisons: includeComparisons
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      // ✅ Handle function response structure
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch staff performance data');
      }

      setPerformanceData(data);

      return {
        success: true,
        data: data,
        staff_info: data.staff_info,
        performance_metrics: data.appointment_management,
        communication_activity: data.communication_activity,
        patient_satisfaction: data.patient_satisfaction
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch staff performance analytics';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [isStaff, isAdmin]);

  const getPerformanceScore = useCallback((performanceMetrics) => {
    if (!performanceMetrics) return 0;

    const {
      completion_rate = 0,
      avg_response_time_hours = 24,
      daily_avg_interactions = 0
    } = performanceMetrics;

    // ✅ Calculate weighted performance score
    let score = 0;
    
    // Completion rate (40% weight)
    score += (completion_rate / 100) * 40;
    
    // Response time (30% weight) - lower is better
    const responseScore = Math.max(0, (24 - Math.min(avg_response_time_hours, 24)) / 24);
    score += responseScore * 30;
    
    // Activity level (30% weight)
    const activityScore = Math.min(daily_avg_interactions / 10, 1); // Cap at 10 interactions per day
    score += activityScore * 30;

    return Math.round(score);
  }, []);

  return {
    // State
    performanceData,
    loading,
    error,
    
    // Derived data
    staffInfo: performanceData?.staff_info,
    performanceMetrics: performanceData?.appointment_management,
    communicationActivity: performanceData?.communication_activity,
    patientSatisfaction: performanceData?.patient_satisfaction,
    recommendations: performanceData?.recommendations,
    
    // Actions
    fetchStaffPerformance,
    getPerformanceScore
  };
};