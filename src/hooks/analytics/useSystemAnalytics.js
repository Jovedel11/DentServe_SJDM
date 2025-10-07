import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/context/AuthProvider';

export const useSystemAnalytics = () => {
  // State
  const [systemData, setSystemData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Auth context
  const { isAdmin, user } = useAuth();

  const fetchSystemAnalytics = useCallback(async (options = {}) => {
    // Validation
    if (!user) {
      const errorMsg = 'Authentication required';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    if (!isAdmin) {
      const errorMsg = 'Access denied: Admin required';
      setError(errorMsg);
      return { success: false, error: errorMsg };
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

      if (data?.authenticated === false) {
        throw new Error('Authentication required');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to fetch system analytics');
      }

      setSystemData(data);

      return {
        success: true,
        data: data,
        system_overview: data.system_overview,
        growth_analytics: data.growth_analytics,
        performance_metrics: data.performance_metrics,
        period: data.period,
        metadata: data.metadata
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch system analytics';
      setError(errorMessage);
      console.error('[useSystemAnalytics] Error:', err);
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user]);

  const refresh = useCallback((options = {}) => {
    return fetchSystemAnalytics(options);
  }, [fetchSystemAnalytics]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setSystemData(null);
    setError(null);
    setLoading(false);
  }, []);

  // Derived state - System health score
  const systemHealthScore = useMemo(() => {
    if (!systemData?.system_overview) return 0;

    const overview = systemData.system_overview;
    const appointments = overview.appointments || {};
    
    let score = 0;
    
    // Completion rate (40% weight)
    const completionRate = appointments.completion_rate || 0;
    if (completionRate >= 90) score += 40;
    else if (completionRate >= 80) score += 30;
    else if (completionRate >= 70) score += 20;
    else score += 10;
    
    // Cancellation rate (30% weight) - lower is better
    const cancellationRate = appointments.cancellation_rate || 0;
    if (cancellationRate <= 5) score += 30;
    else if (cancellationRate <= 10) score += 25;
    else if (cancellationRate <= 15) score += 15;
    else score += 5;
    
    // User growth (20% weight)
    const userGrowth = overview.users?.new_this_period || 0;
    if (userGrowth > 50) score += 20;
    else if (userGrowth > 25) score += 15;
    else if (userGrowth > 10) score += 10;
    else score += 5;
    
    // Clinic performance (10% weight)
    const avgRating = overview.clinics?.average_rating || 0;
    if (avgRating >= 4.5) score += 10;
    else if (avgRating >= 4.0) score += 8;
    else if (avgRating >= 3.5) score += 5;
    else score += 2;

    return Math.min(score, 100);
  }, [systemData]);

  // Derived state - Period info
  const periodInfo = useMemo(() => {
    if (!systemData?.period) return null;
    
    return {
      ...systemData.period,
      formatted_range: `${systemData.period.from_date} to ${systemData.period.to_date}`,
      duration_text: `${systemData.period.days_covered} days`
    };
  }, [systemData]);

  // Derived state - Growth summary
  const growthSummary = useMemo(() => {
    if (!systemData?.growth_analytics) return null;
    
    const growth = systemData.growth_analytics;
    return {
      weekly_growth_rate: growth.growth_rate_weekly || 0,
      has_trends: !!growth.user_growth_trend,
      total_trend_points: growth.user_growth_trend?.length || 0
    };
  }, [systemData]);

  // Check if data is available
  const hasData = useMemo(() => !!systemData?.system_overview, [systemData]);

  return {
    // Raw data
    systemData,
    
    // State
    loading,
    error,
    hasData,
    
    // Derived data
    systemOverview: systemData?.system_overview,
    growthAnalytics: systemData?.growth_analytics,
    performanceMetrics: systemData?.performance_metrics,
    systemHealthScore,
    periodInfo,
    growthSummary,
    
    // Actions
    fetchSystemAnalytics,
    refresh,
    clearError,
    reset
  };
};