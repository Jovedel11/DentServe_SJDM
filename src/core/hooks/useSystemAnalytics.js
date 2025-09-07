import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/context/AuthProvider';

export const useSystemAnalytics = () => {
  const [systemData, setSystemData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { isAdmin } = useAuth();

  const fetchSystemAnalytics = useCallback(async (options = {}) => {
    // ✅ Admin-only access
    if (!isAdmin()) {
      const error = 'Access denied: Admin required';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      const {
        dateFrom = null,
        dateTo = null,
        includeTrends = true,
        includePerformance = true
      } = options;

      const { data, error: rpcError } = await supabase.rpc('get_admin_system_analytics', {
        p_date_from: dateFrom,
        p_date_to: dateTo,
        p_include_trends: includeTrends,
        p_include_performance: includePerformance
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      // ✅ Handle function response structure
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch system analytics');
      }

      setSystemData(data);

      return {
        success: true,
        data: data,
        system_overview: data.system_overview,
        growth_analytics: data.growth_analytics,
        performance_metrics: data.performance_metrics
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch system analytics';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // ✅ Calculate system health score
  const getSystemHealthScore = useCallback(() => {
    if (!systemData?.system_overview) return 0;

    const overview = systemData.system_overview;
    const appointments = overview.appointments;
    
    let score = 0;
    
    // Completion rate (40% weight)
    if (appointments.completion_rate >= 90) score += 40;
    else if (appointments.completion_rate >= 80) score += 30;
    else if (appointments.completion_rate >= 70) score += 20;
    else score += 10;
    
    // Cancellation rate (30% weight) - lower is better
    if (appointments.cancellation_rate <= 5) score += 30;
    else if (appointments.cancellation_rate <= 10) score += 25;
    else if (appointments.cancellation_rate <= 15) score += 15;
    else score += 5;
    
    // User growth (20% weight)
    const userGrowth = overview.users.new_this_period;
    if (userGrowth > 50) score += 20;
    else if (userGrowth > 25) score += 15;
    else if (userGrowth > 10) score += 10;
    else score += 5;
    
    // Clinic performance (10% weight)
    if (overview.clinics.average_rating >= 4.5) score += 10;
    else if (overview.clinics.average_rating >= 4.0) score += 8;
    else if (overview.clinics.average_rating >= 3.5) score += 5;
    else score += 2;

    return Math.min(score, 100);
  }, [systemData]);

  return {
    // State
    systemData,
    loading,
    error,
    
    // Derived data
    systemOverview: systemData?.system_overview,
    growthAnalytics: systemData?.growth_analytics,
    performanceMetrics: systemData?.performance_metrics,
    systemHealthScore: getSystemHealthScore(),
    
    // Actions
    fetchSystemAnalytics
  };
};